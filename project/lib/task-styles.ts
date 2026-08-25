import type { CalendarDeadlineType, CalendarTaskItem } from "@/types";

/** Label and styling configuration for upcoming deadline types */
export const DEADLINE_TYPE_CONFIG: Record<
	CalendarDeadlineType,
	{ label: string; className: string }
> = {
	project: {
		label: "Project Deadline",
		className:
			"bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
	},
	"task-high": { label: "High", className: "priority-badge-high" },
	"task-medium": { label: "Medium", className: "priority-badge-medium" },
	"task-low": { label: "Low", className: "priority-badge-low" },
};

/** Priority-based color variants used for calendar task bars and cards */
export const PRIORITY_TASK_COLORS: Record<"low" | "medium" | "high", string> = {
	low: "priority-task-low",
	medium: "priority-task-medium",
	high: "priority-task-high",
};

/** Priority badge styling used across calendar views and cards */
export const PRIORITY_BADGES: Record<string, string> = {
	low: "priority-badge-low",
	medium: "priority-badge-medium",
	high: "priority-badge-high",
};

// Returns task styling based on priority, with fallbacks for project milestones.
export function getTaskColorClass(task: CalendarTaskItem): string {
	if (task.priority && PRIORITY_TASK_COLORS[task.priority]) {
		return PRIORITY_TASK_COLORS[task.priority];
	}
	if (task.type === "project_deadline") {
		return "bg-rose-50 text-rose-800 border-l-2 border-rose-500 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-400";
	}
	if (task.type === "project_start") {
		return "bg-indigo-50 text-indigo-800 border-l-2 border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-400";
	}
	return "bg-brand_navy-50 text-brand_navy-700 border-l-2 border-brand_navy-500 dark:bg-brand_navy-900/50 dark:text-brand_navy-200 dark:border-brand_navy-400";
}
