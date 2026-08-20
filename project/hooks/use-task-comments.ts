"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardComment } from "@/types";

interface TaskCommentsResponse {
	comments: BoardComment[];
}

// Creates an isolated React Query cache key for one task's comments.
function taskCommentsQueryKey(projectId: string, taskId: string | null) {
	return ["task-comments", projectId, taskId] as const;
}

// Fetches comments after the task panel opens and the API authorizes access.
async function fetchTaskComments(
	projectId: string,
	taskId: string,
	signal: AbortSignal,
) {
	const response = await fetch(
		`/api/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/comments`,
		{ signal },
	);
	if (!response.ok) throw new Error("Comments could not be loaded.");
	return (await response.json()) as TaskCommentsResponse;
}

// Lazily loads, caches, retries, and updates comments for the selected task.
export function useTaskComments(projectId: string, taskId: string | null) {
	const queryClient = useQueryClient();
	const query = useQuery({
		queryKey: taskCommentsQueryKey(projectId, taskId),
		queryFn: ({ signal }) =>
			taskId
				? fetchTaskComments(projectId, taskId, signal)
				: Promise.resolve({ comments: [] }),
		enabled: taskId !== null,
	});

	// Adds a persisted comment to the matching task cache without duplicates.
	function recordComment(commentTaskId: string, comment: BoardComment) {
		queryClient.setQueryData<TaskCommentsResponse>(
			taskCommentsQueryKey(projectId, commentTaskId),
			(current) => {
				if (!current) return { comments: [comment] };
				if (current.comments.some((item) => item.id === comment.id)) {
					return current;
				}
				return { comments: [...current.comments, comment] };
			},
		);
	}

	return {
		comments: query.data?.comments ?? [],
		error: query.data ? null : (query.error?.message ?? null),
		isLoading: taskId !== null && query.isLoading,
		refetch: query.refetch,
		recordComment,
	};
}
