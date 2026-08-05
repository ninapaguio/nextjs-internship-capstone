import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	foreignKey,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { invitationStatus, membershipStatus, teamStatus } from "./enums";
import { users } from "./users";

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: varchar("name", { length: 120 }).notNull(),
		description: text("description"),
		createdById: uuid("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		status: teamStatus("status").default("active").notNull(),
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
		index("teams_created_by_id_idx").on(table.createdById),
		index("teams_status_idx").on(table.status),
		index("teams_deleted_at_idx").on(table.deletedAt),
		index("teams_active_idx")
			.on(table.createdById)
			.where(sql`${table.deletedAt} is null and ${table.archivedAt} is null`),
		check(
			"teams_archive_status_consistent",
			sql`(${table.status} = 'archived') = (${table.archivedAt} is not null)`,
		),
		check(
			"teams_delete_requires_archive",
			sql`${table.deletedAt} is null or ${table.archivedAt} is not null`,
		),
	],
);

// Roles are reusable within a team; permissions are attached to roles
export const teamRoles = pgTable(
	"team_roles",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		key: varchar("key", { length: 50 }).notNull(),
		name: varchar("name", { length: 50 }).notNull(),
		description: text("description"),
		isSystem: boolean("is_system").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_roles_team_key_unique").on(table.teamId, table.key),
		uniqueIndex("team_roles_team_name_unique").on(table.teamId, table.name),
		unique("team_roles_team_id_id_unique").on(table.teamId, table.id),
	],
);

export const permissions = pgTable("permissions", {
	id: uuid("id").defaultRandom().primaryKey(),
	key: varchar("key", { length: 80 }).notNull().unique(),
	description: text("description"),
});

export const rolePermissions = pgTable(
	"role_permissions",
	{
		roleId: uuid("role_id")
			.notNull()
			.references(() => teamRoles.id, { onDelete: "cascade" }),
		permissionId: uuid("permission_id")
			.notNull()
			.references(() => permissions.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const teamMembers = pgTable(
	"team_members",
	{
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		roleId: uuid("role_id")
			.notNull()
			.references(() => teamRoles.id, { onDelete: "restrict" }),
		status: membershipStatus("status").default("active").notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.teamId, table.userId] }),
		index("team_members_user_id_idx").on(table.userId),
		index("team_members_role_id_idx").on(table.roleId),
		foreignKey({
			columns: [table.teamId, table.roleId],
			foreignColumns: [teamRoles.teamId, teamRoles.id],
			name: "fk_team_members_role_team",
		}).onDelete("restrict"),
	],
);

// Invitations exist when the email does not yet belong to a user
export const teamInvitations = pgTable(
	"team_invitations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		roleId: uuid("role_id")
			.notNull()
			.references(() => teamRoles.id, { onDelete: "restrict" }),
		memberName: varchar("member_name", { length: 120 }).notNull(),
		email: text("email").notNull(),
		invitedById: uuid("invited_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		status: invitationStatus("status").default("pending").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
	},
	(table) => [
		index("team_invitations_team_email_idx").on(table.teamId, table.email),
		index("team_invitations_status_idx").on(table.status),
		uniqueIndex("team_invitations_pending_email_unique")
			.on(table.teamId, sql`lower(${table.email})`)
			.where(sql`${table.status} = 'pending'`),
		foreignKey({
			columns: [table.teamId, table.roleId],
			foreignColumns: [teamRoles.teamId, teamRoles.id],
			name: "fk_team_invitations_role_team",
		}).onDelete("restrict"),
	],
);
