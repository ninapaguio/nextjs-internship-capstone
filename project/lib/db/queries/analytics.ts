import "server-only";

import {
	and,
	asc,
	desc,
	eq,
	exists,
	gte,
	inArray,
	isNotNull,
	isNull,
	lte,
	notExists,
	sql,
} from "drizzle-orm";
import {
	calculateCompletionRate,
	deriveAttentionItems,
	formatUtcDateKey,
	generateEmptyCompletionTrend,
	getDateRangeWindow,
	mergeCompletionCountsIntoIntervals,
} from "@/lib/analytics-helpers";
import { db } from "@/lib/db";
import {
	lists,
	projectMembers,
	projects,
	taskAssignees,
	tasks,
	users,
} from "@/lib/db/schema";
import { createProjectHref } from "@/lib/project-slug";
import type {
	AccessibleProjectOption,
	AnalyticsData,
	AnalyticsFilterState,
	ProjectProgressItem,
	WorkloadMemberItem,
} from "@/types/analytics";

interface AccessibleProjectRow extends AccessibleProjectOption {
	status: "inactive" | "active" | "completed" | "archived";
}

// Loads all non-archived, non-deleted projects where the application user is a member.
export async function getAccessibleProjectsForUser(
	applicationUserId: string,
): Promise<AccessibleProjectRow[]> {
	return db
		.select({
			id: projects.id,
			name: projects.name,
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
}

// Calculates analytics using only projects the user can accesss using bounded SQL queries.
export async function getAnalyticsDataForUser(
	applicationUserId: string,
	rawFilter: AnalyticsFilterState,
): Promise<AnalyticsData> {
	const accessibleProjects =
		await getAccessibleProjectsForUser(applicationUserId);

	// When user has no projects, return clean empty analytics view model.
	if (accessibleProjects.length === 0) {
		return {
			normalizedFilter: { project: "all", range: rawFilter.range },
			accessibleProjects: [],
			summary: {
				totalProjects: 0,
				totalTasks: 0,
				completedTasks: 0,
				completionRate: 0,
				overdueTasks: 0,
				completedInRange: 0,
			},
			completionTrend: generateEmptyCompletionTrend(rawFilter.range),
			projectProgress: [],
			workload: [],
			attentionItems: [],
			hasAccessibleProjects: false,
			hasActiveTasks: false,
		};
	}

	// Normalize project filter against user's accessible projects
	const isSpecificProject =
		rawFilter.project !== "all" &&
		accessibleProjects.some((p) => p.id === rawFilter.project);

	const normalizedProject = isSpecificProject ? rawFilter.project : "all";
	const normalizedFilter: AnalyticsFilterState = {
		project: normalizedProject,
		range: rawFilter.range,
	};
	const accessibleProjectOptions = accessibleProjects.map(({ id, name }) => ({
		id,
		name,
	}));
	const activeScopedProjectIds = accessibleProjects
		.filter(
			(project) =>
				project.status === "active" &&
				(!isSpecificProject || project.id === rawFilter.project),
		)
		.map((project) => project.id);

	// Planned and completed projects stay selectable but do not affect operational task metrics.
	if (activeScopedProjectIds.length === 0) {
		return {
			normalizedFilter,
			accessibleProjects: accessibleProjectOptions,
			summary: {
				totalProjects: isSpecificProject ? 1 : accessibleProjects.length,
				totalTasks: 0,
				completedTasks: 0,
				completionRate: 0,
				overdueTasks: 0,
				completedInRange: 0,
			},
			completionTrend: generateEmptyCompletionTrend(rawFilter.range),
			projectProgress: [],
			workload: [],
			attentionItems: [],
			hasAccessibleProjects: true,
			hasActiveTasks: false,
		};
	}

	const now = new Date();
	const currentDateKey = formatUtcDateKey(now);
	const window = getDateRangeWindow(rawFilter.range, now);
	const projectTotalTasks = sql<number>`count(distinct ${tasks.id})::int`;
	const projectCompletedTasks = sql<number>`count(distinct ${tasks.id}) filter (where ${tasks.completedAt} is not null)::int`;
	const projectOverdueTasks = sql<number>`count(distinct ${tasks.id}) filter (
		where ${tasks.completedAt} is null
		and ${tasks.dueDate} is not null
		and ${tasks.dueDate} < ${currentDateKey}
	)::int`;
	const projectIncompleteTasks = sql<number>`count(distinct ${tasks.id}) filter (where ${tasks.completedAt} is null)::int`;
	const projectProgressPercentage = sql<number>`coalesce(round(
		100.0 * count(distinct ${tasks.id}) filter (where ${tasks.completedAt} is not null)
		/ nullif(count(distinct ${tasks.id}), 0)
	), 0)::int`;

	// Loads all analytics results at the same time.
	const [
		summaryRows,
		trendRows,
		projectProgressRows,
		assignedWorkloadRows,
		unassignedWorkloadRows,
		stalledProjectRows,
		highBacklogRows,
	] = await Promise.all([
		// summary totals and completion in range
		db
			.select({
				totalTasks: projectTotalTasks,
				completedTasks: projectCompletedTasks,
				overdueTasks: projectOverdueTasks,
				completedInRange: sql<number>`count(distinct ${tasks.id}) filter (
					where ${tasks.completedAt} is not null
					and ${tasks.completedAt} >= ${window.startDate}
					and ${tasks.completedAt} <= ${window.endDate}
				)::int`,
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
			.where(
				and(
					inArray(tasks.projectId, activeScopedProjectIds),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
				),
			),

		// Completion trend grouped by UTC day
		db
			.select({
				dateKey: sql<string>`to_char(${tasks.completedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
				completedCount: sql<number>`count(${tasks.id})::int`,
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
			.where(
				and(
					inArray(tasks.projectId, activeScopedProjectIds),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNotNull(tasks.completedAt),
					gte(tasks.completedAt, window.startDate),
					lte(tasks.completedAt, window.endDate),
				),
			)
			.groupBy(
				sql`to_char(${tasks.completedAt} at time zone 'UTC', 'YYYY-MM-DD')`,
			),

		// Calculates each project's task progress.
		db
			.select({
				projectId: projects.id,
				projectName: projects.name,
				totalTasks: sql<number>`count(distinct ${tasks.id})::int`,
				completedTasks: sql<number>`count(distinct ${tasks.id}) filter (where ${tasks.completedAt} is not null)::int`,
				overdueTasks: sql<number>`count(distinct ${tasks.id}) filter (
					where ${tasks.completedAt} is null
					and ${tasks.dueDate} is not null
					and ${tasks.dueDate} < ${currentDateKey}
				)::int`,
			})
			.from(projects)
			.leftJoin(
				tasks,
				and(
					eq(tasks.projectId, projects.id),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					exists(
						db
							.select({ id: lists.id })
							.from(lists)
							.where(
								and(
									eq(lists.id, tasks.listId),
									eq(lists.projectId, tasks.projectId),
									isNull(lists.archivedAt),
									isNull(lists.deletedAt),
								),
							),
					),
				),
			)
			.where(
				and(
					inArray(projects.id, activeScopedProjectIds),
					isNull(projects.archivedAt),
					isNull(projects.deletedAt),
				),
			)
			.groupBy(projects.id, projects.name)
			.having(sql`${projectTotalTasks} > 0`)
			.orderBy(
				desc(projectOverdueTasks),
				asc(projectProgressPercentage),
				desc(projectIncompleteTasks),
				asc(projects.name),
			)
			.limit(10),

		// Workload distribution: Assigned active incomplete tasks by valid member
		db
			.select({
				userId: users.id,
				firstName: users.firstName,
				lastName: users.lastName,
				username: users.username,
				activeTasks: sql<number>`count(distinct ${tasks.id})::int`,
				overdueTasks: sql<number>`count(distinct ${tasks.id}) filter (
					where ${tasks.dueDate} is not null
					and ${tasks.dueDate} < ${currentDateKey}
				)::int`,
			})
			.from(taskAssignees)
			.innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
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
				projectMembers,
				and(
					eq(projectMembers.projectId, tasks.projectId),
					eq(projectMembers.userId, taskAssignees.userId),
				),
			)
			.innerJoin(
				users,
				and(eq(users.id, taskAssignees.userId), isNull(users.deletedAt)),
			)
			.where(
				and(
					inArray(tasks.projectId, activeScopedProjectIds),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(tasks.completedAt),
				),
			)
			.groupBy(users.id, users.firstName, users.lastName, users.username)
			.orderBy(desc(sql`count(distinct ${tasks.id})`), asc(users.firstName))
			.limit(9),

		// workload distribution: Unassigned active incomplete tasks
		db
			.select({
				unassignedCount: sql<number>`count(distinct ${tasks.id})::int`,
				unassignedOverdueCount: sql<number>`count(distinct ${tasks.id}) filter (
					where ${tasks.dueDate} is not null
					and ${tasks.dueDate} < ${currentDateKey}
				)::int`,
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
			.where(
				and(
					inArray(tasks.projectId, activeScopedProjectIds),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(tasks.completedAt),
					notExists(
						db
							.select({ taskId: taskAssignees.taskId })
							.from(taskAssignees)
							.innerJoin(
								projectMembers,
								and(
									eq(projectMembers.projectId, tasks.projectId),
									eq(projectMembers.userId, taskAssignees.userId),
								),
							)
							.innerJoin(
								users,
								and(
									eq(users.id, taskAssignees.userId),
									isNull(users.deletedAt),
								),
							)
							.where(eq(taskAssignees.taskId, tasks.id)),
					),
				),
			),

		// Finds active projects with unfinished tasks but no recent completions.
		db
			.select({
				id: projects.id,
				name: projects.name,
			})
			.from(projects)
			.where(
				and(
					inArray(projects.id, activeScopedProjectIds),
					isNull(projects.archivedAt),
					isNull(projects.deletedAt),
					exists(
						db
							.select({ id: tasks.id })
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
							.where(
								and(
									eq(tasks.projectId, projects.id),
									isNull(tasks.archivedAt),
									isNull(tasks.deletedAt),
									isNull(tasks.completedAt),
								),
							),
					),
					notExists(
						db
							.select({ id: tasks.id })
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
							.where(
								and(
									eq(tasks.projectId, projects.id),
									isNull(tasks.archivedAt),
									isNull(tasks.deletedAt),
									isNotNull(tasks.completedAt),
									gte(tasks.completedAt, window.startDate),
									lte(tasks.completedAt, window.endDate),
								),
							),
					),
				),
			),

		// Finds active projects with 10 or more unfinished tasks.
		db
			.select({
				id: projects.id,
				name: projects.name,
				incompleteTasks: sql<number>`count(distinct ${tasks.id})::int`,
			})
			.from(projects)
			.innerJoin(
				tasks,
				and(
					eq(tasks.projectId, projects.id),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(tasks.completedAt),
					exists(
						db
							.select({ id: lists.id })
							.from(lists)
							.where(
								and(
									eq(lists.id, tasks.listId),
									eq(lists.projectId, tasks.projectId),
									isNull(lists.archivedAt),
									isNull(lists.deletedAt),
								),
							),
					),
				),
			)
			.where(
				and(
					inArray(projects.id, activeScopedProjectIds),
					isNull(projects.archivedAt),
					isNull(projects.deletedAt),
				),
			)
			.groupBy(projects.id, projects.name)
			.having(sql`count(distinct ${tasks.id}) >= 10`),
	]);

	const summaryData = summaryRows[0] ?? {
		totalTasks: 0,
		completedTasks: 0,
		overdueTasks: 0,
		completedInRange: 0,
	};

	const totalTasks = summaryData.totalTasks;
	const completedTasks = summaryData.completedTasks;
	const overdueTasks = summaryData.overdueTasks;
	const completedInRange = summaryData.completedInRange;
	const completionRate = calculateCompletionRate(completedTasks, totalTasks);

	// Build continuous completion trend intervals with zero-filled gaps
	const completionTrend = mergeCompletionCountsIntoIntervals(
		trendRows,
		rawFilter.range,
		now,
	);

	// Map the project rows already prioritized and limited by PostgreSQL.
	const mappedProgress: ProjectProgressItem[] = projectProgressRows.map(
		(row) => {
			const rowTotal = row.totalTasks;
			const rowCompleted = row.completedTasks;
			const rowOverdue = row.overdueTasks;
			return {
				projectId: row.projectId,
				projectName: row.projectName,
				href: createProjectHref(row.projectId, row.projectName),
				totalTasks: rowTotal,
				completedTasks: rowCompleted,
				progressPercentage: calculateCompletionRate(rowCompleted, rowTotal),
				overdueTasks: rowOverdue,
				incompleteTasks: Math.max(0, rowTotal - rowCompleted),
			};
		},
	);

	// Compose workload list: Unassigned + Top 9 members
	const unassignedData = unassignedWorkloadRows[0] ?? {
		unassignedCount: 0,
		unassignedOverdueCount: 0,
	};

	const workload: WorkloadMemberItem[] = [];

	if (unassignedData.unassignedCount > 0) {
		workload.push({
			userId: null,
			name: "Unassigned",
			activeTasks: unassignedData.unassignedCount,
			overdueTasks: unassignedData.unassignedOverdueCount,
		});
	}

	for (const member of assignedWorkloadRows) {
		const displayName =
			[member.firstName, member.lastName].filter(Boolean).join(" ") ||
			member.username ||
			"Team Member";

		workload.push({
			userId: member.userId,
			name: displayName,
			activeTasks: member.activeTasks,
			overdueTasks: member.overdueTasks,
		});
	}

	// Derive actionable attention items across the full accessible scope
	const attentionItems = deriveAttentionItems({
		overdueTasksCount: overdueTasks,
		unassignedTasksCount: unassignedData.unassignedCount,
		stalledProjects: stalledProjectRows,
		highBacklogProjects: highBacklogRows,
	});

	return {
		normalizedFilter,
		accessibleProjects: accessibleProjectOptions,
		summary: {
			totalProjects: isSpecificProject ? 1 : accessibleProjects.length,
			totalTasks,
			completedTasks,
			completionRate,
			overdueTasks,
			completedInRange,
		},
		completionTrend,
		projectProgress: mappedProgress,
		workload,
		attentionItems,
		hasAccessibleProjects: true,
		hasActiveTasks: totalTasks > 0,
	};
}
