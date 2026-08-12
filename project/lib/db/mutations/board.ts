import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, tasks } from "@/lib/db/schema";

interface InsertBoardListInput {
	projectId: string;
	name: string;
	position?: number;
}

interface UpdateBoardListInput {
	name?: string;
	position?: number;
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
}

// Inserts a list at the requested position or at the end of the project board.
export async function insertBoardList(input: InsertBoardListInput) {
	const [list] = await db
		.insert(lists)
		.values({
			projectId: input.projectId,
			name: input.name,
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
	const [task] = await db
		.insert(tasks)
		.values({
			...input,
			position:
				input.position ??
				sql<number>`coalesce((select max(${tasks.position}) + 1 from ${tasks} where ${tasks.listId} = ${input.listId} and ${tasks.deletedAt} is null), 0)`,
		})
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
