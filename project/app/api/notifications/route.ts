import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getNotificationPage } from "@/lib/db/queries/notifications";
import { uuidSchema } from "@/lib/validations";

const notificationCursorSchema = z.object({
	createdAt: z.iso.datetime(),
	id: uuidSchema,
});

// Returns one authorized notification page from the current user's recent window.
export async function GET(request: Request) {
	const { userId: clerkId } = await auth();
	if (!clerkId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const searchParams = new URL(request.url).searchParams;
	const hasCursor =
		searchParams.has("cursorCreatedAt") || searchParams.has("cursorId");
	const cursor = hasCursor
		? notificationCursorSchema.safeParse({
				createdAt: searchParams.get("cursorCreatedAt"),
				id: searchParams.get("cursorId"),
			})
		: null;
	if (cursor && !cursor.success) {
		return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);
		if (!applicationUser) {
			return NextResponse.json(
				{ message: "Application user unavailable" },
				{ status: 503 },
			);
		}
		const page = await getNotificationPage(
			applicationUser.id,
			cursor?.success
				? { createdAt: new Date(cursor.data.createdAt), id: cursor.data.id }
				: undefined,
		);
		return NextResponse.json(page, {
			headers: { "Cache-Control": "private, no-store" },
		});
	} catch {
		return NextResponse.json(
			{ message: "Notifications could not be loaded" },
			{ status: 500 },
		);
	}
}
