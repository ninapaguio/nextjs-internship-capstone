ALTER TABLE "task_activities" ALTER COLUMN "action" SET DATA TYPE text;--> statement-breakpoint
UPDATE "task_activities" SET "action" = 'restored' WHERE "action" = 'reopened';--> statement-breakpoint
DROP TYPE "public"."activity_action";--> statement-breakpoint
CREATE TYPE "public"."activity_action" AS ENUM('created', 'updated', 'moved', 'assigned', 'unassigned', 'commented', 'completed', 'deleted', 'restored', 'archived', 'unarchived');--> statement-breakpoint
ALTER TABLE "task_activities" ALTER COLUMN "action" SET DATA TYPE "public"."activity_action" USING "action"::"public"."activity_action";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "status" SET DEFAULT 'active'::text;--> statement-breakpoint
UPDATE "team_members" SET "status" = 'disabled' WHERE "status" = 'not active';--> statement-breakpoint
DROP TYPE "public"."membership_status";--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'disabled');--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "status" SET DEFAULT 'active'::"public"."membership_status";--> statement-breakpoint
ALTER TABLE "team_members" ALTER COLUMN "status" SET DATA TYPE "public"."membership_status" USING "status"::"public"."membership_status";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_archive_status_consistent";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'inactive'::text;--> statement-breakpoint
UPDATE "projects" SET "status" = 'inactive' WHERE "status" = 'planned';--> statement-breakpoint
DROP TYPE "public"."project_status";--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('inactive', 'active', 'completed', 'archived');--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'inactive'::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "status" SET DATA TYPE "public"."project_status" USING "status"::"public"."project_status";--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_archive_status_consistent" CHECK (("projects"."status" = 'archived') = ("projects"."archived_at" is not null));
