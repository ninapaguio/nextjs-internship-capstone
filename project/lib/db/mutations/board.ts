import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	comments,
	complexityOptions,
	labels,
	lists,
	taskActivities,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
	users,
} from "@/lib/db/schema";

interface InsertBoardLabelInput {
	projectId: string;
	name: string;
	color: string;
}

// Inserts a comment written by an authorized project member.
export async function insertBoardComment(
	taskId: string,
	authorId: string,
	content: string,
) {
	const [comment] = await db
		.insert(comments)
		.values({ taskId, authorId, content })
		.returning({
			id: comments.id,
			body: comments.content,
			createdAt: comments.createdAt,
		});

	return comment ?? null;
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

interface ActivityEntity {
	id: string;
	name: string;
}

interface TaskActivitySnapshot {
	title: string;
	description: string | null;
	dueDate: string | null;
	completed: boolean;
	list: ActivityEntity;
	complexity: ActivityEntity;
	assignees: ActivityEntity[];
	labels: ActivityEntity[];
	dependencies: ActivityEntity[];
}

// Loads the saved task values needed to identify meaningful activity changes.
async function getTaskActivitySnapshot(
	projectId: string,
	taskId: string,
): Promise<TaskActivitySnapshot | null> {
	const [task] = await db
		.select({
			title: tasks.title,
			description: tasks.description,
			dueDate: tasks.dueDate,
			completedAt: tasks.completedAt,
			listId: lists.id,
			listName: lists.name,
			complexityId: complexityOptions.id,
			complexityName: complexityOptions.label,
		})
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.innerJoin(
			complexityOptions,
			eq(tasks.complexityId, complexityOptions.id),
		)
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.deletedAt),
			),
		)
		.limit(1);
	if (!task) return null;

	const [assigneeRows, labelRows, dependencyRows] = await Promise.all([
		db
			.select({
				id: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				email: users.email,
			})
			.from(taskAssignees)
			.innerJoin(users, eq(taskAssignees.userId, users.id))
			.where(eq(taskAssignees.taskId, taskId)),
		db
			.select({ id: labels.id, name: labels.name })
			.from(taskLabels)
			.innerJoin(labels, eq(taskLabels.labelId, labels.id))
			.where(eq(taskLabels.taskId, taskId)),
		db
			.select({ id: tasks.id, name: tasks.title })
			.from(taskDependencies)
			.innerJoin(tasks, eq(taskDependencies.dependsOnTaskId, tasks.id))
			.where(
				and(
					eq(taskDependencies.projectId, projectId),
					eq(taskDependencies.taskId, taskId),
				),
			),
	]);

	return {
		title: task.title,
		description: task.description,
		dueDate: task.dueDate,
		completed: Boolean(task.completedAt),
		list: { id: task.listId, name: task.listName },
		complexity: { id: task.complexityId, name: task.complexityName },
		assignees: assigneeRows.map((member) => ({
			id: member.id,
			name:
				[member.firstName, member.lastName].filter(Boolean).join(" ") ||
				member.email,
		})),
		labels: labelRows,
		dependencies: dependencyRows,
	};
}

// Returns entities added to and removed from a task relationship.
function compareActivityEntities(
	previous: ActivityEntity[],
	next: ActivityEntity[],
) {
	return {
		added: next.filter(
			(entity) => !previous.some((item) => item.id === entity.id),
		),
		removed: previous.filter(
			(entity) => !next.some((item) => item.id === entity.id),
		),
	};
}

// Stores only successful, user-visible changes in the task activity timeline.
async function insertTaskSnapshotActivities(
	taskId: string,
	actorId: string,
	previous: TaskActivitySnapshot,
	next: TaskActivitySnapshot,
) {
	const activityRows: (typeof taskActivities.$inferInsert)[] = [];
	const addUpdate = (
		fieldName: string,
		oldValue: string | null,
		newValue: string | null,
	) => {
		if (oldValue === newValue) return;
		activityRows.push({
			taskId,
			actorId,
			action: "updated",
			fieldName,
			oldValue,
			newValue,
		});
	};

	addUpdate("title", previous.title, next.title);
	addUpdate("description", previous.description, next.description);
	addUpdate("due_date", previous.dueDate, next.dueDate);
	addUpdate("complexity", previous.complexity.name, next.complexity.name);

	if (previous.list.id !== next.list.id) {
		activityRows.push({
			taskId,
			actorId,
			action: "moved",
			fieldName: "column",
			oldValue: previous.list.name,
			newValue: next.list.name,
		});
	}
	if (previous.completed !== next.completed) {
		activityRows.push({
			taskId,
			actorId,
			action: next.completed ? "completed" : "updated",
			fieldName: "completion",
			oldValue: previous.completed,
			newValue: next.completed,
		});
	}

	const assignees = compareActivityEntities(
		previous.assignees,
		next.assignees,
	);
	for (const member of assignees.added) {
		activityRows.push({
			taskId,
			actorId,
			action: "assigned",
			fieldName: "assignee",
			oldValue: null,
			newValue: member.name,
		});
	}
	for (const member of assignees.removed) {
		activityRows.push({
			taskId,
			actorId,
			action: "unassigned",
			fieldName: "assignee",
			oldValue: member.name,
			newValue: null,
		});
	}

	for (const [fieldName, changes] of [
		["label", compareActivityEntities(previous.labels, next.labels)],
		[
			"dependency",
			compareActivityEntities(previous.dependencies, next.dependencies),
		],
	] as const) {
		for (const entity of changes.added) {
			activityRows.push({
				taskId,
				actorId,
				action: "updated",
				fieldName,
				oldValue: null,
				newValue: entity.name,
			});
		}
		for (const entity of changes.removed) {
			activityRows.push({
				taskId,
				actorId,
				action: "updated",
				fieldName,
				oldValue: entity.name,
				newValue: null,
			});
		}
	}

	if (activityRows.length > 0) {
		await db.insert(taskActivities).values(activityRows);
	}
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
	if (task) {
		await db.insert(taskActivities).values({
			taskId: task.id,
			actorId: input.createdById,
			action: "created",
		});
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
	const previousSnapshot = await getTaskActivitySnapshot(projectId, taskId);
	if (!previousSnapshot) return null;

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

	if (task) {
		const nextSnapshot = await getTaskActivitySnapshot(projectId, taskId);
		if (nextSnapshot) {
			await insertTaskSnapshotActivities(
				taskId,
				actorId,
				previousSnapshot,
				nextSnapshot,
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
	actorId: string,
) {
	const previousSnapshot = await getTaskActivitySnapshot(projectId, taskId);
	if (!previousSnapshot) return null;

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

	if (task && previousSnapshot.list.id !== targetListId) {
		const nextSnapshot = await getTaskActivitySnapshot(projectId, taskId);
		if (nextSnapshot) {
			await insertTaskSnapshotActivities(
				taskId,
				actorId,
				previousSnapshot,
				nextSnapshot,
			);
		}
	}

	return task ?? null;
}
