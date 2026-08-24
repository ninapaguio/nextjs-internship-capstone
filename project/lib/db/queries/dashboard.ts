import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
	calculateDueDateState,
	describeDashboardActivity,
	formatActorDisplayName,
	formatRelativeTime,
	normalizePriorityKey,
} from "@/lib/dashboard-helpers";
import { db } from "@/lib/db";
import {
	lists,
	priorityOptions,
	projectMembers,
	projects,
	taskActivities,
	taskAssignees,
	tasks,
	users,
} from "@/lib/db/schema";
import { createProjectHref, createProjectTaskHref } from "@/lib/project-slug";
import type {
	DashboardActivityItem,
	DashboardData,
	DashboardProjectItem,
	DashboardSummaryMetrics,
	DashboardTaskItem,
} from "@/types/dashboard";
import type { ProjectAccessRole } from "@/types/teams";

interface AccessibleProjectRow {
	id: string;
	status: "inactive" | "active" | "completed" | "archived";
	accessRole: ProjectAccessRole;
}

// Loads non-archived, non-deleted projects where the application user is a member.
async function getAccessibleProjectsForUser(
	applicationUserId: string,
): Promise<AccessibleProjectRow[]> {
	return db
		.select({
			id: projects.id,
			status: projects.status,
			accessRole: projectMembers.accessRole,
		})
		.from(projects)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(and(isNull(projects.deletedAt), isNull(projects.archivedAt)));
}

// Calculates overview data the user can accesss using bounded SQL queries.
export async function getDashboardDataForUser(
	applicationUserId: string,
): Promise<DashboardData> {
	const accessibleProjects =
		await getAccessibleProjectsForUser(applicationUserId);

	if (accessibleProjects.length === 0) {
		return {
			hasAccessibleProjects: false,
			summary: {
				activeProjects: 0,
				myActiveTasks: 0,
				myOverdueTasks: 0,
				dueThisWeek: 0,
			},
			myTasks: [],
			activeProjects: [],
			recentActivity: [],
		};
	}

	const roleByProjectId = new Map<string, ProjectAccessRole>();
	for (const p of accessibleProjects) {
		roleByProjectId.set(p.id, p.accessRole);
	}

	const activeAccessibleProjects = accessibleProjects.filter(
		(p) => p.status === "active",
	);

	if (activeAccessibleProjects.length === 0) {
		return {
			hasAccessibleProjects: true,
			summary: {
				activeProjects: 0,
				myActiveTasks: 0,
				myOverdueTasks: 0,
				dueThisWeek: 0,
			},
			myTasks: [],
			activeProjects: [],
			recentActivity: [],
		};
	}

	const activeProjectIds = activeAccessibleProjects.map((p) => p.id);

	// Date markers in UTC format (YYYY-MM-DD)
	const now = new Date();
	const todayKey = now.toISOString().slice(0, 10);
	const in6Days = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
	const todayPlus6DaysKey = in6Days.toISOString().slice(0, 10);

	// loads all dashboard data at the same time
	const [summaryRows, myTaskRows, activeProjectRows, recentActivityRows] =
		await Promise.all([
			// summary metrics
			db
				.select({
					myActiveTasks: sql<number>`count(distinct ${tasks.id})::int`,
					myOverdueTasks: sql<number>`count(distinct case when ${tasks.dueDate} is not null and ${tasks.dueDate} < ${todayKey} then ${tasks.id} end)::int`,
					dueThisWeek: sql<number>`count(distinct case when ${tasks.dueDate} is not null and ${tasks.dueDate} >= ${todayKey} and ${tasks.dueDate} <= ${todayPlus6DaysKey} then ${tasks.id} end)::int`,
				})
				.from(tasks)
				.innerJoin(
					lists,
					and(
						eq(tasks.listId, lists.id),
						eq(tasks.projectId, lists.projectId),
						isNull(lists.archivedAt),
						isNull(lists.deletedAt),
					),
				)
				.innerJoin(
					taskAssignees,
					and(
						eq(tasks.id, taskAssignees.taskId),
						eq(taskAssignees.userId, applicationUserId),
					),
				)
				.where(
					and(
						inArray(tasks.projectId, activeProjectIds),
						isNull(tasks.completedAt),
						isNull(tasks.archivedAt),
						isNull(tasks.deletedAt),
					),
				),

			// My Tasks (Top 6 ordered completely in SQL before LIMIT)
			db
				.select({
					id: tasks.id,
					title: tasks.title,
					dueDate: tasks.dueDate,
					projectId: tasks.projectId,
					projectName: projects.name,
					columnName: lists.name,
					priorityKey: priorityOptions.key,
					priorityLabel: priorityOptions.label,
				})
				.from(tasks)
				.innerJoin(
					lists,
					and(
						eq(tasks.listId, lists.id),
						eq(tasks.projectId, lists.projectId),
						isNull(lists.archivedAt),
						isNull(lists.deletedAt),
					),
				)
				.innerJoin(projects, eq(tasks.projectId, projects.id))
				.innerJoin(
					taskAssignees,
					and(
						eq(tasks.id, taskAssignees.taskId),
						eq(taskAssignees.userId, applicationUserId),
					),
				)
				.innerJoin(priorityOptions, eq(tasks.priorityId, priorityOptions.id))
				.where(
					and(
						inArray(tasks.projectId, activeProjectIds),
						isNull(tasks.completedAt),
						isNull(tasks.archivedAt),
						isNull(tasks.deletedAt),
					),
				)
				.orderBy(
					sql`case when ${tasks.dueDate} is not null and ${tasks.dueDate} < ${todayKey} then 1
								 when ${tasks.dueDate} = ${todayKey} then 2
								 when ${tasks.dueDate} is not null and ${tasks.dueDate} > ${todayKey} then 3
								 else 4 end asc`,
					asc(tasks.dueDate),
					desc(priorityOptions.sortOrder),
					asc(tasks.title),
				)
				.limit(5),

			// Active Projects (Top 5 ordered by overdue desc, progress % asc, name asc)
			db
				.select({
					id: projects.id,
					name: projects.name,
					totalTasks: sql<number>`count(distinct ${tasks.id})::int`,
					completedTasks: sql<number>`count(distinct case when ${tasks.completedAt} is not null then ${tasks.id} end)::int`,
					overdueTasks: sql<number>`count(distinct case when ${tasks.completedAt} is null and ${tasks.dueDate} is not null and ${tasks.dueDate} < ${todayKey} then ${tasks.id} end)::int`,
				})
				.from(projects)
				.leftJoin(
					lists,
					and(
						eq(lists.projectId, projects.id),
						isNull(lists.archivedAt),
						isNull(lists.deletedAt),
					),
				)
				.leftJoin(
					tasks,
					and(
						eq(tasks.listId, lists.id),
						isNull(tasks.archivedAt),
						isNull(tasks.deletedAt),
					),
				)
				.where(inArray(projects.id, activeProjectIds))
				.groupBy(projects.id, projects.name)
				.orderBy(
					sql`count(distinct case when ${tasks.completedAt} is null and ${tasks.dueDate} is not null and ${tasks.dueDate} < ${todayKey} then ${tasks.id} end) desc`,
					sql`case when count(distinct ${tasks.id}) > 0 then (count(distinct case when ${tasks.completedAt} is not null then ${tasks.id} end)::float / count(distinct ${tasks.id})) else 0 end asc`,
					asc(projects.name),
				)
				.limit(5),

			// Recent Activity (Task activities from accessible projects with left-joined actor)
			db
				.select({
					id: taskActivities.id,
					action: taskActivities.action,
					fieldName: taskActivities.fieldName,
					oldValue: taskActivities.oldValue,
					newValue: taskActivities.newValue,
					createdAt: taskActivities.createdAt,
					taskId: tasks.id,
					taskTitle: tasks.title,
					projectId: projects.id,
					projectName: projects.name,
					actorFirstName: users.firstName,
					actorLastName: users.lastName,
					actorAvatarUrl: users.imageUrl,
					actorDeletedAt: users.deletedAt,
					actorId: users.id,
				})
				.from(taskActivities)
				.innerJoin(tasks, eq(taskActivities.taskId, tasks.id))
				.innerJoin(
					lists,
					and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
				)
				.innerJoin(projects, eq(tasks.projectId, projects.id))
				.leftJoin(users, eq(taskActivities.actorId, users.id))
				.where(
					and(
						inArray(tasks.projectId, activeProjectIds),
						isNull(projects.deletedAt),
						isNull(projects.archivedAt),
						isNull(lists.deletedAt),
						isNull(lists.archivedAt),
						isNull(tasks.deletedAt),
						isNull(tasks.archivedAt),
					),
				)
				.orderBy(desc(taskActivities.createdAt))
				.limit(10),
		]);

	// Summary View
	const summary: DashboardSummaryMetrics = {
		activeProjects: activeAccessibleProjects.length,
		myActiveTasks: summaryRows[0]?.myActiveTasks ?? 0,
		myOverdueTasks: summaryRows[0]?.myOverdueTasks ?? 0,
		dueThisWeek: summaryRows[0]?.dueThisWeek ?? 0,
	};

	// My tasks view
	const myTasks: DashboardTaskItem[] = myTaskRows.map((t) => {
		const dueState = calculateDueDateState(t.dueDate, todayKey);
		const priorityKey = normalizePriorityKey(t.priorityKey);
		const href = createProjectTaskHref(t.projectId, t.projectName, t.id);

		return {
			id: t.id,
			title: t.title,
			projectName: t.projectName,
			columnName: t.columnName,
			dueDate: t.dueDate,
			priorityKey,
			priorityLabel: t.priorityLabel,
			isOverdue: dueState.isOverdue,
			isDueToday: dueState.isDueToday,
			href,
		};
	});

	// active projects view
	const activeProjects: DashboardProjectItem[] = activeProjectRows.map((p) => {
		const role = roleByProjectId.get(p.id) ?? "member";
		const progressPercentage =
			p.totalTasks > 0
				? Math.round((p.completedTasks / p.totalTasks) * 100)
				: 0;
		const href = createProjectHref(p.id, p.name);

		return {
			id: p.id,
			name: p.name,
			accessRole: role,
			totalTasks: p.totalTasks,
			completedTasks: p.completedTasks,
			overdueTasks: p.overdueTasks,
			progressPercentage,
			href,
		};
	});

	// recent activity view
	const recentActivity: DashboardActivityItem[] = recentActivityRows.map(
		(a) => {
			const isDeletedActor = !a.actorId || Boolean(a.actorDeletedAt);
			const actorName = formatActorDisplayName(
				a.actorFirstName,
				a.actorLastName,
				isDeletedActor,
			);
			const description = describeDashboardActivity(
				a.action,
				a.fieldName,
				a.oldValue,
				a.newValue,
			);
			const relativeTime = formatRelativeTime(
				a.createdAt?.toISOString() ?? "",
				now,
			);
			const href = createProjectTaskHref(a.projectId, a.projectName, a.taskId);

			return {
				id: a.id,
				actorName,
				actorAvatarUrl: isDeletedActor ? null : a.actorAvatarUrl,
				description,
				taskTitle: a.taskTitle,
				projectName: a.projectName,
				relativeTime,
				href,
			};
		},
	);

	return {
		hasAccessibleProjects: true,
		summary,
		myTasks,
		activeProjects,
		recentActivity,
	};
}
