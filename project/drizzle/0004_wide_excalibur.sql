CREATE TYPE "public"."project_access_role" AS ENUM('manager', 'member');--> statement-breakpoint
CREATE TABLE "project_members" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"access_role" "project_access_role" DEFAULT 'member' NOT NULL,
	"team_id" uuid,
	"responsibility_id" uuid,
	"added_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_responsibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_responsibilities_team_id_id_unique" UNIQUE("team_id","id")
);
--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "clerk_invitation_id" varchar(255);--> statement-breakpoint
ALTER TABLE "team_invitations" ADD COLUMN "clerk_role_key" varchar(100);--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "clerk_membership_id" varchar(255);--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "clerk_role_key" varchar(100);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "clerk_organization_id" varchar(255);--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_responsibility_id_team_responsibilities_id_fk" FOREIGN KEY ("responsibility_id") REFERENCES "public"."team_responsibilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "fk_project_members_project_team" FOREIGN KEY ("team_id","project_id") REFERENCES "public"."projects"("team_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "fk_project_members_responsibility_team" FOREIGN KEY ("team_id","responsibility_id") REFERENCES "public"."team_responsibilities"("team_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_responsibilities" ADD CONSTRAINT "team_responsibilities_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_responsibilities" ADD CONSTRAINT "team_responsibilities_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_project_role_idx" ON "project_members" USING btree ("project_id","access_role");--> statement-breakpoint
CREATE INDEX "project_members_responsibility_id_idx" ON "project_members" USING btree ("responsibility_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_responsibilities_team_name_unique" ON "team_responsibilities" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "team_responsibilities_created_by_id_idx" ON "team_responsibilities" USING btree ("created_by_id");--> statement-breakpoint
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_clerk_invitation_id_unique" UNIQUE("clerk_invitation_id");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_clerk_membership_id_unique" UNIQUE("clerk_membership_id");--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_clerk_organization_id_unique" UNIQUE("clerk_organization_id");