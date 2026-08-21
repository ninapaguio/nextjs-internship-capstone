ALTER TABLE "complexity_options" RENAME TO "priority_options";--> statement-breakpoint
ALTER TABLE "tasks" RENAME COLUMN "complexity_id" TO "priority_id";--> statement-breakpoint
ALTER TABLE "priority_options" DROP CONSTRAINT "complexity_options_sort_order_positive";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_complexity_id_complexity_options_id_fk";
--> statement-breakpoint
DROP INDEX "complexity_options_key_unique";--> statement-breakpoint
DROP INDEX "complexity_options_sort_order_unique";--> statement-breakpoint
DROP INDEX "tasks_complexity_id_idx";--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_id_priority_options_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priority_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "priority_options_key_unique" ON "priority_options" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "priority_options_sort_order_unique" ON "priority_options" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "tasks_priority_id_idx" ON "tasks" USING btree ("priority_id");--> statement-breakpoint
ALTER TABLE "priority_options" ADD CONSTRAINT "priority_options_sort_order_positive" CHECK ("priority_options"."sort_order" > 0);
