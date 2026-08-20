DROP INDEX "tasks_active_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "tasks_active_idx" ON "tasks" USING btree ("project_id") WHERE "tasks"."archived_at" is null and "tasks"."deleted_at" is null;