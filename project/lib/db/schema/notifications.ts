import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { notificationType } from "./enums";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { users } from "./users";

// Stores personal task notifications so users can read events they missed while offline.
export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		recipientUserId: uuid("recipient_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		actorUserId: uuid("actor_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		type: notificationType("type").notNull(),
		readAt: timestamp("read_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("notifications_recipient_created_at_idx").on(
			table.recipientUserId,
			table.createdAt,
		),
		index("notifications_recipient_unread_idx").on(
			table.recipientUserId,
			table.readAt,
		),
		index("notifications_task_id_idx").on(table.taskId),
	],
);
