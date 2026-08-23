import "server-only";

import { and, count, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, projects, tasks, users } from "@/lib/db/schema";
import { createProjectHref } from "@/lib/project-slug";
import type { NotificationPage } from "@/types";

export const NOTIFICATION_PAGE_SIZE = 5;
export const NOTIFICATION_WINDOW_MS = 3 * 24 * 60 * 60 * 1_000;

interface NotificationCursor {
	createdAt: Date;
	id: string;
}

// Loads one five-item page from the user's three-day notification window.
export async function getNotificationPage(
	recipientUserId: string,
	cursor?: NotificationCursor,
): Promise<NotificationPage> {
	const windowStart = new Date(Date.now() - NOTIFICATION_WINDOW_MS);
	const cursorCondition = cursor
		? or(
				lt(notifications.createdAt, cursor.createdAt),
				and(
					eq(notifications.createdAt, cursor.createdAt),
					lt(notifications.id, cursor.id),
				),
			)
		: undefined;
	const rows = await db
		.select({
			id: notifications.id,
			type: notifications.type,
			actorFirstName: users.firstName,
			actorLastName: users.lastName,
			actorEmail: users.email,
			actorImageUrl: users.imageUrl,
			projectId: projects.id,
			projectName: projects.name,
			taskId: tasks.id,
			taskTitle: tasks.title,
			readAt: notifications.readAt,
			createdAt: notifications.createdAt,
		})
		.from(notifications)
		.innerJoin(users, eq(notifications.actorUserId, users.id))
		.innerJoin(projects, eq(notifications.projectId, projects.id))
		.innerJoin(tasks, eq(notifications.taskId, tasks.id))
		.where(
			and(
				eq(notifications.recipientUserId, recipientUserId),
				gt(notifications.createdAt, windowStart),
				cursorCondition,
			),
		)
		.orderBy(desc(notifications.createdAt), desc(notifications.id))
		.limit(NOTIFICATION_PAGE_SIZE + 1);
	const [{ value: unreadCount = 0 } = { value: 0 }] = await db
		.select({ value: count() })
		.from(notifications)
		.where(
			and(
				eq(notifications.recipientUserId, recipientUserId),
				gt(notifications.createdAt, windowStart),
				isNull(notifications.readAt),
			),
		);
	const visibleRows = rows.slice(0, NOTIFICATION_PAGE_SIZE);
	const last = visibleRows.at(-1);

	return {
		items: visibleRows.map((row) => ({
			id: row.id,
			type: row.type,
			actorName:
				[row.actorFirstName, row.actorLastName].filter(Boolean).join(" ") ||
				row.actorEmail,
			actorImageUrl: row.actorImageUrl,
			projectName: row.projectName,
			taskTitle: row.taskTitle,
			href: `${createProjectHref(row.projectId, row.projectName)}?task=${row.taskId}`,
			readAt: row.readAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
		})),
		unreadCount,
		nextCursor:
			rows.length > NOTIFICATION_PAGE_SIZE && last
				? { createdAt: last.createdAt.toISOString(), id: last.id }
				: null,
	};
}
