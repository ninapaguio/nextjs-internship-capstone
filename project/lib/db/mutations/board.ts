import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	labels,
	lists,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
} from "@/lib/db/schema";

interface InsertBoardLabelInput {
	projectId: string;
	name: string;
	color: string;
}

interface InsertBoardListInput {
	projectId: string;
	name: string;
	description?: string;
	position?: number;
}

interface UpdateBoardListInput {
	name?: string;
	description?: string | null;
	position?: number;
}

interface UpdateBoardTaskInput {
	listId?: string;
	title?: string;
	description?: string | null;
	complexityId?: string;
	dueDate?: string | null;
	completed?: boolean;
	assigneeIds?: string[];
	labelIds?: string[];
	dependencyIds?: string[];
}

interface InsertBoardTaskInput {
	projectId: string;
	listId: string;
	createdById: string;
	title: string;
	description?: string;
	complexityId: string;
	dueDate?: string;
	position?: number;
	assigneeIds: string[];
	labelIds: string[];
}

// Creates a reusable label within one project.
export async function insertBoardLabel(input: InsertBoardLabelInput) {
	const [label] = await db
		.insert(labels)
		.values(input)
		.returning({ id: labels.id, name: labels.name, color: labels.color });

	return label ?? null;
}

// Inserts a list at the requested position or at the end of the project board.
export async function insertBoardList(input: InsertBoardListInput) {
	const [list] = await db
		.insert(lists)
		.values({
			projectId: input.projectId,
			name: input.name,
			description: input.description,
			position:
				input.position ??
				sql<number>`coalesce((select max(${lists.position}) + 1 from ${lists} where ${lists.projectId} = ${input.projectId} and ${lists.deletedAt} is null), 0)`,
		})
		.returning({ id: lists.id, name: lists.name, position: lists.position });

	return list ?? null;
}

// Updates one active list that belongs to the authorized project.
export async function updateBoardList(
	projectId: string,
	listId: string,
	input: UpdateBoardListInput,
) {
	const [list] = await db
		.update(lists)
		.set({ ...input, updatedAt: new Date() })
		.where(
			and(
				eq(lists.id, listId),
				eq(lists.projectId, projectId),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		)
		.returning({ id: lists.id });

	return list ?? null;
}

// Archives, restores, or soft-deletes one list within an authorized project.
export async function changeBoardListLifecycle(
	projectId: string,
	listId: string,
	action: "archive" | "restore" | "delete",
) {
	const now = new Date();
	const [list] = await db
		.update(lists)
		.set({
			status: action === "restore" ? "active" : "archived",
			archivedAt: action === "restore" ? null : now,
			deletedAt: action === "delete" ? now : undefined,
			updatedAt: now,
		})
		.where(
			and(
				eq(lists.id, listId),
				eq(lists.projectId, projectId),
				action === "restore"
					? and(isNull(lists.deletedAt), eq(lists.status, "archived"))
					: and(isNull(lists.deletedAt), isNull(lists.archivedAt)),
			),
		)
		.returning({ id: lists.id });

	return list ?? null;
}

// Inserts a task at the requested position or at the end of its target list.
export async function insertBoardTask(input: InsertBoardTaskInput) {
	const { assigneeIds, labelIds, ...taskInput } = input;
	const [task] = await db
		.insert(tasks)
		.values({
			...taskInput,
			position:
				input.position ??
				sql<number>`coalesce((select max(${tasks.position}) + 1 from ${tasks} where ${tasks.listId} = ${input.listId} and ${tasks.deletedAt} is null), 0)`,
		})
		.returning({ id: tasks.id });
	if (task && assigneeIds.length > 0) {
		await db.insert(taskAssignees).values(
			assigneeIds.map((userId) => ({
				taskId: task.id,
				userId,
				assignedById: input.createdById,
			})),
		);
	}
	if (task && labelIds.length > 0) {
		await db.insert(taskLabels).values(
			labelIds.map((labelId) => ({
				projectId: input.projectId,
				taskId: task.id,
				labelId,
			})),
		);
	}

	return task ?? null;
}

// Updates editable task fields and replaces task relationships when provided.
export async function updateBoardTask(
	projectId: string,
	taskId: string,
	actorId: string,
	input: UpdateBoardTaskInput,
) {
	const { assigneeIds, labelIds, dependencyIds, completed, ...changes } = input;
	const [task] = await db
		.update(tasks)
		.set({
			...changes,
			completedAt:
				completed === undefined ? undefined : completed ? new Date() : null,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.deletedAt),
				changes.listId
					? sql`exists (
						select 1 from ${lists}
						where ${lists.id} = ${changes.listId}
						and ${lists.projectId} = ${projectId}
						and ${lists.archivedAt} is null
						and ${lists.deletedAt} is null
					)`
					: undefined,
			),
		)
		.returning({ id: tasks.id });

	if (task && assigneeIds) {
		await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
		if (assigneeIds.length > 0) {
			await db.insert(taskAssignees).values(
				assigneeIds.map((userId) => ({
					taskId,
					userId,
					assignedById: actorId,
				})),
			);
		}
	}

	if (task && labelIds) {
		await db.delete(taskLabels).where(eq(taskLabels.taskId, taskId));
		if (labelIds.length > 0) {
			await db
				.insert(taskLabels)
				.values(labelIds.map((labelId) => ({ projectId, taskId, labelId })));
		}
	}

	if (task && dependencyIds) {
		await db
			.delete(taskDependencies)
			.where(
				and(
					eq(taskDependencies.projectId, projectId),
					eq(taskDependencies.taskId, taskId),
				),
			);
		if (dependencyIds.length > 0) {
			await db.insert(taskDependencies).values(
				dependencyIds.map((dependsOnTaskId) => ({
					projectId,
					taskId,
					dependsOnTaskId,
					createdById: actorId,
				})),
			);
		}
	}

	return task ?? null;
}

// Soft-deletes one task from an authorized project board.
export async function deleteBoardTask(projectId: string, taskId: string) {
	const [task] = await db
		.update(tasks)
		.set({ deletedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.deletedAt),
			),
		)
		.returning({ id: tasks.id });

	return task ?? null;
}

// Moves one active task to a list belonging to the same authorized project.
export async function moveBoardTask(
	projectId: string,
	taskId: string,
	targetListId: string,
	position: number,
) {
	const [task] = await db
		.update(tasks)
		.set({ listId: targetListId, position, updatedAt: new Date() })
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.deletedAt),
				sql`exists (
					select 1 from ${lists}
					where ${lists.id} = ${targetListId}
					and ${lists.projectId} = ${projectId}
					and ${lists.archivedAt} is null
					and ${lists.deletedAt} is null
				)`,
			),
		)
		.returning({ id: tasks.id });

	return task ?? null;
}
