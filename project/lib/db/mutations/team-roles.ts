import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamRoles } from "@/lib/db/schema";

interface CreateTeamRoleMutationInput {
	teamId: string;
	name: string;
	createdById: string;
}

interface RenameTeamRoleMutationInput {
	teamId: string;
	roleId: string;
	name: string;
}

// Creates a reusable role that belongs to exactly one team.
export async function insertTeamRole(input: CreateTeamRoleMutationInput) {
	const [role] = await db
		.insert(teamRoles)
		.values(input)
		.onConflictDoNothing()
		.returning({ id: teamRoles.id });

	return role ?? null;
}

// Renames one reusable role within its owning Team.
export async function renameTeamRole(input: RenameTeamRoleMutationInput) {
	try {
		const [role] = await db
			.update(teamRoles)
			.set({ name: input.name, updatedAt: new Date() })
			.where(
				and(eq(teamRoles.id, input.roleId), eq(teamRoles.teamId, input.teamId)),
			)
			.returning({ id: teamRoles.id });

		return role ?? null;
	} catch {
		return null;
	}
}
