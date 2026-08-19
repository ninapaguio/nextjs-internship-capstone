import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	projectInvitations,
	projectMembers,
	projects,
	teamRoles,
	teams,
	users,
} from "@/lib/db/schema";
import type {
	ProjectInvitationManagementStatus,
	TeamDetailMember,
	TeamListItem,
} from "@/types";

// Produces a readable member name from synchronized Clerk profile fields.
function getMemberName(member: {
	firstName: string | null;
	lastName: string | null;
	username: string;
}) {
	return (
		[member.firstName, member.lastName].filter(Boolean).join(" ") ||
		member.username
	);
}

// Lists only generated TEAM projects that the application user belongs to.
export async function getTeamListForUser(
	applicationUserId: string,
): Promise<TeamListItem[]> {
	return db
		.select({
			id: teams.id,
			name: projects.name,
			description: projects.description,
			isOwner: sql<boolean>`${projectMembers.accessRole} = 'owner'`,
			memberCount: sql<number>`(
				select count(*)::int from ${projectMembers} memberships
				where memberships.project_id = ${projects.id}
			)`,
		})
		.from(teams)
		.innerJoin(projects, eq(teams.projectId, projects.id))
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(
			and(
				isNull(teams.deletedAt),
				isNull(teams.archivedAt),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.orderBy(asc(projects.name));
}

// Loads one generated Team by deriving its roster from Project membership.
export async function getTeamDetailForUser(
	teamId: string,
	applicationUserId: string,
) {
	const [team] = await db
		.select({
			id: teams.id,
			projectId: projects.id,
			name: projects.name,
			viewerRole: projectMembers.accessRole,
		})
		.from(teams)
		.innerJoin(projects, eq(teams.projectId, projects.id))
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(
			and(
				eq(teams.id, teamId),
				isNull(teams.deletedAt),
				isNull(teams.archivedAt),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.limit(1);
	if (!team) return null;

	const [memberRows, roles, invitationRows] = await Promise.all([
		db
			.select({
				id: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				username: users.username,
				email: users.email,
				imageUrl: users.imageUrl,
				accessRole: projectMembers.accessRole,
				assignedRoleId: projectMembers.assignedRoleId,
				assignedRoleName: teamRoles.name,
			})
			.from(projectMembers)
			.innerJoin(users, eq(projectMembers.userId, users.id))
			.leftJoin(teamRoles, eq(projectMembers.assignedRoleId, teamRoles.id))
			.where(
				and(
					eq(projectMembers.projectId, team.projectId),
					isNull(users.deletedAt),
				),
			)
			.orderBy(asc(users.firstName), asc(users.username)),
		db
			.select({ id: teamRoles.id, name: teamRoles.name })
			.from(teamRoles)
			.where(eq(teamRoles.teamId, team.id))
			.orderBy(asc(teamRoles.name)),
		db
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
			.where(
				and(
					eq(projectInvitations.projectId, team.projectId),
					inArray(projectInvitations.status, [
						"pending",
						"declined",
						"expired",
					]),
				),
			)
			.orderBy(desc(projectInvitations.createdAt)),
	]);

	const isOwner = team.viewerRole === "owner";
	const members: TeamDetailMember[] = memberRows.map((member) => ({
		id: member.id,
		name: getMemberName(member),
		email: member.email,
		imageUrl: member.imageUrl,
		projectRole: member.accessRole,
		projects: [
			{
				projectId: team.projectId,
				projectName: team.name,
				accessRole: member.accessRole,
				assignedRoleId: member.assignedRoleId,
				assignedRoleName: member.assignedRoleName,
				canManage: isOwner,
			},
		],
	}));

	return {
		id: team.id,
		projectId: team.projectId,
		name: team.name,
		isOwner,
		roles,
		invitations: isOwner ? invitationRows : [],
		members,
	};
}

// Checks Team access through the generated Team's Project membership.
export async function canAccessTeam(teamId: string, applicationUserId: string) {
	const [membership] = await db
		.select({ userId: projectMembers.userId })
		.from(teams)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, teams.projectId),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(
			and(
				eq(teams.id, teamId),
				isNull(teams.deletedAt),
				isNull(teams.archivedAt),
			),
		)
		.limit(1);
	return Boolean(membership);
}
