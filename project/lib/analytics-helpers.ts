// Pure calculation and date interval helpers

import type {
	AnalyticsDateRange,
	AttentionNeededItem,
	CompletionTrendPoint,
} from "@/types/analytics";

// Calculates whole percentage completion rate, returning 0 when total tasks is 0.
export function calculateCompletionRate(
	completedTasks: number,
	totalTasks: number,
): number {
	if (totalTasks <= 0) return 0;
	return Math.round((completedTasks / totalTasks) * 100);
}

// Formats a Date object to YYYY-MM-DD using UTC values to ensure consistent dates across timezones.
export function formatUtcDateKey(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Formats a YYYY-MM-DD key into a short display label such as "Aug 24".
export function formatShortDateLabel(dateKey: string): string {
	const [yearStr, monthStr, dayStr] = dateKey.split("-");
	if (!yearStr || !monthStr || !dayStr) return dateKey;

	const date = new Date(
		Date.UTC(
			Number.parseInt(yearStr, 10),
			Number.parseInt(monthStr, 10) - 1,
			Number.parseInt(dayStr, 10),
		),
	);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export interface DateRangeWindow {
	startDateKey: string;
	endDateKey: string;
	startDate: Date;
	endDate: Date;
	totalDays: number;
}

// Calculates the inclusive start and end date boundaries for the selected range.
export function getDateRangeWindow(
	range: AnalyticsDateRange,
	referenceDate: Date = new Date(),
): DateRangeWindow {
	const totalDays =
		range === "today" ? 1 : range === "7d" ? 7 : range === "15d" ? 15 : 30;

	// Normalize reference date to UTC midnight
	const endDate = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate(),
			23,
			59,
			59,
			999,
		),
	);

	const startDate = new Date(
		Date.UTC(
			referenceDate.getUTCFullYear(),
			referenceDate.getUTCMonth(),
			referenceDate.getUTCDate() - (totalDays - 1),
			0,
			0,
			0,
			0,
		),
	);

	return {
		startDateKey: formatUtcDateKey(startDate),
		endDateKey: formatUtcDateKey(endDate),
		startDate,
		endDate,
		totalDays,
	};
}

export interface IntervalDefinition {
	key: string;
	label: string;
	startKey: string;
	endKey: string;
}

// Generates one daily interval for each calendar day in the selected range.
export function generateDateIntervalDefinitions(
	range: AnalyticsDateRange,
	referenceDate: Date = new Date(),
): IntervalDefinition[] {
	const window = getDateRangeWindow(range, referenceDate);
	const intervals: IntervalDefinition[] = [];

	for (let i = 0; i < window.totalDays; i++) {
		const dayDate = new Date(
			Date.UTC(
				window.startDate.getUTCFullYear(),
				window.startDate.getUTCMonth(),
				window.startDate.getUTCDate() + i,
			),
		);
		const dateKey = formatUtcDateKey(dayDate);
		intervals.push({
			key: dateKey,
			label: range === "today" ? "Today" : formatShortDateLabel(dateKey),
			startKey: dateKey,
			endKey: dateKey,
		});
	}

	return intervals;
}

// Creates empty trend points for all intervals in the date range.
export function generateEmptyCompletionTrend(
	range: AnalyticsDateRange,
	referenceDate: Date = new Date(),
): CompletionTrendPoint[] {
	const defs = generateDateIntervalDefinitions(range, referenceDate);
	return defs.map((def) => ({
		dateKey: def.key,
		label: def.label,
		completedCount: 0,
	}));
}

// Merges database completion counts into continuous chart intervals, filling empty periods with 0.
export function mergeCompletionCountsIntoIntervals(
	counts: Array<{ dateKey: string; completedCount: number }>,
	range: AnalyticsDateRange,
	referenceDate: Date = new Date(),
): CompletionTrendPoint[] {
	const defs = generateDateIntervalDefinitions(range, referenceDate);
	const countMap = new Map<string, number>();

	for (const item of counts) {
		countMap.set(
			item.dateKey,
			(countMap.get(item.dateKey) ?? 0) + item.completedCount,
		);
	}

	return defs.map((def) => ({
		dateKey: def.key,
		label: def.label,
		completedCount: countMap.get(def.startKey) ?? 0,
	}));
}

export interface AttentionInput {
	overdueTasksCount: number;
	unassignedTasksCount: number;
	stalledProjects: Array<{ id: string; name: string }>;
	highBacklogProjects: Array<{
		id: string;
		name: string;
		incompleteTasks: number;
	}>;
}

// Derives clear actionable insight items with explicit rationale for display.
export function deriveAttentionItems(
	input: AttentionInput,
): AttentionNeededItem[] {
	const items: AttentionNeededItem[] = [];

	// Overdue tasks
	if (input.overdueTasksCount > 0) {
		items.push({
			id: "attention-overdue",
			type: "overdue",
			title: `${input.overdueTasksCount} Overdue Task${input.overdueTasksCount === 1 ? "" : "s"}`,
			description:
				"Active tasks whose due dates have passed without completion.",
			count: input.overdueTasksCount,
			severity: "high",
		});
	}

	// Unassigned tasks
	if (input.unassignedTasksCount > 0) {
		items.push({
			id: "attention-unassigned",
			type: "unassigned",
			title: `${input.unassignedTasksCount} Unassigned Task${input.unassignedTasksCount === 1 ? "" : "s"}`,
			description: "Active incomplete tasks that need an assigned team member.",
			count: input.unassignedTasksCount,
			severity: "medium",
		});
	}

	// Adds projects with unfinished tasks but no recent completions.
	for (const project of input.stalledProjects) {
		items.push({
			id: `attention-stalled-${project.id}`,
			type: "stalled",
			title: `${project.name} Stalled`,
			description:
				"Project has pending work but no currently completed task has a completion date in the selected period.",
			count: 1,
			projectName: project.name,
			severity: "medium",
		});
	}

	// finds active projects with 10 or more unfinished tasks
	for (const project of input.highBacklogProjects) {
		items.push({
			id: `attention-backlog-${project.id}`,
			type: "high_backlog",
			title: `${project.name} Backlog (${project.incompleteTasks} tasks)`,
			description:
				"High volume of 10+ remaining tasks may indicate a workflow bottleneck.",
			count: project.incompleteTasks,
			projectName: project.name,
			severity: "low",
		});
	}

	return items;
}
