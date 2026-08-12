import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Finds the active application user associated with a Clerk user ID.
export async function getApplicationUserByClerkId(clerkId: string) {
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.clerkId, clerkId), isNull(users.deletedAt)))
		.limit(1);

	return user ?? null;
}
