import { sql } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// Users synchronized from Clerk
// Clerk owns passwords and sessions; this table stores application profile data
export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		clerkId: text("clerk_id").notNull(),
		email: text("email").notNull(),
		username: varchar("username", { length: 100 }).notNull(),
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
		uniqueIndex("users_active_email_unique")
			.on(sql`lower(${table.email})`)
			.where(sql`${table.deletedAt} is null`),
		uniqueIndex("users_active_username_unique")
			.on(sql`lower(${table.username})`)
			.where(sql`${table.deletedAt} is null`),
	],
);

// Clerk retries are made idempotent by recording the delivery ID
export const webhookEvents = pgTable("webhook_events", {
	id: text("id").primaryKey(),
	eventType: text("event_type").notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
