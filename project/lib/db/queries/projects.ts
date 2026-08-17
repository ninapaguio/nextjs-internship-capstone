import "server-only";

import {
	and,
	asc,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	or,
	sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, tasks, teamMembers, teams } from "@/lib/db/schema";

interface ProjectListQueryInput {
	applicationUserId: string;
	teamIds: string[];
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
			teamId: projects.teamId,
			createdById: projects.createdById,
			name: projects.name,
			description: projects.description,
			startDate: projects.startDate,
		})
		.from(projects)
		.leftJoin(teams, eq(projects.teamId, teams.id))
		.leftJoin(
			teamMembers,
			and(
				eq(teamMembers.teamId, projects.teamId),
				eq(teamMembers.userId, applicationUserId),
				eq(teamMembers.membershipStatus, "active"),
			),
		)
		.where(
			and(
				eq(projects.id, projectId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
				or(
					eq(projects.createdById, applicationUserId),
					eq(teams.createdById, applicationUserId),
					eq(teamMembers.userId, applicationUserId),
				),
			),
		)
		.limit(1);

	return project ?? null;
}

// Loads one searchable, paginated project-list result for an application user.
export async function getProjectList({
	applicationUserId,
	teamIds,
	query,
	requestedPage,
	pageSize,
}: ProjectListQueryInput) {
	const conditions = and(
		or(
			and(isNull(projects.teamId), eq(projects.createdById, applicationUserId)),
			teamIds.length > 0 ? inArray(projects.teamId, teamIds) : undefined,
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
			teamId: projects.teamId,
			name: projects.name,
			description: projects.description,
			startDate: projects.startDate,
			teamName: sql<string>`coalesce(${teams.name}, 'Personal')`,
			status: projects.status,
			endDate: projects.endDate,
			totalTasks: sql<number>`(
				select count(*)::int from ${tasks}
				where ${tasks.projectId} = ${projects.id} and ${tasks.deletedAt} is null
			)`,
			totalMembers: sql<number>`case
				when ${projects.teamId} is null then 1
				else (
					select count(*)::int from ${teamMembers}
					where ${teamMembers.teamId} = ${projects.teamId} and ${teamMembers.membershipStatus} = 'active'
				)
			end`,
			progressPercentage: sql<number>`coalesce((
				select round(
					100.0 * count(*) filter (where ${tasks.completedAt} is not null)
					/ nullif(count(*), 0)
				)::int from ${tasks}
				where ${tasks.projectId} = ${projects.id} and ${tasks.deletedAt} is null
			), 0)`,
		})
		.from(projects)
		.leftJoin(teams, eq(projects.teamId, teams.id))
		.where(conditions)
		.orderBy(desc(projects.updatedAt), asc(projects.name))
		.limit(pageSize)
		.offset((currentPage - 1) * pageSize);

	return { currentPage, projectRows, totalPages, totalProjects };
}
