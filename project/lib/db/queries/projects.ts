import "server-only";

import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects, tasks, teams } from "@/lib/db/schema";

interface ProjectListQueryInput {
	applicationUserId: string;
	query: string;
	requestedPage: number;
	pageSize: number;
}

// Finds a non-archived project only when the application user can access it.
export async function getAccessibleProjectById(
	projectId: string,
	applicationUserId: string,
) {
	const [project] = await db
		.select({
			id: projects.id,
			teamId: teams.id,
			accessRole: projectMembers.accessRole,
			createdById: projects.createdById,
			name: projects.name,
			description: projects.description,
			startDate: projects.startDate,
			status: projects.status,
		})
		.from(projects)
		.leftJoin(
			teams,
			and(
				eq(teams.projectId, projects.id),
				isNull(teams.archivedAt),
				isNull(teams.deletedAt),
			),
		)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(
			and(
				eq(projects.id, projectId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.limit(1);

	return project ?? null;
}

// Loads one searchable, paginated project-list result for an application user.
export async function getProjectList({
	applicationUserId,
	query,
	requestedPage,
	pageSize,
}: ProjectListQueryInput) {
	const conditions = and(
		exists(
			db
				.select({ userId: projectMembers.userId })
				.from(projectMembers)
				.where(
					and(
						eq(projectMembers.projectId, projects.id),
						eq(projectMembers.userId, applicationUserId),
					),
				),
		),
		isNull(projects.deletedAt),
		isNull(projects.archivedAt),
		query
			? or(
					ilike(projects.name, `%${query}%`),
					ilike(projects.description, `%${query}%`),
				)
			: undefined,
	);

	const [{ count: totalProjects }] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(projects)
		.where(conditions);
	const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));
	const currentPage = Math.min(requestedPage, totalPages);

	const projectRows = await db
		.select({
			id: projects.id,
			teamId: teams.id,
			accessRole: projectMembers.accessRole,
			name: projects.name,
			description: projects.description,
			startDate: projects.startDate,
			teamName: sql<string>`case when ${teams.id} is null then 'Solo' else ${projects.name} end`,
			status: projects.status,
			endDate: projects.endDate,
			totalTasks: sql<number>`(
				select count(*)::int from ${tasks}
				where ${tasks.projectId} = ${projects.id} and ${tasks.archivedAt} is null and ${tasks.deletedAt} is null
			)`,
			totalMembers: sql<number>`(
				select count(*)::int from ${projectMembers}
				where ${projectMembers.projectId} = ${projects.id}
			)`,
			progressPercentage: sql<number>`coalesce((
				select round(
					100.0 * count(*) filter (where ${tasks.completedAt} is not null)
					/ nullif(count(*), 0)
				)::int from ${tasks}
				where ${tasks.projectId} = ${projects.id} and ${tasks.archivedAt} is null and ${tasks.deletedAt} is null
			), 0)`,
		})
		.from(projects)
		.leftJoin(
			teams,
			and(
				eq(teams.projectId, projects.id),
				isNull(teams.archivedAt),
				isNull(teams.deletedAt),
			),
		)
		.innerJoin(
			projectMembers,
			and(
				eq(projectMembers.projectId, projects.id),
				eq(projectMembers.userId, applicationUserId),
			),
		)
		.where(conditions)
		.orderBy(desc(projects.updatedAt), asc(projects.name))
		.limit(pageSize)
		.offset((currentPage - 1) * pageSize);

	return { currentPage, projectRows, totalPages, totalProjects };
}
