import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
	comments,
	complexityOptions,
	labels,
	lists,
	projectMembers,
	projects,
	taskActivities,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
	users,
} from "@/lib/db/schema";
import type {
	BoardActivityItem,
	BoardActivityType,
	BoardComment,
	BoardComplexityOption,
	BoardLabelOption,
	BoardMemberOption,
	ProjectBoardData,
} from "@/types";

// Narrows database complexity keys to the three supported board values.
function toComplexityKey(key: string): BoardComplexityOption["key"] {
	if (key === "low" || key === "high") return key;
	return "medium";
}

// Loads active comments and synchronized author profiles for one task on demand.
export async function getTaskComments(
	projectId: string,
	taskId: string,
): Promise<BoardComment[]> {
	const commentRows = await db
		.select({
			id: comments.id,
			body: comments.content,
			createdAt: comments.createdAt,
			authorId: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			imageUrl: users.imageUrl,
		})
		.from(comments)
		.innerJoin(tasks, eq(comments.taskId, tasks.id))
		.innerJoin(users, eq(comments.authorId, users.id))
		.where(
			and(
				eq(comments.taskId, taskId),
				eq(tasks.projectId, projectId),
				isNull(comments.deletedAt),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
				isNull(users.deletedAt),
			),
		)
		.orderBy(asc(comments.createdAt));

	return commentRows.map((comment) => ({
		id: comment.id,
		body: comment.body,
		createdAt: comment.createdAt.toISOString(),
		author: {
			id: comment.authorId,
			name: getMemberName(comment),
			imageUrl: comment.imageUrl,
		},
	}));
}

// Converts a JSON activity value into displayable text without exposing objects.
function getActivityText(value: unknown) {
	return typeof value === "string" ? value : undefined;
}

// Translates generic database actions into task-specific activity timeline events.
function toBoardActivityType(activity: {
	action: (typeof taskActivities.$inferSelect)["action"];
	fieldName: string | null;
	oldValue: unknown;
	newValue: unknown;
}): BoardActivityType | null {
	if (activity.action === "created") return "created";
	if (activity.action === "moved") return "column_changed";
	if (activity.action === "assigned") return "assignee_added";
	if (activity.action === "unassigned") return "assignee_removed";
	if (activity.action === "completed") return "completed";
	if (activity.action !== "updated") return null;

	switch (activity.fieldName) {
		case "title":
			return "title_changed";
		case "description":
			return "description_changed";
		case "due_date":
			return "due_date_changed";
		case "complexity":
			return "complexity_changed";
		case "label":
			return activity.newValue === null ? "label_removed" : "label_added";
		case "dependency":
			return activity.newValue === null
				? "dependency_removed"
				: "dependency_added";
		case "completion":
			return activity.newValue === false ? "reopened" : null;
		default:
			return null;
	}
}

// Loads system-generated task changes without including comment records.
export async function getTaskActivities(
	projectId: string,
	taskId: string,
): Promise<BoardActivityItem[]> {
	const activityRows = await db
		.select({
			id: taskActivities.id,
			action: taskActivities.action,
			fieldName: taskActivities.fieldName,
			oldValue: taskActivities.oldValue,
			newValue: taskActivities.newValue,
			createdAt: taskActivities.createdAt,
			actorId: users.id,
			firstName: users.firstName,
			lastName: users.lastName,
			email: users.email,
			imageUrl: users.imageUrl,
		})
		.from(taskActivities)
		.innerJoin(tasks, eq(taskActivities.taskId, tasks.id))
		.innerJoin(users, eq(taskActivities.actorId, users.id))
		.where(
			and(
				eq(taskActivities.taskId, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
			),
		)
		.orderBy(asc(taskActivities.createdAt));

	return activityRows.flatMap((activity) => {
		const type = toBoardActivityType(activity);
		if (!type) return [];
		return [
			{
				id: activity.id,
				type,
				actor: {
					id: activity.actorId,
					name: getMemberName(activity),
					imageUrl: activity.imageUrl,
				},
				createdAt: activity.createdAt.toISOString(),
				detail: getActivityText(activity.newValue),
				previousDetail: getActivityText(activity.oldValue),
			},
		];
	});
}

// Produces a readable member name from the synchronized Clerk profile fields.
function getMemberName(member: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}) {
	return (
		[member.firstName, member.lastName].filter(Boolean).join(" ") ||
		member.email
	);
}

// Loads active lists, tasks, labels, complexity options, and project members.
export async function getProjectBoardData(
	projectId: string,
): Promise<ProjectBoardData> {
	const [listRows, taskRows, complexityRows, labelRows, projectMemberRows] =
		await Promise.all([
			db
				.select({
					id: lists.id,
					title: lists.name,
					description: lists.description,
					position: lists.position,
				})
				.from(lists)
				.where(
					and(
						eq(lists.projectId, projectId),
						isNull(lists.archivedAt),
						isNull(lists.deletedAt),
					),
				)
				.orderBy(asc(lists.position)),
			db
				.select({
					id: tasks.id,
					listId: tasks.listId,
					title: tasks.title,
					description: tasks.description,
					dueDate: tasks.dueDate,
					position: tasks.position,
					completedAt: tasks.completedAt,
					complexityId: complexityOptions.id,
					complexityKey: complexityOptions.key,
					complexityLabel: complexityOptions.label,
				})
				.from(tasks)
				.innerJoin(
					complexityOptions,
					eq(tasks.complexityId, complexityOptions.id),
				)
				.where(
					and(
						eq(tasks.projectId, projectId),
						isNull(tasks.archivedAt),
						isNull(tasks.deletedAt),
					),
				)
				.orderBy(asc(tasks.position)),
			db
				.select({
					id: complexityOptions.id,
					key: complexityOptions.key,
					label: complexityOptions.label,
				})
				.from(complexityOptions)
				.where(eq(complexityOptions.isActive, true))
				.orderBy(asc(complexityOptions.sortOrder)),
			db
				.select({ id: labels.id, name: labels.name, color: labels.color })
				.from(labels)
				.where(eq(labels.projectId, projectId))
				.orderBy(asc(labels.name)),
			db
				.select({
					id: users.id,
					firstName: users.firstName,
					lastName: users.lastName,
					email: users.email,
					imageUrl: users.imageUrl,
				})
				.from(projectMembers)
				.innerJoin(users, eq(projectMembers.userId, users.id))
				.where(
					and(eq(projectMembers.projectId, projectId), isNull(users.deletedAt)),
				),
		]);

	const taskIds = taskRows.map((task) => task.id);
	const assigneeRows = taskIds.length
		? await db
				.select({
					taskId: taskAssignees.taskId,
					id: users.id,
					firstName: users.firstName,
					lastName: users.lastName,
					email: users.email,
					imageUrl: users.imageUrl,
				})
				.from(taskAssignees)
				.innerJoin(users, eq(taskAssignees.userId, users.id))
				.where(
					and(inArray(taskAssignees.taskId, taskIds), isNull(users.deletedAt)),
				)
		: [];
	const [taskLabelRows, dependencyRows] = taskIds.length
		? await Promise.all([
				db
					.select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
					.from(taskLabels)
					.where(inArray(taskLabels.taskId, taskIds)),
				db
					.select({
						taskId: taskDependencies.taskId,
						dependsOnTaskId: taskDependencies.dependsOnTaskId,
					})
					.from(taskDependencies)
					.where(inArray(taskDependencies.taskId, taskIds)),
			])
		: [[], []];

	const membersById = new Map<string, BoardMemberOption>();
	for (const member of projectMemberRows) {
		membersById.set(member.id, {
			id: member.id,
			name: getMemberName(member),
			imageUrl: member.imageUrl,
		});
	}

	const assigneesByTask = new Map<string, BoardMemberOption[]>();
	for (const assignee of assigneeRows) {
		const current = assigneesByTask.get(assignee.taskId) ?? [];
		current.push({
			id: assignee.id,
			name: getMemberName(assignee),
			imageUrl: assignee.imageUrl,
		});
		assigneesByTask.set(assignee.taskId, current);
	}

	const labelsById = new Map<string, BoardLabelOption>(
		labelRows.map((label) => [label.id, label]),
	);
	const labelsByTask = new Map<string, BoardLabelOption[]>();
	for (const taskLabel of taskLabelRows) {
		const label = labelsById.get(taskLabel.labelId);
		if (!label) continue;
		const current = labelsByTask.get(taskLabel.taskId) ?? [];
		current.push(label);
		labelsByTask.set(taskLabel.taskId, current);
	}

	const activeTaskIds = new Set(taskIds);
	const dependencyIdsByTask = new Map<string, string[]>();
	for (const dependency of dependencyRows) {
		if (!activeTaskIds.has(dependency.dependsOnTaskId)) continue;
		const current = dependencyIdsByTask.get(dependency.taskId) ?? [];
		current.push(dependency.dependsOnTaskId);
		dependencyIdsByTask.set(dependency.taskId, current);
	}
	const tasksByList = new Map<
		string,
		ProjectBoardData["lists"][number]["tasks"]
	>();
	for (const task of taskRows) {
		const current = tasksByList.get(task.listId) ?? [];
		current.push({
			id: task.id,
			listId: task.listId,
			title: task.title,
			description: task.description,
			complexity: {
				id: task.complexityId,
				key: toComplexityKey(task.complexityKey),
				label: task.complexityLabel,
			},
			dueDate: task.dueDate,
			position: task.position,
			completedAt: task.completedAt?.toISOString() ?? null,
			assignees: assigneesByTask.get(task.id) ?? [],
			labels: labelsByTask.get(task.id) ?? [],
			dependencyIds: dependencyIdsByTask.get(task.id) ?? [],
		});
		tasksByList.set(task.listId, current);
	}

	return {
		lists: listRows.map((list) => ({
			...list,
			tasks: tasksByList.get(list.id) ?? [],
		})),
		complexityOptions: complexityRows.map((option) => ({
			id: option.id,
			key: toComplexityKey(option.key),
			label: option.label,
		})),
		members: [...membersById.values()].sort((left, right) =>
			left.name.localeCompare(right.name),
		),
		labels: labelRows,
	};
}

// Checks that an active task belongs to the authorized project.
export async function isActiveTaskInProject(projectId: string, taskId: string) {
	const [task] = await db
		.select({ id: tasks.id })
		.from(tasks)
		.where(
			and(
				eq(tasks.id, taskId),
				eq(tasks.projectId, projectId),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
			),
		)
		.limit(1);

	return Boolean(task);
}

export type TaskDependencyValidationResult = "valid" | "invalid" | "circular";

// Validates both dependency directions against active project tasks and cycles.
export async function validateTaskDependencies(
	projectId: string,
	taskId: string,
	dependencyIds: string[],
	blockingTaskIds: string[],
): Promise<TaskDependencyValidationResult> {
	const relatedTaskIds = [...new Set([...dependencyIds, ...blockingTaskIds])];
	if (relatedTaskIds.includes(taskId)) return "invalid";

	const activeTasks = await db
		.select({ id: tasks.id })
		.from(tasks)
		.where(
			and(
				eq(tasks.projectId, projectId),
				isNull(tasks.archivedAt),
				isNull(tasks.deletedAt),
			),
		);
	const activeTaskIds = new Set(activeTasks.map((task) => task.id));
	if (!activeTaskIds.has(taskId)) return "invalid";
	if (relatedTaskIds.some((id) => !activeTaskIds.has(id))) return "invalid";

	const dependencyRows = await db
		.select({
			taskId: taskDependencies.taskId,
			dependsOnTaskId: taskDependencies.dependsOnTaskId,
		})
		.from(taskDependencies)
		.where(eq(taskDependencies.projectId, projectId));
	const dependencyGraph = new Map<string, string[]>();
	for (const dependency of dependencyRows) {
		if (!activeTaskIds.has(dependency.taskId)) continue;
		if (!activeTaskIds.has(dependency.dependsOnTaskId)) continue;
		if (dependency.taskId === taskId) continue;
		if (dependency.dependsOnTaskId === taskId) continue;
		const current = dependencyGraph.get(dependency.taskId) ?? [];
		current.push(dependency.dependsOnTaskId);
		dependencyGraph.set(dependency.taskId, current);
	}
	dependencyGraph.set(taskId, dependencyIds);
	for (const blockingTaskId of blockingTaskIds) {
		const current = dependencyGraph.get(blockingTaskId) ?? [];
		current.push(taskId);
		dependencyGraph.set(blockingTaskId, current);
	}

	// Detects cycles after applying both proposed relationship lists.
	const visiting = new Set<string>();
	const visited = new Set<string>();
	function hasCycle(currentTaskId: string): boolean {
		if (visiting.has(currentTaskId)) return true;
		if (visited.has(currentTaskId)) return false;
		visiting.add(currentTaskId);
		for (const dependencyId of dependencyGraph.get(currentTaskId) ?? []) {
			if (hasCycle(dependencyId)) return true;
		}
		visiting.delete(currentTaskId);
		visited.add(currentTaskId);
		return false;
	}

	return activeTasks.some((task) => hasCycle(task.id)) ? "circular" : "valid";
}

// Checks whether a task still has at least one unfinished prerequisite.
export async function hasIncompleteTaskDependencies(
	projectId: string,
	taskId: string,
) {
	const dependencyTask = alias(tasks, "dependency_task");
	const [incompleteDependency] = await db
		.select({ id: taskDependencies.dependsOnTaskId })
		.from(taskDependencies)
		.innerJoin(
			dependencyTask,
			eq(taskDependencies.dependsOnTaskId, dependencyTask.id),
		)
		.where(
			and(
				eq(taskDependencies.projectId, projectId),
				eq(taskDependencies.taskId, taskId),
				isNull(dependencyTask.completedAt),
				isNull(dependencyTask.archivedAt),
				isNull(dependencyTask.deletedAt),
			),
		)
		.limit(1);

	return Boolean(incompleteDependency);
}

// Confirms every requested label belongs to the active project.
export async function canUseLabelsInProject(
	projectId: string,
	labelIds: string[],
) {
	if (labelIds.length === 0) return true;

	const matchingLabels = await db
		.select({ id: labels.id })
		.from(labels)
		.where(and(eq(labels.projectId, projectId), inArray(labels.id, labelIds)));

	return matchingLabels.length === labelIds.length;
}

// Confirms every requested assignee has an active project membership.
export async function canAssignUsersToProject(
	projectId: string,
	userIds: string[],
) {
	if (userIds.length === 0) return true;

	const members = await db
		.select({ userId: projectMembers.userId })
		.from(projectMembers)
		.innerJoin(projects, eq(projectMembers.projectId, projects.id))
		.where(
			and(eq(projectMembers.projectId, projectId), isNull(projects.deletedAt)),
		);
	const allowedIds = new Set(members.map((member) => member.userId));

	return userIds.every((userId) => allowedIds.has(userId));
}
