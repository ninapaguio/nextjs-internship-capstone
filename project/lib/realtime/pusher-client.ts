"use client";

import type Pusher from "pusher-js";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";

let clientPromise: Promise<Pusher> | null = null;
let clientKey: string | null = null;

// Shares one Pusher connection between board and notification subscriptions.
export function getPusherClient(config: ProjectRealtimeConfig) {
	const key = `${config.key}:${config.cluster}`;
	if (clientPromise && clientKey === key) return clientPromise;

	clientKey = key;
	clientPromise = import("pusher-js").then(
		({ default: PusherClient }) =>
			new PusherClient(config.key, {
				cluster: config.cluster,
				forceTLS: true,
				channelAuthorization: {
					endpoint: "/api/pusher/auth",
					transport: "ajax",
				},
			}),
	);
	return clientPromise;
}
