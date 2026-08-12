import "server-only";

import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import type { CreateTeamInput } from "@/types";

type InsertTeamInput = CreateTeamInput & {
	createdById: string;
};

// Inserts one validated team and returns the fields needed by the form flow.
export async function insertTeam(input: InsertTeamInput) {
	const [team] = await db.insert(teams).values(input).returning({
		id: teams.id,
		name: teams.name,
	});

	return team ?? null;
}
