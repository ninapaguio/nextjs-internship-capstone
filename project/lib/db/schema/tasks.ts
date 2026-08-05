import { sql } from "drizzle-orm";
import {
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { activityAction } from "./enums";
import { complexityOptions, labels, lists, projects } from "./projects";
import { users } from "./users";

// Work items displayed inside a project's Kanban columns
export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		listId: uuid("list_id")
			.notNull()
			.references(() => lists.id, { onDelete: "restrict" }),
		createdById: uuid("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		title: varchar("title", { length: 200 }).notNull(),
		description: text("description"),
		complexityId: uuid("complexity_id")
			.notNull()
			.references(() => complexityOptions.id, { onDelete: "restrict" }),
		dueDate: date("due_date"),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("tasks_project_id_idx").on(table.projectId),
		index("tasks_list_position_idx").on(table.listId, table.position),
		index("tasks_created_by_id_idx").on(table.createdById),
		index("tasks_complexity_id_idx").on(table.complexityId),
		index("tasks_due_date_idx").on(table.dueDate),
		index("tasks_active_idx")
			.on(table.projectId)
			.where(sql`${table.deletedAt} is null`),
		unique("tasks_project_id_id_unique").on(table.projectId, table.id),
		check("tasks_position_nonnegative", sql`${table.position} >= 0`),
		foreignKey({
			columns: [table.projectId, table.listId],
			foreignColumns: [lists.projectId, lists.id],
			name: "fk_tasks_list_project",
		}).onDelete("restrict"),
	],
);

// Supports one or more assignees for each task
export const taskAssignees = pgTable(
	"task_assignees",
	{
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		assignedById: uuid("assigned_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		assignedAt: timestamp("assigned_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.userId] }),
		index("task_assignees_user_id_idx").on(table.userId),
	],
);

export const taskLabels = pgTable(
	"task_labels",
	{
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		labelId: uuid("label_id")
			.notNull()
			.references(() => labels.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.taskId, table.labelId] }),
		foreignKey({
			columns: [table.projectId, table.taskId],
			foreignColumns: [tasks.projectId, tasks.id],
			name: "fk_task_labels_task_project",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.projectId, table.labelId],
			foreignColumns: [labels.projectId, labels.id],
			name: "fk_task_labels_label_project",
		}).onDelete("cascade"),
	],
);

export const comments = pgTable(
	"comments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		content: text("content").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("comments_task_created_at_idx").on(table.taskId, table.createdAt),
		index("comments_author_id_idx").on(table.authorId),
	],
);

// Immutable activity feed displayed in task details
export const taskActivities = pgTable(
	"task_activities",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		actorId: uuid("actor_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		action: activityAction("action").notNull(),
		fieldName: varchar("field_name", { length: 80 }),
		oldValue: jsonb("old_value"),
		newValue: jsonb("new_value"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("task_activities_task_created_at_idx").on(
			table.taskId,
			table.createdAt,
		),
		index("task_activities_actor_id_idx").on(table.actorId),
	],
);
