import "server-only";

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	complexityOptions,
	labels,
	lists,
	projectMembers,
	projects,
	taskAssignees,
	taskLabels,
	tasks,
	users,
} from "@/lib/db/schema";
import type {
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

// Produces a readable member name from the synchronized Clerk profile fields.
function getMemberName(member: {
	firstName: string | null;
	lastName: string | null;
	username: string;
}) {
	return (
		[member.firstName, member.lastName].filter(Boolean).join(" ") ||
		member.username
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
				.where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt)))
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
					username: users.username,
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
					username: users.username,
					imageUrl: users.imageUrl,
				})
				.from(taskAssignees)
				.innerJoin(users, eq(taskAssignees.userId, users.id))
				.where(
					and(inArray(taskAssignees.taskId, taskIds), isNull(users.deletedAt)),
				)
		: [];
	const taskLabelRows = taskIds.length
		? await db
				.select({ taskId: taskLabels.taskId, labelId: taskLabels.labelId })
				.from(taskLabels)
				.where(inArray(taskLabels.taskId, taskIds))
		: [];

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
