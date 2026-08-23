import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { formatDateKey } from "@/lib/calendar";
import { db } from "@/lib/db";
import {
	labels,
	lists,
	priorityOptions,
	projectMembers,
	projects,
	taskAssignees,
	tasks,
	users,
} from "@/lib/db/schema";
import { createProjectHref } from "@/lib/project-slug";
import type {
	CalendarData,
	CalendarTaskCreationOptions,
	CalendarTaskItem,
	UpcomingDeadlineItem,
} from "@/types";

// Loads only project-scoped columns, labels, and priorities needed by the calendar task form.
export async function getCalendarTaskCreationOptionsForUser(
	applicationUserId: string,
): Promise<CalendarTaskCreationOptions> {
	const [destinationRows, priorityRows, labelRows] = await Promise.all([
		db
			.select({
				projectId: projects.id,
				projectName: projects.name,
				columnId: lists.id,
				columnName: lists.name,
			})
			.from(projects)
			.innerJoin(
				projectMembers,
				and(
					eq(projectMembers.projectId, projects.id),
					eq(projectMembers.userId, applicationUserId),
				),
			)
			.innerJoin(
				lists,
				and(
					eq(lists.projectId, projects.id),
					isNull(lists.archivedAt),
					isNull(lists.deletedAt),
				),
			)
			.where(
				and(
					isNull(projects.archivedAt),
					isNull(projects.deletedAt),
					ne(projects.status, "completed"),
					or(
						ne(projects.status, "inactive"),
						inArray(projectMembers.accessRole, ["owner", "manager"]),
					),
				),
			)
			.orderBy(asc(projects.name), asc(lists.position)),
		db
			.select({ id: priorityOptions.id, label: priorityOptions.label })
			.from(priorityOptions)
			.where(eq(priorityOptions.isActive, true))
			.orderBy(asc(priorityOptions.sortOrder)),
		db
			.select({
				projectId: labels.projectId,
				id: labels.id,
				name: labels.name,
				color: labels.color,
			})
			.from(labels)
			.innerJoin(
				projectMembers,
				and(
					eq(projectMembers.projectId, labels.projectId),
					eq(projectMembers.userId, applicationUserId),
				),
			)
			.orderBy(asc(labels.name)),
	]);

	const projectsById = new Map<
		string,
		CalendarTaskCreationOptions["projects"][number]
	>();
	for (const row of destinationRows) {
		const project = projectsById.get(row.projectId) ?? {
			id: row.projectId,
			name: row.projectName,
			columns: [],
			labels: [],
		};
		project.columns.push({ id: row.columnId, name: row.columnName });
		projectsById.set(row.projectId, project);
	}
	for (const label of labelRows) {
		projectsById.get(label.projectId)?.labels.push({
			id: label.id,
			name: label.name,
			color: label.color,
		});
	}

	return {
		currentUserId: applicationUserId,
		projects: Array.from(projectsById.values()),
		priorities: priorityRows,
	};
}

// Narrows raw database priority strings to supported keys.
function toPriorityKey(key: string): "low" | "medium" | "high" {
	if (key === "low" || key === "high") return key;
	return "medium";
}

// Converts a YYYY-MM-DD string into a human-readable date label.
function formatDateLabel(dateStr: string): string {
	const [yearStr, monthStr, dayStr] = dateStr.split("-");
	if (!yearStr || !monthStr || !dayStr) return dateStr;

	const date = new Date(
		Number.parseInt(yearStr, 10),
		Number.parseInt(monthStr, 10) - 1,
		Number.parseInt(dayStr, 10),
	);

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// Fetches all project schedules and task deadlines accessible to the signed-in user.
export async function getCalendarDataForUser(
	applicationUserId: string,
): Promise<CalendarData> {
	const userProjects = await db
		.select({
			id: projects.id,
			name: projects.name,
			startDate: projects.startDate,
			endDate: projects.endDate,
			status: projects.status,
		})
		.from(projects)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(and(isNull(projects.deletedAt), isNull(projects.archivedAt)))
		.orderBy(asc(projects.name));

	if (userProjects.length === 0) {
		return {
			tasks: [],
			upcomingDeadlines: [],
		};
	}

	const projectIds = userProjects.map((p) => p.id);
	const projectMap = new Map(userProjects.map((p) => [p.id, p]));

	// Fetch all active tasks
	const taskRows = await db
		.select({
			id: tasks.id,
			projectId: tasks.projectId,
			title: tasks.title,
			dueDate: tasks.dueDate,
			completedAt: tasks.completedAt,
			priorityKey: priorityOptions.key,
			priorityLabel: priorityOptions.label,
		})
		.from(tasks)
		.innerJoin(
			lists,
			and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
		)
		.innerJoin(priorityOptions, eq(tasks.priorityId, priorityOptions.id))
		.where(
			and(
				inArray(tasks.projectId, projectIds),
				isNull(tasks.deletedAt),
				isNull(tasks.archivedAt),
				isNull(lists.deletedAt),
				isNull(lists.archivedAt),
				isNotNull(tasks.dueDate),
			),
		)
		.orderBy(asc(tasks.dueDate));

	const todayStr = formatDateKey(new Date());

	// Fetch signed-in user assignments and deadline-table
	const taskIds = taskRows.map((task) => task.id);
	const upcomingTaskIds = taskRows
		.filter(
			(task) =>
				task.dueDate !== null && task.dueDate >= todayStr && !task.completedAt,
		)
		.map((task) => task.id);
	const [assignedTaskRows, assigneeRows] = await Promise.all([
		taskIds.length
			? db
					.select({ taskId: taskAssignees.taskId })
					.from(taskAssignees)
					.where(
						and(
							inArray(taskAssignees.taskId, taskIds),
							eq(taskAssignees.userId, applicationUserId),
						),
					)
			: Promise.resolve([]),
		upcomingTaskIds.length
			? db
					.select({
						taskId: taskAssignees.taskId,
						userId: users.id,
						firstName: users.firstName,
						lastName: users.lastName,
						email: users.email,
					})
					.from(taskAssignees)
					.innerJoin(users, eq(taskAssignees.userId, users.id))
					.where(
						and(
							inArray(taskAssignees.taskId, upcomingTaskIds),
							isNull(users.deletedAt),
						),
					)
			: Promise.resolve([]),
	]);

	const assignedTaskIds = new Set(assignedTaskRows.map((row) => row.taskId));
	const assigneesByTaskId = new Map<string, string[]>();
	for (const assignee of assigneeRows) {
		const name =
			[assignee.firstName, assignee.lastName].filter(Boolean).join(" ") ||
			assignee.email;
		const current = assigneesByTaskId.get(assignee.taskId) ?? [];
		current.push(name);
		assigneesByTaskId.set(assignee.taskId, current);
	}

	// Build calendar tasks list and upcoming deadlines
	const calendarTasks: CalendarTaskItem[] = [];
	const upcomingDeadlines: UpcomingDeadlineItem[] = [];

	for (const task of taskRows) {
		if (!task.dueDate) continue;

		const project = projectMap.get(task.projectId);
		const projectName = project?.name ?? "Project";
		const projectHref = project
			? createProjectHref(project.id, project.name)
			: "/projects";
		const taskHref = project ? `${projectHref}?task=${task.id}` : "/projects";
		const priorityKey = toPriorityKey(task.priorityKey);

		if (assignedTaskIds.has(task.id)) {
			calendarTasks.push({
				id: task.id,
				title: task.title,
				date: task.dueDate,
				type: "task",
				projectName,
				priority: priorityKey,
				isCompleted: Boolean(task.completedAt),
				href: taskHref,
			});
		}

		const assignees = assigneesByTaskId.get(task.id) ?? [];
		const primaryAssignee = assignees.length > 0 ? assignees[0] : "Unassigned";

		// Only include uncompleted tasks due today or in the future in upcoming deadlines
		if (task.dueDate >= todayStr && !task.completedAt) {
			const deadlineType: UpcomingDeadlineItem["type"] =
				priorityKey === "high"
					? "task-high"
					: priorityKey === "low"
						? "task-low"
						: "task-medium";

			upcomingDeadlines.push({
				id: task.id,
				title: task.title,
				project: projectName,
				projectHref,
				type: deadlineType,
				date: formatDateLabel(task.dueDate),
				rawDate: task.dueDate,
				assignee: primaryAssignee,
				priority: priorityKey,
				href: taskHref,
			});
		}
	}

	// Add timeline milestones for available projects joined by the signed-in user.
	for (const project of userProjects) {
		const projectHref = createProjectHref(project.id, project.name);

		if (project.endDate) {
			calendarTasks.push({
				id: `project-end-${project.id}`,
				title: `${project.name} · End`,
				date: project.endDate,
				type: "project_deadline",
				projectName: project.name,
				href: projectHref,
			});

			// Only include active projects with future or current end dates
			if (project.endDate >= todayStr && project.status !== "completed") {
				upcomingDeadlines.push({
					id: `project-end-${project.id}`,
					title: `${project.name} Completion`,
					project: project.name,
					projectHref,
					type: "project",
					date: formatDateLabel(project.endDate),
					rawDate: project.endDate,
					assignee: "Team",
					href: projectHref,
				});
			}
		}

		if (project.startDate) {
			calendarTasks.push({
				id: `project-start-${project.id}`,
				title: `${project.name} · Start`,
				date: project.startDate,
				type: "project_start",
				projectName: project.name,
				href: projectHref,
			});
		}
	}

	// Sort upcoming deadlines by raw date ascending
	upcomingDeadlines.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

	return {
		tasks: calendarTasks,
		upcomingDeadlines,
	};
}
