import "server-only";

import { db } from "@/lib/db";
import { webhookEvents } from "@/lib/db/schema";

// Records a processed webhook delivery so Clerk retries remain duplicate safe.
export async function recordWebhookEvent(
	deliveryId: string,
	eventType: string,
) {
	await db
		.insert(webhookEvents)
		.values({ id: deliveryId, eventType })
		.onConflictDoNothing();
}
