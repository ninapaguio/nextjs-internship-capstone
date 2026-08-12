import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserInput } from "@/types";

interface UpsertApplicationUserOptions {
	preserveExistingImageWhenMissing?: boolean;
}

// Inserts or refreshes an application user synchronized from Clerk.
export async function upsertApplicationUser(
	input: UserInput,
	options: UpsertApplicationUserOptions = {},
) {
	const now = new Date();
	const imageUpdate =
		options.preserveExistingImageWhenMissing && input.imageUrl === undefined
			? {}
			: { imageUrl: input.imageUrl };

	const [user] = await db
		.insert(users)
		.values({ ...input, updatedAt: now })
		.onConflictDoUpdate({
			target: users.clerkId,
			set: {
				email: input.email,
				username: input.username,
				firstName: input.firstName,
				lastName: input.lastName,
				...imageUpdate,
				updatedAt: now,
				deletedAt: null,
			},
		})
		.returning({ id: users.id });

	return user ?? null;
}

// Soft-deletes an application user after Clerk deletes the source account.
export async function softDeleteApplicationUser(clerkId: string) {
	const now = new Date();

	await db
		.update(users)
		.set({ deletedAt: now, updatedAt: now })
		.where(eq(users.clerkId, clerkId));
}
