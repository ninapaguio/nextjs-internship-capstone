import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export type ApplicationRole = "admin" | "user";

// Reads the application-level role from Clerk without mixing it into Project membership.
export async function getClerkApplicationRole(
	clerkUserId: string,
): Promise<ApplicationRole> {
	const client = await clerkClient();
	const user = await client.users.getUser(clerkUserId);
	return user.publicMetadata.role === "admin" ? "admin" : "user";
}

// Checks application administration independently from Project owner authorization.
export async function isClerkApplicationAdmin(clerkUserId: string) {
	return (await getClerkApplicationRole(clerkUserId)) === "admin";
}
