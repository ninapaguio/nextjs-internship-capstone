import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, webhookEvents } from "@/lib/db/schema";
import { userSchema } from "@/lib/validations";

const deliveryIdSchema = z.string().trim().min(1).max(255);

function primaryEmail(data: {
	primary_email_address_id: string | null;
	email_addresses: Array<{ id: string; email_address: string }>;
}) {
	return (
		data.email_addresses.find(
			(email) => email.id === data.primary_email_address_id,
		)?.email_address ?? data.email_addresses[0]?.email_address
	);
}

export async function POST(req: NextRequest) {
	let event: Awaited<ReturnType<typeof verifyWebhook>>;

	try {
		event = await verifyWebhook(req);
	} catch {
		return new Response("Invalid webhook signature", { status: 400 });
	}

	try {
		const deliveryId = deliveryIdSchema.safeParse(req.headers.get("svix-id"));

		if (!deliveryId.success) {
			return new Response("Invalid webhook delivery ID", { status: 400 });
		}

		const [processedEvent] = await db
			.select({ id: webhookEvents.id })
			.from(webhookEvents)
			.where(eq(webhookEvents.id, deliveryId.data))
			.limit(1);

		if (processedEvent) {
			return new Response("Webhook already processed", { status: 200 });
		}

		if (event.type === "user.created" || event.type === "user.updated") {
			const parsedUser = userSchema.safeParse({
				clerkId: event.data.id,
				email: primaryEmail(event.data),
				username: event.data.username,
				firstName: event.data.first_name ?? undefined,
				lastName: event.data.last_name ?? undefined,
				imageUrl: event.data.image_url,
			});

			if (!parsedUser.success) {
				return new Response("Invalid Clerk user data", { status: 422 });
			}

			const now = new Date();
			const imageUrlWasSkipped =
				Boolean(event.data.image_url) && parsedUser.data.imageUrl === undefined;

			// to keep the webhook successful when only Clerk's image URL is invalid
			// but leave a diagnostic without logging the URL itself
			if (imageUrlWasSkipped) {
				console.warn("clerk_user_image_skipped", {
					clerkUserId: event.data.id,
				});
			}

			// exclude an invalid image on updates preserves the last valid image
			const imageUpdate =
				parsedUser.data.imageUrl === undefined
					? {}
					: { imageUrl: parsedUser.data.imageUrl };

			await db
				.insert(users)
				.values({
					...parsedUser.data,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: users.clerkId,
					set: {
						email: parsedUser.data.email,
						username: parsedUser.data.username,
						firstName: parsedUser.data.firstName,
						lastName: parsedUser.data.lastName,
						...imageUpdate,
						updatedAt: now,
						deletedAt: null,
					},
				});
		}

		if (event.type === "user.deleted" && event.data.id) {
			const now = new Date();

			await db
				.update(users)
				.set({ deletedAt: now, updatedAt: now })
				.where(eq(users.clerkId, event.data.id));
		}

		await db
			.insert(webhookEvents)
			.values({ id: deliveryId.data, eventType: event.type })
			.onConflictDoNothing();

		return new Response("Webhook received", { status: 200 });
	} catch {
		return new Response("Webhook processing failed", { status: 500 });
	}
}
