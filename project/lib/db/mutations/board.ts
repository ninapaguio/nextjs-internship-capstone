import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { advanceProjectBoardVersion } from "@/lib/db/mutations/board-sync";
import {
	findNewlyUnblockedTaskIds,
	getTaskAssigneeIds,
} from "@/lib/db/mutations/notification-events";
import {
	type ActivityEntity,
	buildTaskSnapshotActivities,
	type TaskActivitySnapshot,
} from "@/lib/db/mutations/task-activity";
import {
	comments,
	labels,
	lists,
	notifications,
	priorityOptions,
	taskActivities,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
	users,
} from "@/lib/db/schema";
import type { NewNotification } from "@/types";

interface InsertBoardLabelInput {
	projectId: string;
	name: string;
	color: string;
}

// Creates one notification row per recipient while excluding the person making the change.
function buildNotificationRows(
	type: NewNotification["type"],
	recipientIds: string[],
	actorUserId: string,
	projectId: string,
	taskId: string,
) {
	return [...new Set(recipientIds)]
		.filter((recipientUserId) => recipientUserId !== actorUserId)
		.map((recipientUserId) => ({
			recipientUserId,
			actorUserId,
			projectId,
			taskId,
			type,
		}));
}

// Returns unique users who need a live notification refresh after a committed batch.
function getNotificationRecipientIds(rows: NewNotification[]) {
	return [...new Set(rows.map((row) => row.recipientUserId))];
}

// Inserts a comment written by an authorized project member.
export async function insertBoardComment(
	projectId: string,
	taskId: string,
	authorId: string,
	content: string,
) {
	const assigneesByTask = await getTaskAssigneeIds([taskId]);
	const notificationRows = buildNotificationRows(
		"assigned_task_commented",
		assigneesByTask.get(taskId) ?? [],
		authorId,
		projectId,
		taskId,
	);
	const [commentRows] = await db.batch([
		db.insert(comments).values({ taskId, authorId, content }).returning({
			id: comments.id,
			body: comments.content,
			createdAt: comments.createdAt,
		}),
		...(notificationRows.length > 0
			? [db.insert(notifications).values(notificationRows)]
			: []),
		advanceProjectBoardVersion(projectId),
	] as const);

	const comment = commentRows[0];
	return comment
		? {
				...comment,
				notificationRecipientIds: getNotificationRecipientIds(notificationRows),
			}
		: null;
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
	priorityId?: string;
	dueDate?: string | null;
	completed?: boolean;
	assigneeIds?: string[];
	labelIds?: string[];
	dependencyIds?: string[];
	blockingTaskIds?: string[];
}

interface InsertBoardTaskInput {
	projectId: string;
	listId: string;
	createdById: string;
	title: string;
	description?: string;
	priorityId: string;
	dueDate?: string;
	position?: number;
	assigneeIds: string[];
	labelIds: string[];
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
			priorityId: priorityOptions.id,
			priorityName: priorityOptions.label,
		})
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.innerJoin(priorityOptions, eq(tasks.priorityId, priorityOptions.id))
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
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
			.innerJoin(
				lists,
				and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
			)
			.where(
				and(
					eq(taskDependencies.projectId, projectId),
					eq(taskDependencies.taskId, taskId),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(lists.archivedAt),
					isNull(lists.deletedAt),
				),
			),
	]);

	return {
		title: task.title,
		description: task.description,
		dueDate: task.dueDate,
		completed: Boolean(task.completedAt),
		list: { id: task.listId, name: task.listName },
		priority: { id: task.priorityId, name: task.priorityName },
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

// display values that will exist after a validated task update.
async function buildNextTaskActivitySnapshot(
	projectId: string,
	previous: TaskActivitySnapshot,
	input: UpdateBoardTaskInput,
): Promise<TaskActivitySnapshot | null> {
	const [listRows, priorityRows, assigneeRows, labelRows, dependencyRows] =
		await Promise.all([
			input.listId
				? db
						.select({ id: lists.id, name: lists.name })
						.from(lists)
						.where(
							and(
								eq(lists.id, input.listId),
								eq(lists.projectId, projectId),
								isNull(lists.archivedAt),
								isNull(lists.deletedAt),
							),
						)
				: Promise.resolve([]),
			input.priorityId
				? db
						.select({ id: priorityOptions.id, name: priorityOptions.label })
						.from(priorityOptions)
						.where(eq(priorityOptions.id, input.priorityId))
				: Promise.resolve([]),
			input.assigneeIds
				? input.assigneeIds.length > 0
					? db
							.select({
								id: users.id,
								firstName: users.firstName,
								lastName: users.lastName,
								email: users.email,
							})
							.from(users)
							.where(
								and(
									inArray(users.id, input.assigneeIds),
									isNull(users.deletedAt),
								),
							)
					: Promise.resolve([])
				: Promise.resolve(null),
			input.labelIds
				? input.labelIds.length > 0
					? db
							.select({ id: labels.id, name: labels.name })
							.from(labels)
							.where(
								and(
									eq(labels.projectId, projectId),
									inArray(labels.id, input.labelIds),
								),
							)
					: Promise.resolve([])
				: Promise.resolve(null),
			input.dependencyIds
				? input.dependencyIds.length > 0
					? db
							.select({ id: tasks.id, name: tasks.title })
							.from(tasks)
							.innerJoin(
								lists,
								and(
									eq(tasks.listId, lists.id),
									eq(tasks.projectId, lists.projectId),
								),
							)
							.where(
								and(
									eq(tasks.projectId, projectId),
									inArray(tasks.id, input.dependencyIds),
									isNull(tasks.archivedAt),
									isNull(tasks.deletedAt),
									isNull(lists.archivedAt),
									isNull(lists.deletedAt),
								),
							)
					: Promise.resolve([])
				: Promise.resolve(null),
		]);

	if (input.listId && listRows.length !== 1) return null;
	if (input.priorityId && priorityRows.length !== 1) return null;
	if (input.assigneeIds && assigneeRows?.length !== input.assigneeIds.length) {
		return null;
	}
	if (input.labelIds && labelRows?.length !== input.labelIds.length)
		return null;
	if (
		input.dependencyIds &&
		dependencyRows?.length !== input.dependencyIds.length
	) {
		return null;
	}

	const nextAssignees: ActivityEntity[] | null = assigneeRows
		? assigneeRows.map((member) => ({
				id: member.id,
				name:
					[member.firstName, member.lastName].filter(Boolean).join(" ") ||
					member.email,
			}))
		: null;

	return {
		title: input.title ?? previous.title,
		description:
			input.description === undefined
				? previous.description
				: input.description,
		dueDate: input.dueDate === undefined ? previous.dueDate : input.dueDate,
		completed: input.completed ?? previous.completed,
		list: listRows[0] ?? previous.list,
		priority: priorityRows[0] ?? previous.priority,
		assignees: nextAssignees ?? previous.assignees,
		labels: labelRows ?? previous.labels,
		dependencies: dependencyRows ?? previous.dependencies,
	};
}

// Adds or removes the edited task from a blocked task's dependencies for activity tracking.
function buildNextBlockingTaskSnapshot(
	previous: TaskActivitySnapshot,
	dependencyTask: ActivityEntity,
	shouldDependOnTask: boolean,
) {
	const dependencies = previous.dependencies.filter(
		(dependency) => dependency.id !== dependencyTask.id,
	);
	if (shouldDependOnTask) dependencies.push(dependencyTask);
	return { ...previous, dependencies };
}

// Stops the update unless every expected task is still active and can be changed.
function requireActiveTaskCount(
	projectId: string,
	taskIds: string[],
	expectedCount: number,
) {
	return db
		.select({
			guard: sql<number>`1 / (case when count(*) = ${expectedCount} then 1 else 0 end)`,
		})
		.from(tasks)
		.innerJoin(
			lists,
			and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
		)
		.where(
			and(
				eq(tasks.projectId, projectId),
				inArray(tasks.id, taskIds),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		);
}

// Stops task creation if its column is no longer active in the project.
function requireActiveList(projectId: string, listId: string) {
	return db
		.select({
			guard: sql<number>`1 / (case when count(*) = 1 then 1 else 0 end)`,
		})
		.from(lists)
		.where(
			and(
				eq(lists.id, listId),
				eq(lists.projectId, projectId),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		);
}

// Creates a reusable label within one project.
export async function insertBoardLabel(input: InsertBoardLabelInput) {
	const [labelRows] = await db.batch([
		db
			.insert(labels)
			.values(input)
			.returning({ id: labels.id, name: labels.name, color: labels.color }),
		advanceProjectBoardVersion(input.projectId),
	] as const);

	return labelRows[0] ?? null;
}

// Inserts a list at the requested position or at the end of the project board.
export async function insertBoardList(input: InsertBoardListInput) {
	const [listRows] = await db.batch([
		db
			.insert(lists)
			.values({
				projectId: input.projectId,
				name: input.name,
				description: input.description,
				position:
					input.position ??
					sql<number>`coalesce((select max(${lists.position}) + 1 from ${lists} where ${lists.projectId} = ${input.projectId} and ${lists.deletedAt} is null), 0)`,
			})
			.returning({ id: lists.id, name: lists.name, position: lists.position }),
		advanceProjectBoardVersion(input.projectId),
	] as const);

	return listRows[0] ?? null;
}

// Updates one active list that belongs to the authorized project.
export async function updateBoardList(
	projectId: string,
	listId: string,
	input: UpdateBoardListInput,
) {
	const [listRows] = await db.batch([
		db
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
			.returning({ id: lists.id }),
		advanceProjectBoardVersion(projectId),
	] as const);

	return listRows[0] ?? null;
}

// Archives, restores, or soft-deletes one list within an authorized project.
export async function changeBoardListLifecycle(
	projectId: string,
	listId: string,
	action: "archive" | "restore" | "delete",
) {
	const now = new Date();
	const [listRows] = await db.batch([
		db
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
						: and(
								isNull(lists.deletedAt),
								isNull(lists.archivedAt),
								sql`not exists (
								select 1 from ${tasks}
								where ${tasks.projectId} = ${projectId}
								and ${tasks.listId} = ${lists.id}
								and ${tasks.archivedAt} is null
								and ${tasks.deletedAt} is null
							)`,
							),
				),
			)
			.returning({ id: lists.id }),
		advanceProjectBoardVersion(projectId),
	] as const);

	return listRows[0] ?? null;
}

// Inserts a task at the requested position or at the end of its target list.
export async function insertBoardTask(input: InsertBoardTaskInput) {
	const { assigneeIds, labelIds, ...taskInput } = input;
	const taskId = randomUUID();
	const notificationRows = buildNotificationRows(
		"task_assigned",
		assigneeIds,
		input.createdById,
		input.projectId,
		taskId,
	);
	const [, taskRows] = await db.batch([
		requireActiveList(input.projectId, input.listId),
		db
			.insert(tasks)
			.values({
				...taskInput,
				id: taskId,
				position:
					input.position ??
					sql<number>`coalesce((select max(${tasks.position}) + 1 from ${tasks} where ${tasks.listId} = ${input.listId} and ${tasks.archivedAt} is null and ${tasks.deletedAt} is null), 0)`,
			})
			.returning({ id: tasks.id }),
		...(assigneeIds.length > 0
			? [
					db.insert(taskAssignees).values(
						assigneeIds.map((userId) => ({
							taskId,
							userId,
							assignedById: input.createdById,
						})),
					),
				]
			: []),
		...(labelIds.length > 0
			? [
					db.insert(taskLabels).values(
						labelIds.map((labelId) => ({
							projectId: input.projectId,
							taskId,
							labelId,
						})),
					),
				]
			: []),
		db.insert(taskActivities).values({
			taskId,
			actorId: input.createdById,
			action: "created",
		}),
		...(notificationRows.length > 0
			? [db.insert(notifications).values(notificationRows)]
			: []),
		advanceProjectBoardVersion(input.projectId),
	] as const);

	const task = taskRows[0];
	return task
		? {
				...task,
				notificationRecipientIds: getNotificationRecipientIds(notificationRows),
			}
		: null;
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
	const nextSnapshot = await buildNextTaskActivitySnapshot(
		projectId,
		previousSnapshot,
		input,
	);
	if (!nextSnapshot) return null;
	const newlyUnblockedTaskIds = await findNewlyUnblockedTaskIds({
		projectId,
		taskId,
		completed: input.completed,
		dependencyIds: input.dependencyIds,
		blockingTaskIds: input.blockingTaskIds,
	});
	const unblockedAssigneesByTask = await getTaskAssigneeIds(
		newlyUnblockedTaskIds,
	);

	const previousBlockingRows = input.blockingTaskIds
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
	const affectedBlockingTaskIds = [
		...new Set([
			...previousBlockingRows.map((dependency) => dependency.taskId),
			...(input.blockingTaskIds ?? []),
		]),
	];
	const previousBlockingSnapshots = new Map<string, TaskActivitySnapshot>();
	for (const blockingTaskId of affectedBlockingTaskIds) {
		const snapshot = await getTaskActivitySnapshot(projectId, blockingTaskId);
		if (!snapshot) return null;
		previousBlockingSnapshots.set(blockingTaskId, snapshot);
	}
	const activityRows = buildTaskSnapshotActivities(
		taskId,
		actorId,
		previousSnapshot,
		nextSnapshot,
	);
	const dependencyTask = { id: taskId, name: nextSnapshot.title };
	const nextBlockingTaskIds = new Set(input.blockingTaskIds ?? []);
	for (const [blockingTaskId, snapshot] of previousBlockingSnapshots) {
		activityRows.push(
			...buildTaskSnapshotActivities(
				blockingTaskId,
				actorId,
				snapshot,
				buildNextBlockingTaskSnapshot(
					snapshot,
					dependencyTask,
					nextBlockingTaskIds.has(blockingTaskId),
				),
			),
		);
	}

	const {
		assigneeIds,
		labelIds,
		dependencyIds,
		blockingTaskIds,
		completed,
		...changes
	} = input;
	const previousAssigneeIds = new Set(
		previousSnapshot.assignees.map((assignee) => assignee.id),
	);
	const nextAssigneeIds = new Set(
		nextSnapshot.assignees.map((assignee) => assignee.id),
	);
	const notificationRows: NewNotification[] = [
		...buildNotificationRows(
			"task_assigned",
			[...nextAssigneeIds].filter((id) => !previousAssigneeIds.has(id)),
			actorId,
			projectId,
			taskId,
		),
		...buildNotificationRows(
			"task_unassigned",
			[...previousAssigneeIds].filter((id) => !nextAssigneeIds.has(id)),
			actorId,
			projectId,
			taskId,
		),
	];
	for (const unblockedTaskId of newlyUnblockedTaskIds) {
		const recipientIds =
			unblockedTaskId === taskId && assigneeIds !== undefined
				? [...nextAssigneeIds]
				: (unblockedAssigneesByTask.get(unblockedTaskId) ?? []);
		notificationRows.push(
			...buildNotificationRows(
				"task_unblocked",
				recipientIds,
				actorId,
				projectId,
				unblockedTaskId,
			),
		);
	}
	const [, taskRows] = await db.batch([
		requireActiveTaskCount(projectId, [taskId], 1),
		db
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
					isNull(tasks.archivedAt),
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
			.returning({ id: tasks.id }),
		...(assigneeIds
			? [
					db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId)),
					...(assigneeIds.length > 0
						? [
								db.insert(taskAssignees).values(
									assigneeIds.map((userId) => ({
										taskId,
										userId,
										assignedById: actorId,
									})),
								),
							]
						: []),
				]
			: []),
		...(labelIds
			? [
					db.delete(taskLabels).where(eq(taskLabels.taskId, taskId)),
					...(labelIds.length > 0
						? [
								db
									.insert(taskLabels)
									.values(
										labelIds.map((labelId) => ({ projectId, taskId, labelId })),
									),
							]
						: []),
				]
			: []),
		...(dependencyIds
			? [
					db
						.delete(taskDependencies)
						.where(
							and(
								eq(taskDependencies.projectId, projectId),
								eq(taskDependencies.taskId, taskId),
							),
						),
					...(dependencyIds.length > 0
						? [
								db.insert(taskDependencies).values(
									dependencyIds.map((dependsOnTaskId) => ({
										projectId,
										taskId,
										dependsOnTaskId,
										createdById: actorId,
									})),
								),
							]
						: []),
				]
			: []),
		...(blockingTaskIds
			? [
					db
						.delete(taskDependencies)
						.where(
							and(
								eq(taskDependencies.projectId, projectId),
								eq(taskDependencies.dependsOnTaskId, taskId),
							),
						),
					...(blockingTaskIds.length > 0
						? [
								db.insert(taskDependencies).values(
									blockingTaskIds.map((blockingTaskId) => ({
										projectId,
										taskId: blockingTaskId,
										dependsOnTaskId: taskId,
										createdById: actorId,
									})),
								),
							]
						: []),
				]
			: []),
		...(activityRows.length > 0
			? [db.insert(taskActivities).values(activityRows)]
			: []),
		...(notificationRows.length > 0
			? [db.insert(notifications).values(notificationRows)]
			: []),
		advanceProjectBoardVersion(projectId),
	] as const);

	const task = taskRows[0];
	return task
		? {
				...task,
				notificationRecipientIds: getNotificationRecipientIds(notificationRows),
			}
		: null;
}

// Archives, restores, or soft-deletes one task from an authorized project board.
export async function changeBoardTaskLifecycle(
	projectId: string,
	taskId: string,
	action: "archive" | "restore" | "delete",
) {
	const now = new Date();
	const dependentTask = alias(tasks, "dependent_task");
	const dependentList = alias(lists, "dependent_list");
	const hasNoActiveDependents = notExists(
		db
			.select({ id: taskDependencies.taskId })
			.from(taskDependencies)
			.innerJoin(dependentTask, eq(taskDependencies.taskId, dependentTask.id))
			.innerJoin(
				dependentList,
				and(
					eq(dependentTask.listId, dependentList.id),
					eq(dependentTask.projectId, dependentList.projectId),
				),
			)
			.where(
				and(
					eq(taskDependencies.projectId, projectId),
					eq(taskDependencies.dependsOnTaskId, tasks.id),
					isNull(dependentTask.archivedAt),
					isNull(dependentTask.deletedAt),
					isNull(dependentList.archivedAt),
					isNull(dependentList.deletedAt),
				),
			),
	);
	const [taskRows] = await db.batch([
		db
			.update(tasks)
			.set({
				archivedAt: action === "restore" ? null : now,
				deletedAt: action === "delete" ? now : undefined,
				updatedAt: now,
			})
			.where(
				and(
					eq(tasks.id, taskId),
					eq(tasks.projectId, projectId),
					isNull(tasks.deletedAt),
					sql`exists (
					select 1 from ${lists}
					where ${lists.id} = ${tasks.listId}
					and ${lists.projectId} = ${projectId}
					and ${lists.archivedAt} is null
					and ${lists.deletedAt} is null
				)`,
					action === "restore"
						? sql`${tasks.archivedAt} is not null`
						: and(isNull(tasks.archivedAt), hasNoActiveDependents),
				),
			)
			.returning({ id: tasks.id }),
		advanceProjectBoardVersion(projectId),
	] as const);

	return taskRows[0] ?? null;
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
	const [targetList] = await db
		.select({ id: lists.id, name: lists.name })
		.from(lists)
		.where(
			and(
				eq(lists.id, targetListId),
				eq(lists.projectId, projectId),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		)
		.limit(1);
	if (!targetList) return null;
	const activityRows = buildTaskSnapshotActivities(
		taskId,
		actorId,
		previousSnapshot,
		{ ...previousSnapshot, list: targetList },
	);
	const [, taskRows] = await db.batch([
		requireActiveTaskCount(projectId, [taskId], 1),
		db
			.update(tasks)
			.set({ listId: targetListId, position, updatedAt: new Date() })
			.where(
				and(
					eq(tasks.id, taskId),
					eq(tasks.projectId, projectId),
					isNull(tasks.archivedAt),
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
			.returning({ id: tasks.id }),
		...(activityRows.length > 0
			? [db.insert(taskActivities).values(activityRows)]
			: []),
		advanceProjectBoardVersion(projectId),
	] as const);

	return taskRows[0] ?? null;
}

// Moves up to 10 active tasks together and normalizes every affected column in one update.
export async function moveBoardTasks(
	projectId: string,
	taskIds: string[],
	targetListId: string,
	position: number,
	actorId: string,
) {
	const [targetList] = await db
		.select({ id: lists.id, name: lists.name })
		.from(lists)
		.where(
			and(
				eq(lists.id, targetListId),
				eq(lists.projectId, projectId),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		)
		.limit(1);
	if (!targetList) return null;

	const movingTasks = await db
		.select({
			id: tasks.id,
			listId: tasks.listId,
			listName: lists.name,
		})
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.where(
			and(
				eq(tasks.projectId, projectId),
				inArray(tasks.id, taskIds),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
				isNull(lists.archivedAt),
				isNull(lists.deletedAt),
			),
		);
	if (movingTasks.length !== taskIds.length) return null;

	const affectedListIds = Array.from(
		new Set([...movingTasks.map((task) => task.listId), targetListId]),
	);
	const affectedTasks = await db
		.select({ id: tasks.id, listId: tasks.listId })
		.from(tasks)
		.where(
			and(
				eq(tasks.projectId, projectId),
				inArray(tasks.listId, affectedListIds),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
			),
		)
		.orderBy(asc(tasks.position), asc(tasks.createdAt));

	const movingIds = new Set(taskIds);
	const tasksByList = new Map<string, string[]>();
	for (const listId of affectedListIds) tasksByList.set(listId, []);
	for (const task of affectedTasks) {
		if (!movingIds.has(task.id)) tasksByList.get(task.listId)?.push(task.id);
	}
	const targetTasks = tasksByList.get(targetListId) ?? [];
	const targetPosition = Math.min(position, targetTasks.length);
	targetTasks.splice(targetPosition, 0, ...taskIds);
	tasksByList.set(targetListId, targetTasks);

	const placements = Array.from(tasksByList.entries()).flatMap(
		([listId, listTaskIds]) =>
			listTaskIds.map((taskId, taskPosition) => ({
				taskId,
				listId,
				position: taskPosition,
			})),
	);
	if (placements.length === 0) return null;

	const listCase = sql.join(
		placements.map(
			(placement) =>
				sql`when ${placement.taskId} then ${placement.listId}::uuid`,
		),
		sql` `,
	);
	const positionCase = sql.join(
		placements.map(
			(placement) =>
				sql`when ${placement.taskId} then ${placement.position}::integer`,
		),
		sql` `,
	);
	const activityRows = movingTasks
		.filter((task) => task.listId !== targetListId)
		.map((task) => ({
			taskId: task.id,
			actorId,
			action: "moved" as const,
			fieldName: "column",
			oldValue: task.listName,
			newValue: targetList.name,
		}));
	const [, updatedTasks] = await db.batch([
		requireActiveTaskCount(
			projectId,
			placements.map((placement) => placement.taskId),
			placements.length,
		),
		db
			.update(tasks)
			.set({
				listId: sql`case ${tasks.id} ${listCase} else ${tasks.listId} end`,
				position: sql`case ${tasks.id} ${positionCase} else ${tasks.position} end`,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(tasks.projectId, projectId),
					inArray(
						tasks.id,
						placements.map((placement) => placement.taskId),
					),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
				),
			)
			.returning({ id: tasks.id }),
		...(activityRows.length > 0
			? [db.insert(taskActivities).values(activityRows)]
			: []),
		advanceProjectBoardVersion(projectId),
	] as const);
	if (updatedTasks.length !== placements.length) return null;

	return { movedCount: movingTasks.length };
}
