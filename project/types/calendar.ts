export type CalendarView = "month" | "week";

// Represents a single calendar task or project deadline
export interface CalendarTaskItem {
	id: string;
	title: string;
	date: string;
	type: "task" | "project_deadline" | "project_start";
	projectName: string;
	priority?: "low" | "medium" | "high";
	isCompleted?: boolean;
	href?: string;
}

export type CalendarDeadlineType =
	| "project"
	| "task-low"
	| "task-medium"
	| "task-high";

export interface UpcomingDeadlineItem {
	id: string;
	title: string;
	project: string;
	projectHref?: string;
	type: CalendarDeadlineType;
	date: string;
	rawDate: string;
	assignee: string;
	priority?: "low" | "medium" | "high";
	href?: string;
}

// Complete calendar payload loaded
export interface CalendarData {
	tasks: CalendarTaskItem[];
	upcomingDeadlines: UpcomingDeadlineItem[];
}

export interface CalendarTaskDestination {
	id: string;
	name: string;
	columns: Array<{ id: string; name: string }>;
	labels: Array<{ id: string; name: string; color: string }>;
}

// reference data used to create a task outside the Kanban board
export interface CalendarTaskCreationOptions {
	currentUserId: string;
	projects: CalendarTaskDestination[];
	priorities: Array<{ id: string; label: string }>;
}
