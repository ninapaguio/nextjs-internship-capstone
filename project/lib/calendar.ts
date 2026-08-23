import type { CalendarTaskItem } from "@/types";

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MAX_VISIBLE_TASKS = 3;

// Formats a local calendar day as YYYY-MM-DD for timezone-free database date fields
// since tasks and project deadlines are stored only as YYYY-MM-DD
export function formatDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

// Parses a YYYY-MM-DD string safely into a local Date without timezone offset shifts
export function parseDateString(dateStr: string): Date {
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	if (yearStr && monthStr && dayStr) {
		return new Date(
			Number.parseInt(yearStr, 10),
			Number.parseInt(monthStr, 10) - 1,
			Number.parseInt(dayStr, 10),
		);
	}
	return new Date(dateStr);
}

// Checks whether two Date objects represent the same calendar day
export function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

// Returns every day that should appear on the month-view calendar grid.
export function getCalendarDays(year: number, month: number): Date[] {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startOffset = firstDay.getDay();
	const endOffset = 6 - lastDay.getDay();

	const days: Date[] = [];

	// Leading days from the previous month
	for (let i = startOffset - 1; i >= 0; i--) {
		days.push(new Date(year, month, -i));
	}

	// Days of the current month
	for (let d = 1; d <= lastDay.getDate(); d++) {
		days.push(new Date(year, month, d));
	}

	// Trailing days from the next month
	for (let i = 1; i <= endOffset; i++) {
		days.push(new Date(year, month + 1, i));
	}

	return days;
}

// Returns the 7 days of the week containing the given date
export function getWeekDays(date: Date): Date[] {
	const dayOfWeek = date.getDay();
	const start = new Date(date);
	start.setDate(date.getDate() - dayOfWeek);

	const days: Date[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		days.push(d);
	}
	return days;
}

// Formats a Date as "August 2026" for the month view header
export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Formats a week range
export function formatWeekRange(days: Date[]): string {
	const first = days[0];
	const last = days[6];
	const firstMonth = first.toLocaleDateString("en-US", { month: "short" });
	const lastMonth = last.toLocaleDateString("en-US", { month: "short" });
	const year = last.getFullYear();

	if (first.getMonth() === last.getMonth()) {
		return `${firstMonth} ${first.getDate()} – ${last.getDate()}, ${year}`;
	}
	return `${firstMonth} ${first.getDate()} – ${lastMonth} ${last.getDate()}, ${year}`;
}

// Builds a lookup map from local YYYY-MM-DD keys to sorted tasks
export function buildTaskMap(
	tasks: CalendarTaskItem[],
): Map<string, CalendarTaskItem[]> {
	const map = new Map<string, CalendarTaskItem[]>();
	for (const task of tasks) {
		const list = map.get(task.date) ?? [];
		list.push(task);
		map.set(task.date, list);
	}

	for (const tasksForDay of map.values()) {
		tasksForDay.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			return a.title.localeCompare(b.title);
		});
	}
	return map;
}
