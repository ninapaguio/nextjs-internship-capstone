"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	markAllNotificationsRead as markAllNotificationsReadMutation,
	markNotificationRead as markNotificationReadMutation,
} from "@/lib/db/mutations/notifications";
import { uuidSchema } from "@/lib/validations";

// include one notification after resolving the authenticated application user.
export async function markNotificationRead(notificationId: string) {
	const parsedId = uuidSchema.safeParse(notificationId);
	if (!parsedId.success) return { status: "error" as const };
	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error" as const };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) return { status: "error" as const };

	await markNotificationReadMutation(parsedId.data, applicationUser.id);
	revalidatePath("/dashboard");
	return { status: "success" as const };
}

// Marks the current user's visible notification window as read.
export async function markAllNotificationsRead() {
	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error" as const };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) return { status: "error" as const };

	await markAllNotificationsReadMutation(applicationUser.id);
	revalidatePath("/dashboard");
	return { status: "success" as const };
}
