ALTER TABLE "team_responsibilities" RENAME TO "team_roles";--> statement-breakpoint
ALTER TABLE "project_members" RENAME COLUMN "responsibility_id" TO "assigned_role_id";--> statement-breakpoint
ALTER TABLE "team_roles" DROP CONSTRAINT "team_responsibilities_team_id_id_unique";--> statement-breakpoint
ALTER TABLE "project_members" DROP CONSTRAINT "project_members_responsibility_id_team_responsibilities_id_fk";
--> statement-breakpoint
ALTER TABLE "team_roles" DROP CONSTRAINT "team_responsibilities_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "team_roles" DROP CONSTRAINT "team_responsibilities_created_by_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "project_members_responsibility_id_idx";--> statement-breakpoint
DROP INDEX "team_responsibilities_team_name_unique";--> statement-breakpoint
DROP INDEX "team_responsibilities_created_by_id_idx";--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_assigned_role_id_team_roles_id_fk" FOREIGN KEY ("assigned_role_id") REFERENCES "public"."team_roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_members_assigned_role_id_idx" ON "project_members" USING btree ("assigned_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_roles_team_name_unique" ON "team_roles" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "team_roles_created_by_id_idx" ON "team_roles" USING btree ("created_by_id");--> statement-breakpoint
ALTER TABLE "team_roles" ADD CONSTRAINT "team_roles_team_id_id_unique" UNIQUE("team_id","id");