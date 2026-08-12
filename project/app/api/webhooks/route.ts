import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
	softDeleteApplicationUser,
	upsertApplicationUser,
} from "@/lib/db/mutations/users";
import { recordWebhookEvent } from "@/lib/db/mutations/webhook-events";
import { hasProcessedWebhookEvent } from "@/lib/db/queries/webhook-events";
import { userSchema } from "@/lib/validations";

const deliveryIdSchema = z.string().trim().min(1).max(255);

// Selects the primary Clerk email address with a safe first-address fallback.
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

// Synchronizes clerk user lifecycle events while preventing duplicate webhook processing.
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

		const processedEvent = await hasProcessedWebhookEvent(deliveryId.data);

		if (processedEvent) {
			return new Response("Webhook already processed", { status: 200 });
		}

		if (event.type === "user.created" || event.type === "user.updated") {
			const parsedUser = userSchema.safeParse({
				clerkId: event.data.id,
				email: primaryEmail(event.data),
				username: event.data.username ?? `user_${event.data.id}`,
				firstName: event.data.first_name ?? undefined,
				lastName: event.data.last_name ?? undefined,
				imageUrl: event.data.image_url,
			});

			if (!parsedUser.success) {
				return new Response("Invalid Clerk user data", { status: 422 });
			}

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
			await upsertApplicationUser(parsedUser.data, {
				preserveExistingImageWhenMissing: true,
			});
		}

		if (event.type === "user.deleted" && event.data.id) {
			await softDeleteApplicationUser(event.data.id);
		}

		await recordWebhookEvent(deliveryId.data, event.type);

		return new Response("Webhook received", { status: 200 });
	} catch (error) {
		console.error("clerk_webhook_processing_failed", {
			message: error instanceof Error ? error.message : "Unknown error",
		});
		return new Response("Webhook processing failed", { status: 500 });
	}
}
