"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardActivityItem } from "@/types";

interface TaskActivityResponse {
	activity: BoardActivityItem[];
}

// Creates an isolated React Query cache key for one task's activity.
function taskActivityQueryKey(projectId: string, taskId: string | null) {
	return ["task-activity", projectId, taskId] as const;
}

// Fetches authorized task activity without loading or combining comments.
async function fetchTaskActivity(
	projectId: string,
	taskId: string,
	signal: AbortSignal,
) {
	const response = await fetch(
		`/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/activity`,
		{ signal },
	);
	if (!response.ok) throw new Error("Task activity could not be loaded.");
	return (await response.json()) as TaskActivityResponse;
}

// Lazily loads and refreshes system activity when its task feed tab is selected.
export function useTaskActivity(
	projectId: string,
	taskId: string | null,
	enabled: boolean,
) {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: taskActivityQueryKey(projectId, taskId),
		queryFn: ({ signal }) =>
			taskId
				? fetchTaskActivity(projectId, taskId, signal)
				: Promise.resolve({ activity: [] }),
		enabled: enabled && taskId !== null,
	});

	// Marks the selected task's activity stale after a successful task mutation.
	function invalidate() {
		return queryClient.invalidateQueries({
			queryKey: taskActivityQueryKey(projectId, taskId),
		});
	}

	return {
		activity: query.data?.activity ?? [],
		error: query.data ? null : (query.error?.message ?? null),
		isLoading: enabled && taskId !== null && query.isLoading,
		refetch: query.refetch,
		invalidate,
	};
}
