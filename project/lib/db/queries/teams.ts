import "server-only";

import { and, asc, eq, exists, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, teamMembers, teams } from "@/lib/db/schema";
import type { TeamListItem } from "@/types";

// Loads accessible active teams with counts used by the team overview cards.
export async function getTeamListForUser(
	applicationUserId: string,
): Promise<TeamListItem[]> {
	const membershipAccess = db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.teamId, teams.id),
				eq(teamMembers.userId, applicationUserId),
				eq(teamMembers.membershipStatus, "active"),
			),
		);

	const rows = await db
		.select({
			id: teams.id,
			name: teams.name,
			description: teams.description,
			isOwner: sql<boolean>`${teams.createdById} = ${applicationUserId}`,
			memberCount: sql<number>`(
				count(distinct ${teamMembers.userId}) +
				case when count(distinct case when ${teamMembers.userId} = ${teams.createdById} then ${teamMembers.userId} end) = 0 then 1 else 0 end
			)::int`,
			projectCount: sql<number>`count(distinct ${projects.id})::int`,
		})
		.from(teams)
		.leftJoin(
			teamMembers,
			and(
				eq(teamMembers.teamId, teams.id),
				eq(teamMembers.membershipStatus, "active"),
			),
		)
		.leftJoin(
			projects,
			and(eq(projects.teamId, teams.id), isNull(projects.deletedAt)),
		)
		.where(
			and(
				eq(teams.status, "active"),
				isNull(teams.archivedAt),
				isNull(teams.deletedAt),
				or(
					eq(teams.createdById, applicationUserId),
					exists(membershipAccess),
				),
			),
		)
		.groupBy(teams.id)
		.orderBy(asc(teams.name));

	return rows;
}

// Loads active teams owned by or shared with an application user.
export async function getAvailableTeamsForUser(applicationUserId: string) {
	const [ownedTeams, memberships] = await Promise.all([
		db
			.select({ id: teams.id, name: teams.name })
			.from(teams)
			.where(
				and(
					eq(teams.createdById, applicationUserId),
					eq(teams.status, "active"),
					isNull(teams.deletedAt),
				),
			),
		db
			.select({ id: teams.id, name: teams.name })
			.from(teamMembers)
			.innerJoin(teams, eq(teamMembers.teamId, teams.id))
			.where(
				and(
					eq(teamMembers.userId, applicationUserId),
					eq(teamMembers.membershipStatus, "active"),
					eq(teams.status, "active"),
					isNull(teams.deletedAt),
				),
			),
	]);

	const teamMap = new Map(
		[...ownedTeams, ...memberships].map((team) => [team.id, team]),
	);

	return [...teamMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Loads active teams created by an application user for ownership selectors.
export async function getOwnedTeamsForUser(applicationUserId: string) {
	return db
		.select({ id: teams.id, name: teams.name })
		.from(teams)
		.where(
			and(
				eq(teams.createdById, applicationUserId),
				eq(teams.status, "active"),
				isNull(teams.deletedAt),
			),
		)
		.orderBy(teams.name);
}

// Checks whether an application user owns or actively belongs to a team.
export async function canAccessTeam(teamId: string, applicationUserId: string) {
	const [ownedTeam] = await db
		.select({ id: teams.id })
		.from(teams)
		.where(
			and(
				eq(teams.id, teamId),
				eq(teams.createdById, applicationUserId),
				eq(teams.status, "active"),
				isNull(teams.deletedAt),
			),
		)
		.limit(1);

	if (ownedTeam) return true;

	const [membership] = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.innerJoin(teams, eq(teamMembers.teamId, teams.id))
		.where(
			and(
				eq(teamMembers.teamId, teamId),
				eq(teamMembers.userId, applicationUserId),
				eq(teamMembers.membershipStatus, "active"),
				eq(teams.status, "active"),
				isNull(teams.deletedAt),
			),
		)
		.limit(1);

	return Boolean(membership);
}
