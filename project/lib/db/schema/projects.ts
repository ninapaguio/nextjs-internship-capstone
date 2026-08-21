import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { listStatus, projectStatus } from "./enums";
import { users } from "./users";

// Projects begin as solo workspaces and gain one generated Team when membership grows.
export const projects = pgTable(
	"projects",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		createdById: uuid("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		name: varchar("name", { length: 160 }).notNull(),
		description: text("description"),
		startDate: date("start_date"),
		endDate: date("end_date"),
		status: projectStatus("status").default("inactive").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("projects_created_by_id_idx").on(table.createdById),
		index("projects_status_idx").on(table.status),
		index("projects_deleted_at_idx").on(table.deletedAt),
		index("projects_active_idx")
			.on(table.createdById)
			.where(sql`${table.deletedAt} is null and ${table.archivedAt} is null`),
		check(
			"projects_valid_date_range",
			sql`${table.startDate} is null or ${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
		),
		check(
			"projects_archive_status_consistent",
			sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
		),
		check(
			"projects_delete_requires_archive",
			sql`${table.deletedAt} is null or ${table.archivedAt} is not null`,
		),
	],
);

// Ordered Kanban columns belonging to one project
export const lists = pgTable(
	"lists",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		description: text("description"),
		position: integer("position").notNull(),
		status: listStatus("status").default("active").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		uniqueIndex("lists_project_name_unique")
			.on(table.projectId, table.name)
			.where(sql`${table.deletedAt} is null`),
		unique("lists_project_id_id_unique").on(table.projectId, table.id),
		index("lists_project_position_idx").on(table.projectId, table.position),
		index("lists_active_project_position_idx")
			.on(table.projectId, table.position)
			.where(sql`${table.deletedAt} is null and ${table.archivedAt} is null`),
		check("lists_position_nonnegative", sql`${table.position} >= 0`),
		check(
			"lists_archive_status_consistent",
			sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
		),
		check(
			"lists_delete_requires_archive",
			sql`${table.deletedAt} is null or ${table.archivedAt} is not null`,
		),
	],
);

// Labels are reusable only inside their project
export const labels = pgTable(
	"labels",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 50 }).notNull(),
		color: varchar("color", { length: 7 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("labels_project_name_unique").on(table.projectId, table.name),
		unique("labels_project_id_id_unique").on(table.projectId, table.id),
		check("labels_hex_color", sql`${table.color} ~ '^#[0-9A-Fa-f]{6}$'`),
	],
);

// Static reference data rendered as the task form's priority options
export const priorityOptions = pgTable(
	"priority_options",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		key: varchar("key", { length: 30 }).notNull(),
		label: varchar("label", { length: 50 }).notNull(),
		sortOrder: integer("sort_order").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
	},
	(table) => [
		uniqueIndex("priority_options_key_unique").on(table.key),
		uniqueIndex("priority_options_sort_order_unique").on(table.sortOrder),
		check("priority_options_sort_order_positive", sql`${table.sortOrder} > 0`),
	],
);
