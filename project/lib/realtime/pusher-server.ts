import "server-only";

import { eq } from "drizzle-orm";
import Pusher from "pusher";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
	getProjectBoardChannelName,
	PROJECT_BOARD_UPDATED_EVENT,
	type ProjectRealtimeConfig,
} from "@/lib/realtime/project-board";
import {
	getUserNotificationsChannelName,
	USER_NOTIFICATIONS_UPDATED_EVENT,
} from "@/lib/realtime/user-notifications";

interface PusherServerConfig extends ProjectRealtimeConfig {
	appId: string;
	secret: string;
}

let pusherServer: Pusher | null | undefined;

// Reads a complete Pusher configuration without exposing the server secret.
function getPusherServerConfig(): PusherServerConfig | null {
	const appId = process.env.PUSHER_APP_ID;
	const key = process.env.PUSHER_KEY;
	const secret = process.env.PUSHER_SECRET;
	const cluster = process.env.PUSHER_CLUSTER;
	if (!appId || !key || !secret || !cluster) return null;
	return { appId, key, secret, cluster };
}

// Returns the public values needed by an authorized board client.
export function getPusherPublicConfig(): ProjectRealtimeConfig | null {
	const config = getPusherServerConfig();
	return config ? { key: config.key, cluster: config.cluster } : null;
}

// Reuses one server SDK instance when real-time credentials are configured.
export function getPusherServer() {
	if (pusherServer !== undefined) return pusherServer;
	const config = getPusherServerConfig();
	pusherServer = config
		? new Pusher({
				appId: config.appId,
				key: config.key,
				secret: config.secret,
				cluster: config.cluster,
				useTLS: true,
			})
		: null;
	return pusherServer;
}

// Broadcasts the committed revision and leaves recovery to version checks on failure.
export async function publishProjectBoardUpdate(projectId: string) {
	const pusher = getPusherServer();
	if (!pusher) return false;

	try {
		const [project] = await db
			.select({ boardVersion: projects.boardVersion })
			.from(projects)
			.where(eq(projects.id, projectId))
			.limit(1);
		if (!project) return false;

		await pusher.trigger(
			getProjectBoardChannelName(projectId),
			PROJECT_BOARD_UPDATED_EVENT,
			{ projectId, boardVersion: project.boardVersion },
		);
		return true;
	} catch {
		return false;
	}
}

// Notifies each recipient to reload personal notifications from Neon.
export async function publishUserNotificationUpdates(
	recipientUserIds: string[],
) {
	const pusher = getPusherServer();
	const uniqueRecipientIds = [...new Set(recipientUserIds)];
	if (!pusher || uniqueRecipientIds.length === 0) return false;

	try {
		await Promise.all(
			uniqueRecipientIds.map((recipientUserId) =>
				pusher.trigger(
					getUserNotificationsChannelName(recipientUserId),
					USER_NOTIFICATIONS_UPDATED_EVENT,
					{ recipientUserId },
				),
			),
		);
		return true;
	} catch {
		return false;
	}
}
