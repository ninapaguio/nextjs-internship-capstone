import "server-only";

import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	projectInvitations,
	projectMembers,
	projects,
	teamRoles,
	teams,
	users,
} from "@/lib/db/schema";
import type { ProjectInvitationManagementStatus } from "@/types";

// Loads invitation context only when the application user owns the project.
export async function getProjectInvitationAccess(
	projectId: string,
	applicationUserId: string,
) {
	const [project] = await db
		.select({ id: projects.id, name: projects.name })
		.from(projects)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
				eq(projectMembers.accessRole, "owner"),
			),
		)
		.where(
			and(
				eq(projects.id, projectId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);
	return project ?? null;
}

// Checks whether an email already belongs to the Project before a new invite is sent.
export async function isProjectMemberByEmail(projectId: string, email: string) {
	const [membership] = await db
		.select({ userId: projectMembers.userId })
		.from(projectMembers)
		.innerJoin(users, eq(users.id, projectMembers.userId))
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(users.email, email),
				isNull(users.deletedAt),
			),
		)
		.limit(1);
	return Boolean(membership);
}

// Loads one pending invitation only for the invited account and active project.
export async function getPendingProjectInvitationForUser(
	invitationId: string,
	applicationUserId: string,
) {
	const [invitation] = await db
		.select({
			id: projectInvitations.id,
			projectId: projects.id,
			projectName: projects.name,
			projectDescription: projects.description,
			expiresAt: projectInvitations.expiresAt,
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
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
				isNull(users.deletedAt),
			),
		)
		.limit(1);

	return invitation ?? null;
}

// Lists owner-visible invitation outcomes and derives elapsed pending records as expired.
export async function getProjectInvitationsForOwner(
	projectId: string,
	applicationUserId: string,
) {
	return db
		.select({
			id: projectInvitations.id,
			email: projectInvitations.email,
			status: sql<ProjectInvitationManagementStatus>`case
				when ${projectInvitations.status} = 'pending'
					and ${projectInvitations.expiresAt} <= now() then 'expired'
				else ${projectInvitations.status}::text
			end`,
			createdAt: projectInvitations.createdAt,
			expiresAt: projectInvitations.expiresAt,
		})
		.from(projectInvitations)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projectInvitations.projectId),
				eq(projectMembers.userId, applicationUserId),
				eq(projectMembers.accessRole, "owner"),
			),
		)
		.where(
			and(
				eq(projectInvitations.projectId, projectId),
				inArray(projectInvitations.status, ["pending", "declined", "expired"]),
			),
		)
		.orderBy(desc(projectInvitations.createdAt));
}

// Checks whether the application user is the project's owner.
export async function canManageProjectMembers(
	projectId: string,
	teamId: string,
	applicationUserId: string,
) {
	const [project] = await db
		.select({ id: projects.id })
		.from(projects)
		.innerJoin(teams, eq(teams.projectId, projects.id))
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
				eq(projectMembers.accessRole, "owner"),
			),
		)
		.where(
			and(
				eq(projects.id, projectId),
				eq(teams.id, teamId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
				eq(projectMembers.accessRole, "owner"),
			),
		)
		.limit(1);

	return Boolean(project);
}

// Allows only the generated Team's project owner to define reusable roles.
export async function canManageTeamRoles(
	teamId: string,
	applicationUserId: string,
) {
	const [team] = await db
		.select({ id: teams.id })
		.from(teams)
		.innerJoin(projects, eq(teams.projectId, projects.id))
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
				eq(projectMembers.accessRole, "owner"),
			),
		)
		.where(
			and(
				eq(teams.id, teamId),
				isNull(teams.deletedAt),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.limit(1);

	return Boolean(team);
}

// Confirms that a selected reusable role belongs to the current team.
export async function isTeamRole(teamId: string, roleId: string) {
	const [role] = await db
		.select({ id: teamRoles.id })
		.from(teamRoles)
		.where(and(eq(teamRoles.id, roleId), eq(teamRoles.teamId, teamId)))
		.limit(1);

	return Boolean(role);
}
