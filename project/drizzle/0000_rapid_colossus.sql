CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'moved', 'assigned', 'unassigned', 'commented', 'completed', 'reopened', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."list_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'not active');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('planned', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "complexity_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(30) NOT NULL,
	"label" varchar(50) NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "complexity_options_sort_order_positive" CHECK ("complexity_options"."sort_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(7) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "labels_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "labels_hex_color" CHECK ("labels"."color" ~ '^#[0-9A-Fa-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" integer NOT NULL,
	"status" "list_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "lists_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "lists_position_nonnegative" CHECK ("lists"."position" >= 0),
	CONSTRAINT "lists_archive_status_consistent" CHECK (("lists"."status" = 'archived') = ("lists"."archived_at" is not null)),
	CONSTRAINT "lists_delete_requires_archive" CHECK ("lists"."deleted_at" is null or "lists"."archived_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"description" text,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"start_date" date,
	"end_date" date,
	"status" "project_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_valid_date_range" CHECK ("projects"."start_date" is null or "projects"."end_date" is null or "projects"."end_date" >= "projects"."start_date"),
	CONSTRAINT "projects_archive_status_consistent" CHECK (("projects"."status" = 'archived') = ("projects"."archived_at" is not null)),
	CONSTRAINT "projects_delete_requires_archive" CHECK ("projects"."deleted_at" is null or "projects"."archived_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "task_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" "activity_action" NOT NULL,
	"field_name" varchar(80),
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignees" (
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_by_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "task_labels" (
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"label_id" uuid NOT NULL,
	CONSTRAINT "task_labels_task_id_label_id_pk" PRIMARY KEY("task_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"complexity_id" uuid NOT NULL,
	"due_date" date,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tasks_project_id_id_unique" UNIQUE("project_id","id"),
	CONSTRAINT "tasks_position_nonnegative" CHECK ("tasks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"member_name" varchar(120) NOT NULL,
	"email" text NOT NULL,
	"invited_by_id" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"key" varchar(50) NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_roles_team_id_id_unique" UNIQUE("team_id","id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_by_id" uuid NOT NULL,
	"status" "team_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "teams_archive_status_consistent" CHECK (("teams"."status" = 'archived') = ("teams"."archived_at" is not null)),
	CONSTRAINT "teams_delete_requires_archive" CHECK ("teams"."deleted_at" is null or "teams"."archived_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"username" varchar(100) NOT NULL,
	"first_name" text,
	"last_name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "task_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "fk_task_labels_task_project" FOREIGN KEY ("project_id","task_id") REFERENCES "public"."tasks"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_labels" ADD CONSTRAINT "fk_task_labels_label_project" FOREIGN KEY ("project_id","label_id") REFERENCES "public"."labels"("project_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_complexity_id_complexity_options_id_fk" FOREIGN KEY ("complexity_id") REFERENCES "public"."complexity_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_list_project" FOREIGN KEY ("project_id","list_id") REFERENCES "public"."lists"("project_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_role_id_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "fk_team_invitations_role_team" FOREIGN KEY ("team_id","role_id") REFERENCES "public"."team_roles"("team_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_role_id_team_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."team_roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "fk_team_members_role_team" FOREIGN KEY ("team_id","role_id") REFERENCES "public"."team_roles"("team_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_task_created_at_idx" ON "comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "complexity_options_key_unique" ON "complexity_options" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "complexity_options_sort_order_unique" ON "complexity_options" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_project_name_unique" ON "labels" USING btree ("project_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "lists_project_name_unique" ON "lists" USING btree ("project_id","name") WHERE "lists"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "lists_project_position_idx" ON "lists" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "lists_active_project_position_idx" ON "lists" USING btree ("project_id","position") WHERE "lists"."deleted_at" is null and "lists"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "projects_team_id_idx" ON "projects" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "projects_created_by_id_idx" ON "projects" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "projects_deleted_at_idx" ON "projects" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "projects_active_idx" ON "projects" USING btree ("team_id") WHERE "projects"."deleted_at" is null and "projects"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_team_id_id_unique" ON "projects" USING btree ("team_id","id");--> statement-breakpoint
CREATE INDEX "task_activities_task_created_at_idx" ON "task_activities" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "task_activities_actor_id_idx" ON "task_activities" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "task_assignees_user_id_idx" ON "task_assignees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "tasks_list_position_idx" ON "tasks" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "tasks_created_by_id_idx" ON "tasks" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "tasks_complexity_id_idx" ON "tasks" USING btree ("complexity_id");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_active_idx" ON "tasks" USING btree ("project_id") WHERE "tasks"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "team_invitations_team_email_idx" ON "team_invitations" USING btree ("team_id","email");--> statement-breakpoint
CREATE INDEX "team_invitations_status_idx" ON "team_invitations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_pending_email_unique" ON "team_invitations" USING btree ("team_id",lower("email")) WHERE "team_invitations"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "team_members_user_id_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_members_role_id_idx" ON "team_members" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_roles_team_key_unique" ON "team_roles" USING btree ("team_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "team_roles_team_name_unique" ON "team_roles" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "teams_created_by_id_idx" ON "teams" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "teams_status_idx" ON "teams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "teams_deleted_at_idx" ON "teams" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "teams_active_idx" ON "teams" USING btree ("created_by_id") WHERE "teams"."deleted_at" is null and "teams"."archived_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_unique" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_email_unique" ON "users" USING btree (lower("email")) WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_username_unique" ON "users" USING btree (lower("username")) WHERE "users"."deleted_at" is null;