import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { NOTIFICATION_WINDOW_MS } from "@/lib/db/queries/notifications";
import { notifications } from "@/lib/db/schema";

// Marks one recent notification only when it belongs to the current user.
export async function markNotificationRead(
	notificationId: string,
	recipientUserId: string,
) {
	const [notification] = await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.id, notificationId),
				eq(notifications.recipientUserId, recipientUserId),
				gt(
					notifications.createdAt,
					new Date(Date.now() - NOTIFICATION_WINDOW_MS),
				),
				isNull(notifications.readAt),
			),
		)
		.returning({ id: notifications.id });

	return notification ?? null;
}

// Marks every unread notification in the user's visible three-day window.
export async function markAllNotificationsRead(recipientUserId: string) {
	return db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(
			and(
				eq(notifications.recipientUserId, recipientUserId),
				gt(
					notifications.createdAt,
					new Date(Date.now() - NOTIFICATION_WINDOW_MS),
				),
				isNull(notifications.readAt),
			),
		)
		.returning({ id: notifications.id });
}
