import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamMembers, teams } from "@/lib/db/schema";

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
