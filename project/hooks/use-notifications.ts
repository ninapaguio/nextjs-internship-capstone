"use client";

import {
	type InfiniteData,
	useInfiniteQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";
import { getPusherClient } from "@/lib/realtime/pusher-client";
import {
	getUserNotificationsChannelName,
	USER_NOTIFICATIONS_UPDATED_EVENT,
} from "@/lib/realtime/user-notifications";
import type { NotificationPage } from "@/types";

interface NotificationCursor {
	createdAt: string;
	id: string;
}

const notificationEventSchema = z.object({
	recipientUserId: z.string().uuid(),
});

// Creates the one cache key shared by the notification bell and panel.
function notificationQueryKey(applicationUserId: string) {
	return ["notifications", applicationUserId] as const;
}

// Loads using its stable date-and-ID cursor.
async function fetchNotifications(cursor: NotificationCursor | null) {
	const searchParams = new URLSearchParams();
	if (cursor) {
		searchParams.set("cursorCreatedAt", cursor.createdAt);
		searchParams.set("cursorId", cursor.id);
	}
	const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
	const response = await fetch(`/api/notifications${query}`, {
		cache: "no-store",
	});
	if (!response.ok) throw new Error("Notifications could not be loaded.");
	return (await response.json()) as NotificationPage;
}

// Loads listens for personal updates.
export function useNotifications(
	applicationUserId: string,
	realtimeConfig: ProjectRealtimeConfig | null,
) {
	const queryClient = useQueryClient();
	const queryKey = useMemo(
		() => notificationQueryKey(applicationUserId),
		[applicationUserId],
	);
	const query = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam }) => fetchNotifications(pageParam),
		initialPageParam: null as NotificationCursor | null,
		getNextPageParam: (page) => page.nextCursor,
		staleTime: 15_000,
	});

	useEffect(() => {
		if (!realtimeConfig) return;
		let disposed = false;
		let cleanup: (() => void) | null = null;
		void getPusherClient(realtimeConfig)
			.then((pusher) => {
				if (disposed) return;
				const channelName = getUserNotificationsChannelName(applicationUserId);
				const channel = pusher.subscribe(channelName);
				const handleUpdate = (event: unknown) => {
					const parsed = notificationEventSchema.safeParse(event);
					if (
						!parsed.success ||
						parsed.data.recipientUserId !== applicationUserId
					) {
						return;
					}
					void queryClient.resetQueries({ queryKey, exact: true });
					toast.info("You have a new task notification.");
				};
				channel.bind(USER_NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
				cleanup = () => {
					channel.unbind(USER_NOTIFICATIONS_UPDATED_EVENT, handleUpdate);
					pusher.unsubscribe(channelName);
				};
			})
			.catch(() => {
				toast.error("Having trouble loading notifications.");
			});

		return () => {
			disposed = true;
			cleanup?.();
		};
	}, [applicationUserId, queryClient, queryKey, realtimeConfig]);

	// Updates read state locally without reloading every page already viewed.
	function updateReadState(notificationId?: string) {
		queryClient.setQueryData<InfiniteData<NotificationPage>>(
			queryKey,
			(data) => {
				if (!data) return data;
				const now = new Date().toISOString();
				let newlyReadCount = 0;
				const pages = data.pages.map((page) => ({
					...page,
					items: page.items.map((item) => {
						if (item.readAt || (notificationId && item.id !== notificationId)) {
							return item;
						}
						newlyReadCount += 1;
						return { ...item, readAt: now };
					}),
				}));
				return {
					...data,
					pages: pages.map((page) => ({
						...page,
						unreadCount: notificationId
							? Math.max(0, page.unreadCount - newlyReadCount)
							: 0,
					})),
				};
			},
		);
	}

	return { ...query, updateReadState };
}
