import "server-only";

import {
	and,
	count,
	eq,
	exists,
	gt,
	inArray,
	isNull,
	lte,
	or,
	sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
	projectInvitations,
	projectMembers,
	projects,
	teams,
	users,
} from "@/lib/db/schema";

interface UpdateProjectMemberAssignmentInput {
	accessRole?: "manager" | "member";
	assignedRoleId: string | null;
}

interface CreateProjectInvitationMutationInput {
	projectId: string;
	email: string;
	invitedById: string;
	expiresAt: Date;
}

// Checks that an owner or manager can still change membership in an active project.
function hasProjectManagementAccess(
	projectId: string,
	applicationUserId: string,
) {
	const manager = alias(projectMembers, "project_manager");
	return exists(
		db
			.select({ userId: manager.userId })
			.from(manager)
			.innerJoin(projects, eq(projects.id, manager.projectId))
			.where(
				and(
					eq(manager.projectId, projectId),
					eq(manager.userId, applicationUserId),
					inArray(manager.accessRole, ["owner", "manager"]),
					isNull(projects.deletedAt),
					isNull(projects.archivedAt),
				),
			),
	);
}

// Locks one manageable project so membership requests are handled one at a time.
function lockManagedProject(projectId: string, applicationUserId: string) {
	return db
		.select({ id: projects.id })
		.from(projects)
		.where(
			and(
				eq(projects.id, projectId),
				hasProjectManagementAccess(projectId, applicationUserId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.for("update");
}

// Checks whether the requester may remove the selected member's access level.
function canRemoveProjectMember(projectId: string, removedById: string) {
	const manager = alias(projectMembers, "removing_manager");
	return exists(
		db
			.select({ userId: manager.userId })
			.from(manager)
			.innerJoin(projects, eq(projects.id, manager.projectId))
			.where(
				and(
					eq(manager.projectId, projectId),
					eq(manager.userId, removedById),
					isNull(projects.deletedAt),
					isNull(projects.archivedAt),
					or(
						and(
							eq(manager.accessRole, "owner"),
							inArray(projectMembers.accessRole, ["manager", "member"]),
						),
						and(
							eq(manager.accessRole, "manager"),
							eq(projectMembers.accessRole, "member"),
						),
					),
				),
			),
	);
}

// Updates the assigned Team role for an existing Project member.
export async function updateProjectMemberAssignment(
	projectId: string,
	userId: string,
	input: UpdateProjectMemberAssignmentInput,
) {
	const [member] = await db
		.update(projectMembers)
		.set({
			assignedRoleId: input.assignedRoleId,
			...(input.accessRole ? { accessRole: input.accessRole } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId),
				inArray(projectMembers.accessRole, ["manager", "member"]),
			),
		)
		.returning({ userId: projectMembers.userId });

	return member ?? null;
}

// Adds one member and creates the Project's generated Team when membership reaches two.
async function addProjectMember(
	projectId: string,
	userId: string,
	addedById: string,
) {
	const now = new Date();
	const [managedProjects, addedMembers, memberCounts] = await db.batch([
		lockManagedProject(projectId, addedById),
		db
			.insert(projectMembers)
			.select(
				db
					.select({
						projectId: projects.id,
						userId: sql<string>`${userId}`.as("user_id"),
						addedById: sql<string>`${addedById}`.as("added_by_id"),
					})
					.from(projects)
					.where(
						and(
							eq(projects.id, projectId),
							hasProjectManagementAccess(projectId, addedById),
							isNull(projects.deletedAt),
							isNull(projects.archivedAt),
						),
					),
			)
			.onConflictDoNothing()
			.returning({ userId: projectMembers.userId }),
		db
			.select({ value: count() })
			.from(projectMembers)
			.where(eq(projectMembers.projectId, projectId)),
		db
			.insert(teams)
			.select(
				db
					.select({ projectId: projects.id })
					.from(projects)
					.where(
						and(
							eq(projects.id, projectId),
							hasProjectManagementAccess(projectId, addedById),
							sql`(
								select count(*) from ${projectMembers}
								where ${projectMembers.projectId} = ${projectId}
							) >= 2`,
						),
					),
			)
			.onConflictDoUpdate({
				target: teams.projectId,
				set: {
					status: "active",
					archivedAt: null,
					deletedAt: null,
					updatedAt: now,
				},
			}),
	] as const);

	const memberCount = memberCounts[0]?.value ?? 0;
	if (managedProjects.length === 0) return null;

	return { projectId, memberCount, wasAdded: addedMembers.length > 0 };
}

// Removes a member and archives the generated Team when the Project becomes SOLO.
export async function removeProjectMember(
	projectId: string,
	userId: string,
	removedById: string,
) {
	const now = new Date();
	const [managedProjects, removedMembers, memberCounts] = await db.batch([
		lockManagedProject(projectId, removedById),
		db
			.delete(projectMembers)
			.where(
				and(
					eq(projectMembers.projectId, projectId),
					eq(projectMembers.userId, userId),
					canRemoveProjectMember(projectId, removedById),
				),
			)
			.returning({ userId: projectMembers.userId }),
		db
			.select({ value: count() })
			.from(projectMembers)
			.where(eq(projectMembers.projectId, projectId)),
		db
			.update(teams)
			.set({ status: "archived", archivedAt: now, updatedAt: now })
			.where(
				and(
					eq(teams.projectId, projectId),
					isNull(teams.deletedAt),
					hasProjectManagementAccess(projectId, removedById),
					sql`(
						select count(*) from ${projectMembers}
						where ${projectMembers.projectId} = ${projectId}
					) = 1`,
				),
			),
	] as const);

	const removed = removedMembers[0];
	const memberCount = memberCounts[0]?.value ?? 0;
	if (managedProjects.length === 0 || !removed) return null;

	return { userId: removed.userId, memberCount };
}

// Stores a pending Project invitation before Clerk sends its application email.
export async function createProjectInvitation(
	input: CreateProjectInvitationMutationInput,
) {
	await db
		.update(projectInvitations)
		.set({ status: "expired" })
		.where(
			and(
				eq(projectInvitations.projectId, input.projectId),
				eq(projectInvitations.email, input.email),
				eq(projectInvitations.status, "pending"),
				lte(projectInvitations.expiresAt, new Date()),
			),
		);

	const [invitation] = await db
		.insert(projectInvitations)
		.values(input)
		.onConflictDoNothing()
		.returning({ id: projectInvitations.id });
	return invitation ?? null;
}

// Marks one elapsed pending invitation as expired before a state transition is attempted.
async function expirePendingProjectInvitation(invitationId: string) {
	return db
		.update(projectInvitations)
		.set({ status: "expired" })
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
				lte(projectInvitations.expiresAt, new Date()),
			),
		)
		.returning({ id: projectInvitations.id });
}

// Revokes a pending invitation when the requesting user owns or manages its Project.
export async function cancelProjectInvitation(
	invitationId: string,
	applicationUserId: string,
) {
	await expirePendingProjectInvitation(invitationId);

	const [authorizedInvitation] = await db
		.select({
			clerkInvitationId: projectInvitations.clerkInvitationId,
			projectId: projectInvitations.projectId,
			projectName: projects.name,
		})
		.from(projectInvitations)
		.innerJoin(projects, eq(projects.id, projectInvitations.projectId))
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projectInvitations.projectId),
				eq(projectMembers.userId, applicationUserId),
				inArray(projectMembers.accessRole, ["owner", "manager"]),
			),
		)
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
				gt(projectInvitations.expiresAt, new Date()),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);
	if (!authorizedInvitation) return null;

	const [canceledInvitation] = await db
		.update(projectInvitations)
		.set({ status: "revoked" })
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
				gt(projectInvitations.expiresAt, new Date()),
			),
		)
		.returning({ id: projectInvitations.id });

	return canceledInvitation ? authorizedInvitation : null;
}

// Revokes a local invitation when Clerk could not send its matching email.
export async function revokeProjectInvitation(invitationId: string) {
	await db
		.update(projectInvitations)
		.set({ status: "revoked" })
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
			),
		);
}

// Links Clerk's application-invitation identifier to its local Project invitation.
export async function linkProjectInvitationToClerk(
	invitationId: string,
	clerkInvitationId: string,
) {
	await db
		.update(projectInvitations)
		.set({ clerkInvitationId })
		.where(eq(projectInvitations.id, invitationId));
}

// Accepts a pending invitation and performs the SOLO-to-TEAM membership transition.
export async function acceptProjectInvitation(
	invitationId: string,
	applicationUserId: string,
) {
	await expirePendingProjectInvitation(invitationId);

	const [invitation] = await db
		.select({
			projectId: projectInvitations.projectId,
			projectName: projects.name,
			invitedById: projectInvitations.invitedById,
		})
		.from(projectInvitations)
		.innerJoin(projects, eq(projects.id, projectInvitations.projectId))
		.innerJoin(
			users,
			and(
				eq(users.id, applicationUserId),
				eq(users.email, projectInvitations.email),
			),
		)
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
				gt(projectInvitations.expiresAt, new Date()),
				isNull(users.deletedAt),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);
	if (!invitation) return null;

	const membership = await addProjectMember(
		invitation.projectId,
		applicationUserId,
		invitation.invitedById,
	);
	if (!membership) return null;

	await db
		.update(projectInvitations)
		.set({ status: "accepted", acceptedAt: new Date() })
		.where(eq(projectInvitations.id, invitationId));

	return { ...membership, projectName: invitation.projectName };
}

// Declines a pending invitation only when the signed-in user's email matches it.
export async function declineProjectInvitation(
	invitationId: string,
	applicationUserId: string,
) {
	await expirePendingProjectInvitation(invitationId);

	const [invitation] = await db
		.select({ clerkInvitationId: projectInvitations.clerkInvitationId })
		.from(projectInvitations)
		.innerJoin(
			users,
			and(
				eq(users.id, applicationUserId),
				eq(users.email, projectInvitations.email),
			),
		)
		.where(
			and(
				eq(projectInvitations.id, invitationId),
				eq(projectInvitations.status, "pending"),
				isNull(users.deletedAt),
			),
		)
		.limit(1);
	if (!invitation) return null;

	await db
		.update(projectInvitations)
		.set({ status: "declined" })
		.where(eq(projectInvitations.id, invitationId));

	return invitation;
}
