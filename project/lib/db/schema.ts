import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const projectRole = pgEnum("project_role", [
	"owner",
	"lead",
	"member",
	"viewer",
]);

export const taskPriority = pgEnum("task_priority", [
	"low",
	"medium",
	"high",
	"urgent",
]);

/**
 * Clerk is the identity source of truth. This table stores only the user data
 * the application needs for project collaboration and database relationships.
 */
export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		clerkId: text("clerk_id").notNull(),
		email: text("email").notNull(),
		firstName: text("first_name"),
		lastName: text("last_name"),
		imageUrl: text("image_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("users_clerk_id_unique").on(table.clerkId),
		index("users_email_idx").on(table.email),
	],
);

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		description: text("description"),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		dueDate: timestamp("due_date", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
	},
	(table) => [
		index("projects_owner_id_idx").on(table.ownerId),
		index("projects_due_date_idx").on(table.dueDate),
	],
);

/**
 * Membership is separate from project ownership so permissions can be checked
 * without embedding arrays of users in a project row.
 */
export const projectMembers = pgTable(
	"project_members",
	{
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: projectRole("role").default("member").notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.projectId, table.userId] }),
		index("project_members_user_id_idx").on(table.userId),
	],
);

export const lists = pgTable(
	"lists",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("lists_project_position_idx").on(table.projectId, table.position),
		check("lists_position_nonnegative", sql`${table.position} >= 0`),
	],
);

export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		listId: uuid("list_id")
			.notNull()
			.references(() => lists.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		assigneeId: uuid("assignee_id").references(() => users.id, {
			onDelete: "set null",
		}),
		priority: taskPriority("priority").default("medium").notNull(),
		dueDate: timestamp("due_date", { withTimezone: true }),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		completedAt: timestamp("completed_at", { withTimezone: true }),
	},
	(table) => [
		index("tasks_list_position_idx").on(table.listId, table.position),
		index("tasks_assignee_id_idx").on(table.assigneeId),
		index("tasks_due_date_idx").on(table.dueDate),
		check("tasks_position_nonnegative", sql`${table.position} >= 0`),
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

/**
 * Clerk/Svix can retry deliveries. Recording the delivery ID lets webhook
 * processing remain idempotent.
 */
export const webhookEvents = pgTable("webhook_events", {
	id: text("id").primaryKey(),
	eventType: text("event_type").notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
	ownedProjects: many(projects),
	projectMemberships: many(projectMembers),
	assignedTasks: many(tasks),
	comments: many(comments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	owner: one(users, {
		fields: [projects.ownerId],
		references: [users.id],
	}),
	members: many(projectMembers),
	lists: many(lists),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id],
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id],
	}),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
	project: one(projects, {
		fields: [lists.projectId],
		references: [projects.id],
	}),
	tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	list: one(lists, {
		fields: [tasks.listId],
		references: [lists.id],
	}),
	assignee: one(users, {
		fields: [tasks.assigneeId],
		references: [users.id],
	}),
	comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	task: one(tasks, {
		fields: [comments.taskId],
		references: [tasks.id],
	}),
	author: one(users, {
		fields: [comments.authorId],
		references: [users.id],
	}),
}));
