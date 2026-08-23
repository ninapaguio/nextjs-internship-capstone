import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { lists, taskAssignees, taskDependencies, tasks } from "@/lib/db/schema";

interface TaskRelationshipChange {
	projectId: string;
	taskId: string;
	completed?: boolean;
	dependencyIds?: string[];
	blockingTaskIds?: string[];
}

// Finds unfinished tasks that move from blocked to unblocked after one task update.
export async function findNewlyUnblockedTaskIds({
	projectId,
	taskId,
	completed,
	dependencyIds,
	blockingTaskIds,
}: TaskRelationshipChange) {
	if (
		completed !== true &&
		dependencyIds === undefined &&
		blockingTaskIds === undefined
	) {
		return [];
	}

	const currentDependentRows =
		completed === true || blockingTaskIds !== undefined
			? await db
					.select({ taskId: taskDependencies.taskId })
					.from(taskDependencies)
					.where(
						and(
							eq(taskDependencies.projectId, projectId),
							eq(taskDependencies.dependsOnTaskId, taskId),
						),
					)
			: [];
	const candidateIds = [
		...new Set([
			...(dependencyIds !== undefined ? [taskId] : []),
			...currentDependentRows.map((row) => row.taskId),
			...(blockingTaskIds ?? []),
		]),
	];
	if (candidateIds.length === 0) return [];

	const dependencyTask = alias(tasks, "notification_dependency_task");
	const dependencyList = alias(lists, "notification_dependency_list");
	const [candidateRows, edgeRows] = await Promise.all([
		db
			.select({ id: tasks.id })
			.from(tasks)
			.innerJoin(
				lists,
				and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
			)
			.where(
				and(
					eq(tasks.projectId, projectId),
					inArray(tasks.id, candidateIds),
					isNull(tasks.completedAt),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(lists.archivedAt),
					isNull(lists.deletedAt),
				),
			),
		db
			.select({
				taskId: taskDependencies.taskId,
				dependsOnTaskId: taskDependencies.dependsOnTaskId,
				dependencyCompletedAt: dependencyTask.completedAt,
			})
			.from(taskDependencies)
			.innerJoin(
				dependencyTask,
				eq(taskDependencies.dependsOnTaskId, dependencyTask.id),
			)
			.innerJoin(
				dependencyList,
				and(
					eq(dependencyTask.listId, dependencyList.id),
					eq(dependencyTask.projectId, dependencyList.projectId),
				),
			)
			.where(
				and(
					eq(taskDependencies.projectId, projectId),
					inArray(taskDependencies.taskId, candidateIds),
					isNull(dependencyTask.archivedAt),
					isNull(dependencyTask.deletedAt),
					isNull(dependencyList.archivedAt),
					isNull(dependencyList.deletedAt),
				),
			),
	]);
	const activeCandidateIds = new Set(candidateRows.map((row) => row.id));
	if (completed === true) activeCandidateIds.delete(taskId);

	const dependencyIdsToLoad = [
		...new Set([
			...edgeRows.map((row) => row.dependsOnTaskId),
			...(dependencyIds ?? []),
			taskId,
		]),
	];
	const dependencyStatusRows = await db
		.select({ id: tasks.id, completedAt: tasks.completedAt })
		.from(tasks)
		.where(
			and(
				eq(tasks.projectId, projectId),
				inArray(tasks.id, dependencyIdsToLoad),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
			),
		);
	const beforeCompletion = new Map(
		dependencyStatusRows.map((row) => [row.id, Boolean(row.completedAt)]),
	);
	const afterCompletion = new Map(beforeCompletion);
	if (completed !== undefined) afterCompletion.set(taskId, completed);

	const beforeEdges = new Map<string, Set<string>>();
	for (const edge of edgeRows) {
		const current = beforeEdges.get(edge.taskId) ?? new Set<string>();
		current.add(edge.dependsOnTaskId);
		beforeEdges.set(edge.taskId, current);
	}
	const afterEdges = new Map(
		[...beforeEdges].map(([id, edges]) => [id, new Set(edges)]),
	);
	if (dependencyIds !== undefined) {
		afterEdges.set(taskId, new Set(dependencyIds));
	}
	if (blockingTaskIds !== undefined) {
		for (const candidateId of candidateIds) {
			afterEdges.get(candidateId)?.delete(taskId);
		}
		for (const blockingTaskId of blockingTaskIds) {
			const current = afterEdges.get(blockingTaskId) ?? new Set<string>();
			current.add(taskId);
			afterEdges.set(blockingTaskId, current);
		}
	}

	return [...activeCandidateIds].filter((candidateId) => {
		const wasBlocked = [...(beforeEdges.get(candidateId) ?? [])].some(
			(dependencyId) => beforeCompletion.get(dependencyId) === false,
		);
		const remainsBlocked = [...(afterEdges.get(candidateId) ?? [])].some(
			(dependencyId) => afterCompletion.get(dependencyId) === false,
		);
		return wasBlocked && !remainsBlocked;
	});
}

// Groups the current assignee IDs for a set of tasks.
export async function getTaskAssigneeIds(taskIds: string[]) {
	const assigneesByTask = new Map<string, string[]>();
	if (taskIds.length === 0) return assigneesByTask;

	const rows = await db
		.select({ taskId: taskAssignees.taskId, userId: taskAssignees.userId })
		.from(taskAssignees)
		.where(inArray(taskAssignees.taskId, taskIds));
	for (const row of rows) {
		const current = assigneesByTask.get(row.taskId) ?? [];
		current.push(row.userId);
		assigneesByTask.set(row.taskId, current);
	}
	return assigneesByTask;
}
