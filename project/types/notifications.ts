export type NotificationKind =
	| "task_assigned"
	| "task_unassigned"
	| "task_unblocked"
	| "assigned_task_commented";

export interface NotificationItem {
	id: string;
	type: NotificationKind;
	actorName: string;
	actorImageUrl: string | null;
	projectName: string;
	taskTitle: string;
	href: string;
	readAt: string | null;
	createdAt: string;
}

export interface NotificationPage {
	items: NotificationItem[];
	unreadCount: number;
	nextCursor: { createdAt: string; id: string } | null;
}
