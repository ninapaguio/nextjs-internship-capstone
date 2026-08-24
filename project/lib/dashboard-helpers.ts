// Calculates whether a task is overdue or due today.
export function calculateDueDateState(
	dueDate: string | null,
	todayKey: string,
): { isOverdue: boolean; isDueToday: boolean } {
	if (!dueDate) {
		return { isOverdue: false, isDueToday: false };
	}

	const isOverdue = dueDate < todayKey;
	const isDueToday = dueDate === todayKey;

	return { isOverdue, isDueToday };
}

// Normalizes priority keys to standard low, medium, or high values.
export function normalizePriorityKey(
	rawKey: string | null | undefined,
): "low" | "medium" | "high" {
	if (rawKey === "high") return "high";
	if (rawKey === "low") return "low";
	return "medium";
}

// Formats actor display name with fallback for unnamed and deleted accounts.
export function formatActorDisplayName(
	firstName: string | null | undefined,
	lastName: string | null | undefined,
	isDeleted: boolean,
): string {
	if (isDeleted) {
		return "Former member";
	}

	const name = [firstName, lastName].filter(Boolean).join(" ").trim();
	if (name.length > 0) {
		return name;
	}

	return "Team member";
}

// Formats an ISO timestamp into a concise human-readable relative label.
export function formatRelativeTime(
	isoString: string,
	now: Date = new Date(),
): string {
	const timestamp = new Date(isoString).getTime();
	if (Number.isNaN(timestamp)) return "";

	const diffSeconds = Math.round((now.getTime() - timestamp) / 1000);

	if (diffSeconds < 60) {
		return "just now";
	}

	const minutes = Math.floor(diffSeconds / 60);
	if (minutes < 60) {
		return `${minutes}m ago`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h ago`;
	}

	const days = Math.floor(hours / 24);
	if (days === 1) {
		return "yesterday";
	}
	if (days < 7) {
		return `${days}d ago`;
	}

	const weeks = Math.floor(days / 7);
	if (weeks < 4) {
		return `${weeks}w ago`;
	}

	const date = new Date(isoString);
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Builds a short, readable description sentence for dashboard activity entries.
export function describeDashboardActivity(
	action: string,
	fieldName?: string | null,
	oldValue?: unknown,
	newValue?: unknown,
): string {
	const oldStr =
		typeof oldValue === "string"
			? oldValue
			: oldValue != null
				? String(oldValue)
				: null;
	const newStr =
		typeof newValue === "string"
			? newValue
			: newValue != null
				? String(newValue)
				: null;

	switch (action) {
		case "created":
			return "created this task";
		case "completed":
			return "completed this task";
		case "moved":
			return newStr ? `moved to ${newStr}` : "moved this task";
		case "assigned":
			return newStr ? `assigned to ${newStr}` : "assigned a member";
		case "unassigned":
			return oldStr ? `unassigned ${oldStr}` : "removed an assignee";
		case "updated":
			if (fieldName === "title") {
				return newStr ? `renamed to “${newStr}”` : "updated title";
			}
			if (fieldName === "due_date") {
				return newStr ? `set due date to ${newStr}` : "updated due date";
			}
			if (fieldName === "priority") {
				return newStr ? `changed priority to ${newStr}` : "changed priority";
			}
			return `updated ${fieldName || "task"}`;
		default:
			return "updated this task";
	}
}
