import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { BoardMemberOption } from "@/types";

// Loads a synchronized Clerk profile in the shared board-member shape.
export async function getBoardMemberOptionByUserId(
	userId: string,
): Promise<BoardMemberOption | null> {
	const [user] = await db
		.select({
			id: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			imageUrl: users.imageUrl,
		})
		.from(users)
		.where(and(eq(users.id, userId), isNull(users.deletedAt)))
		.limit(1);

	if (!user) return null;
	return {
		id: user.id,
		name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
		imageUrl: user.imageUrl,
	};
}

// Finds the active application user associated with a Clerk user ID.
export async function getApplicationUserByClerkId(clerkId: string) {
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.clerkId, clerkId), isNull(users.deletedAt)))
		.limit(1);

	return user ?? null;
}
