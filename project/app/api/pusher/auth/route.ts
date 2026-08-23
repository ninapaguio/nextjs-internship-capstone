import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import { getProjectBoardChannelName } from "@/lib/realtime/project-board";
import { getPusherServer } from "@/lib/realtime/pusher-server";
import { getUserNotificationsChannelName } from "@/lib/realtime/user-notifications";
import { uuidSchema } from "@/lib/validations";

const channelAuthorizationSchema = z.object({
	socket_id: z.string().regex(/^\d+\.\d+$/),
	channel_name: z.string().max(200),
});

// Extracts a UUID only when a channel uses the expected private prefix.
function parseChannelId(channelName: string, prefix: string) {
	return uuidSchema.safeParse(
		channelName.startsWith(prefix) ? channelName.slice(prefix.length) : "",
	);
}

// Authorizes private board and notification channels after checking ownership.
export async function POST(request: Request) {
	const { userId: clerkId } = await auth();
	if (!clerkId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const parsed = channelAuthorizationSchema.safeParse(
		Object.fromEntries(await request.formData()),
	);
	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid channel authorization" },
			{ status: 400 },
		);
	}

	const projectId = parseChannelId(
		parsed.data.channel_name,
		"private-project-",
	);
	const notificationUserId = parseChannelId(
		parsed.data.channel_name,
		"private-user-",
	);
	const isProjectChannel =
		projectId.success &&
		getProjectBoardChannelName(projectId.data) === parsed.data.channel_name;
	const isNotificationChannel =
		notificationUserId.success &&
		getUserNotificationsChannelName(notificationUserId.data) ===
			parsed.data.channel_name;
	if (!isProjectChannel && !isNotificationChannel) {
		return NextResponse.json({ message: "Forbidden" }, { status: 403 });
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);
		if (!applicationUser) {
			return NextResponse.json(
				{ message: "Application user unavailable" },
				{ status: 503 },
			);
		}

		if (isNotificationChannel) {
			if (
				!notificationUserId.success ||
				notificationUserId.data !== applicationUser.id
			) {
				return NextResponse.json({ message: "Forbidden" }, { status: 403 });
			}
		} else {
			if (!projectId.success) {
				return NextResponse.json({ message: "Forbidden" }, { status: 403 });
			}
			const project = await getAccessibleProjectById(
				projectId.data,
				applicationUser.id,
			);
			if (!project) {
				return NextResponse.json({ message: "Forbidden" }, { status: 403 });
			}
		}

		const pusher = getPusherServer();
		if (!pusher) {
			return NextResponse.json(
				{ message: "Real-time service is unavailable" },
				{ status: 503 },
			);
		}

		return NextResponse.json(
			pusher.authorizeChannel(parsed.data.socket_id, parsed.data.channel_name),
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch {
		return NextResponse.json(
			{ message: "Channel authorization failed" },
			{ status: 500 },
		);
	}
}
