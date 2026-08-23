"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { UIEvent } from "react";
import {
	markAllNotificationsRead,
	markNotificationRead,
} from "@/actions/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/use-notifications";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/types";

interface NotificationPanelProps {
	applicationUserId: string;
	realtimeConfig: ProjectRealtimeConfig | null;
}

// feedback notifs
function getNotificationMessage(notification: NotificationItem) {
	switch (notification.type) {
		case "task_assigned":
			return `${notification.actorName} assigned you to “${notification.taskTitle}”.`;
		case "task_unassigned":
			return `${notification.actorName} removed you from “${notification.taskTitle}”.`;
		case "task_unblocked":
			return `“${notification.taskTitle}” is no longer blocked.`;
		case "assigned_task_commented":
			return `${notification.actorName} commented on “${notification.taskTitle}”.`;
	}
}

// Formats time
function getRelativeTime(createdAt: string) {
	const elapsedMinutes = Math.max(
		0,
		Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000),
	);
	if (elapsedMinutes < 1) return "Just now";
	if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
	const hours = Math.floor(elapsedMinutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

// Returns readable initials when an actor has no profile image.
function getInitials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase();
}

// Displays recent personal notifications and loads another page near the scroll end.
export function NotificationPanel({
	applicationUserId,
	realtimeConfig,
}: NotificationPanelProps) {
	const notifications = useNotifications(applicationUserId, realtimeConfig);
	const items = notifications.data?.pages.flatMap((page) => page.items) ?? [];
	const unreadCount = notifications.data?.pages[0]?.unreadCount ?? 0;

	// Requests the next five rows only after the user scrolls near the bottom.
	function loadMoreOnScroll(event: UIEvent<HTMLDivElement>) {
		const container = event.currentTarget;
		const distanceFromBottom =
			container.scrollHeight - container.scrollTop - container.clientHeight;
		if (
			container.scrollTop > 0 &&
			distanceFromBottom < 48 &&
			notifications.hasNextPage &&
			!notifications.isFetchingNextPage
		) {
			void notifications.fetchNextPage();
		}
	}

	// marks when clicked
	function readNotification(notification: NotificationItem) {
		if (notification.readAt) return;
		notifications.updateReadState(notification.id);
		void markNotificationRead(notification.id);
	}

	// Clears the visible unread count immediately
	function readAllNotifications() {
		if (unreadCount === 0) return;
		notifications.updateReadState();
		void markAllNotificationsRead();
	}

	return (
		<PopoverTrigger>
			<Button
				variant="outline"
				size="icon-sm"
				aria-label={
					unreadCount > 0
						? `View notifications, ${unreadCount} unread`
						: "View notifications"
				}
				className="pointer-events-auto relative rounded-full bg-background/95 shadow-sm backdrop-blur"
			>
				<Bell />
				{unreadCount > 0 ? (
					<span className="absolute -right-1.5 -top-1.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4.5 text-white shadow-xs">
						{unreadCount > 99 ? "99+" : unreadCount}
					</span>
				) : null}
			</Button>
			<Popover
				placement="bottom end"
				className="w-[min(25rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0 shadow-lg"
			>
				<PopoverHeader className="flex-row items-center justify-between border-b px-4 py-3">
					<div>
						<PopoverTitle>Notifications</PopoverTitle>
						<p className="text-xs text-muted-foreground">
							From the last 3 days
						</p>
					</div>
					{unreadCount > 0 ? (
						<Button variant="ghost" size="xs" onPress={readAllNotifications}>
							Mark all read
						</Button>
					) : null}
				</PopoverHeader>

				<div className="max-h-80 overflow-y-auto" onScroll={loadMoreOnScroll}>
					{notifications.isPending ? (
						<div
							className="space-y-3 p-4"
							role="status"
							aria-label="Loading notifications"
						>
							{["first", "second", "third", "fourth", "fifth"].map((key) => (
								<div key={key} className="flex gap-3">
									<Skeleton className="size-9 shrink-0 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-3 w-full" />
										<Skeleton className="h-3 w-2/3" />
									</div>
								</div>
							))}
						</div>
					) : notifications.isError ? (
						<div className="p-6 text-center">
							<p className="text-sm text-destructive">
								Notifications could not be loaded.
							</p>
							<Button
								variant="ghost"
								size="sm"
								onPress={() => notifications.refetch()}
							>
								Try again
							</Button>
						</div>
					) : items.length === 0 ? (
						<div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
							<span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
								<BellOff className="size-5" />
							</span>
							<p className="text-sm font-medium">No recent notifications</p>
							<p className="text-xs text-muted-foreground">
								Task updates addressed to you will appear here.
							</p>
						</div>
					) : (
						<div className="divide-y">
							{items.map((notification) => (
								<Link
									key={notification.id}
									href={notification.href}
									onClick={() => readNotification(notification)}
									className={cn(
										"relative flex min-h-18 gap-3 px-4 py-3 transition-colors hover:bg-muted/70",
										!notification.readAt && "bg-brand_teal-500/5",
									)}
								>
									{!notification.readAt ? (
										<span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-brand_teal-500" />
									) : null}
									<Avatar className="mt-0.5 size-9">
										{notification.actorImageUrl ? (
											<AvatarImage src={notification.actorImageUrl} alt="" />
										) : null}
										<AvatarFallback>
											{getInitials(notification.actorName)}
										</AvatarFallback>
									</Avatar>
									<span className="min-w-0 flex-1">
										<span className="block text-sm leading-5">
											{getNotificationMessage(notification)}
										</span>
										<span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
											<span className="truncate">
												{notification.projectName}
											</span>
											<time
												dateTime={notification.createdAt}
												className="shrink-0"
											>
												{getRelativeTime(notification.createdAt)}
											</time>
										</span>
									</span>
								</Link>
							))}
							<div className="grid min-h-12 place-items-center">
								{notifications.isFetchingNextPage ? (
									<LoaderCircle
										className="size-4 animate-spin text-muted-foreground"
										aria-label="Loading more notifications"
									/>
								) : notifications.hasNextPage ? (
									<span className="text-xs text-muted-foreground">
										Scroll for more
									</span>
								) : (
									<span className="text-xs text-muted-foreground">
										You’re all caught up
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			</Popover>
		</PopoverTrigger>
	);
}
