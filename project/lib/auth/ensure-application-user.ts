import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { upsertApplicationUser } from "@/lib/db/mutations/users";
import { getApplicationUserByClerkId } from "@/lib/db/queries/users";
import { userSchema } from "@/lib/validations";
import type { ApplicationUser } from "@/types";

// Returns the local user, creating it from the active Clerk profile when needed.
export async function ensureApplicationUser(
	clerkId: string,
): Promise<ApplicationUser | null> {
	const existingUser = await getApplicationUserByClerkId(clerkId);

	if (existingUser) return existingUser;

	try {
		const clerkUser = await currentUser();
		if (!clerkUser || clerkUser.id !== clerkId) return null;

		const email =
			clerkUser.emailAddresses.find(
				(address) => address.id === clerkUser.primaryEmailAddressId,
			)?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

		const parsedUser = userSchema.safeParse({
			clerkId: clerkUser.id,
			email,
			username: clerkUser.username ?? `user_${clerkUser.id}`,
			firstName: clerkUser.firstName ?? undefined,
			lastName: clerkUser.lastName ?? undefined,
			imageUrl: clerkUser.imageUrl,
		});

		if (!parsedUser.success) return null;

		const syncedUser = await upsertApplicationUser(parsedUser.data);

		return syncedUser ?? null;
	} catch (error) {
		console.error("application_user_sync_failed", {
			clerkUserId: clerkId,
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}
