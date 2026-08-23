import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import { getProjectBoardChannelName } from "@/lib/realtime/project-board";
import { getPusherServer } from "@/lib/realtime/pusher-server";
import { uuidSchema } from "@/lib/validations";

const channelAuthorizationSchema = z.object({
	socket_id: z.string().regex(/^\d+\.\d+$/),
	channel_name: z.string().max(200),
});

// Authorizes one private Pusher channel after checking Project membership.
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

	const channelPrefix = "private-project-";
	const projectId = uuidSchema.safeParse(
		parsed.data.channel_name.startsWith(channelPrefix)
			? parsed.data.channel_name.slice(channelPrefix.length)
			: "",
	);
	if (
		!projectId.success ||
		getProjectBoardChannelName(projectId.data) !== parsed.data.channel_name
	) {
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

		const project = await getAccessibleProjectById(
			projectId.data,
			applicationUser.id,
		);
		if (!project) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
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
