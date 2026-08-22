import { sql } from "drizzle-orm";
import {
	check,
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
import { invitationStatus, projectAccessRole, teamStatus } from "./enums";
import { projects } from "./projects";
import { users } from "./users";

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
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
		uniqueIndex("teams_project_id_unique").on(table.projectId),
		index("teams_status_idx").on(table.status),
		index("teams_deleted_at_idx").on(table.deletedAt),
		index("teams_active_idx")
			.on(table.projectId)
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

// Team roles are defined once and can be assigned to members of the generated Team.
export const teamRoles = pgTable(
	"team_roles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 80 }).notNull(),
		createdById: uuid("created_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("team_roles_team_name_unique").on(table.teamId, table.name),
		unique("team_roles_team_id_id_unique").on(table.teamId, table.id),
		index("team_roles_created_by_id_idx").on(table.createdById),
	],
);

// Grants project-scoped owner, manager, or member access; this is the source of Team membership.
export const projectMembers = pgTable(
	"project_members",
	{
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessRole: projectAccessRole("access_role").default("member").notNull(),
		assignedRoleId: uuid("assigned_role_id").references(() => teamRoles.id, {
			onDelete: "set null",
		}),
		addedById: uuid("added_by_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.projectId, table.userId] }),
		index("project_members_user_id_idx").on(table.userId),
		index("project_members_project_role_idx").on(
			table.projectId,
			table.accessRole,
		),
		uniqueIndex("project_members_one_owner_unique")
			.on(table.projectId)
			.where(sql`${table.accessRole} = 'owner'`),
		index("project_members_assigned_role_id_idx").on(table.assignedRoleId),
	],
);

// Tracks an application invitation until the invited Clerk user joins one Project.
export const projectInvitations = pgTable(
	"project_invitations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		clerkInvitationId: varchar("clerk_invitation_id", { length: 255 }).unique(),
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
		index("project_invitations_project_id_idx").on(table.projectId),
		uniqueIndex("project_invitations_pending_email_unique")
			.on(table.projectId, sql`lower(${table.email})`)
			.where(sql`${table.status} = 'pending'`),
	],
);
