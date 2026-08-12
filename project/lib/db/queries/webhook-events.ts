import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

// Checks whether a webhook delivery has already been processed.
export async function hasProcessedWebhookEvent(deliveryId: string) {
	const [event] = await db
		.select({ id: webhookEvents.id })
		.from(webhookEvents)
		.where(eq(webhookEvents.id, deliveryId))
		.limit(1);

	return Boolean(event);
}
