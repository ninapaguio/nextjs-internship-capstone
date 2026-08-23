import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, exists, inArray, isNull, notExists } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, projectMembers, projects, tasks, teams } from "@/lib/db/schema";
import type { CreateProjectInput, UpdateProjectInput } from "@/types";

type InsertProjectInput = CreateProjectInput & {
	createdById: string;
};

const defaultKanbanLists = [
	"Backlog",
	"Current sprint",
	"In progress",
	"In review",
	"Done",
] as const;

// Checks that the selected application user owns the current project row.
function hasProjectOwnerMembership(applicationUserId: string) {
	return exists(
		db
			.select({ userId: projectMembers.userId })
			.from(projectMembers)
			.where(
				and(
					eq(projectMembers.projectId, projects.id),
					eq(projectMembers.userId, applicationUserId),
					eq(projectMembers.accessRole, "owner"),
				),
			),
	);
}

// checks again if all tasks complete before marking completed
function canCompleteProject() {
	const activeTaskConditions = and(
		eq(tasks.projectId, projects.id),
		isNull(tasks.archivedAt),
		isNull(tasks.deletedAt),
		isNull(lists.archivedAt),
		isNull(lists.deletedAt),
	);

	return and(
		exists(
			db
				.select({ id: tasks.id })
				.from(tasks)
				.innerJoin(
					lists,
					and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
				)
				.where(activeTaskConditions),
		),
		notExists(
			db
				.select({ id: tasks.id })
				.from(tasks)
				.innerJoin(
					lists,
					and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
				)
				.where(and(activeTaskConditions, isNull(tasks.completedAt))),
		),
	);
}

// Inserts a solo project, its default workflow, and creator ownership.
export async function insertProject(input: InsertProjectInput) {
	const projectId = randomUUID();
	const [projectRows] = await db.batch([
		db
			.insert(projects)
			.values({ ...input, id: projectId })
			.returning({ id: projects.id }),
		db.insert(projectMembers).values({
			projectId,
			userId: input.createdById,
			accessRole: "owner",
			addedById: input.createdById,
		}),
		db.insert(lists).values(
			defaultKanbanLists.map((name, position) => ({
				projectId,
				name,
				position,
			})),
		),
	]);

	return projectRows[0] ?? null;
}

// Updates one active project managed by its owner or a designated manager.
export async function updateManagedProject(
	projectId: string,
	applicationUserId: string,
	input: Omit<UpdateProjectInput, "projectId">,
) {
	const [project] = await db
		.update(projects)
		.set({ ...input, updatedAt: new Date() })
		.where(
			and(
				eq(projects.id, projectId),
				input.status === "completed" ? canCompleteProject() : undefined,
				exists(
					db
						.select({ userId: projectMembers.userId })
						.from(projectMembers)
						.where(
							and(
								eq(projectMembers.projectId, projects.id),
								eq(projectMembers.userId, applicationUserId),
								inArray(projectMembers.accessRole, ["owner", "manager"]),
							),
						),
				),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.returning({ id: projects.id });

	return project ?? null;
}

// Archives or soft-deletes one project owned by the application user.
export async function changeOwnedProjectLifecycle(
	projectId: string,
	applicationUserId: string,
	action: "archive" | "delete",
) {
	const now = new Date();
	const [projectRows] = await db.batch([
		db
			.update(projects)
			.set({
				status: "archived",
				archivedAt: now,
				deletedAt: action === "delete" ? now : undefined,
				updatedAt: now,
			})
			.where(
				and(
					eq(projects.id, projectId),
					hasProjectOwnerMembership(applicationUserId),
					isNull(projects.deletedAt),
					isNull(projects.archivedAt),
				),
			)
			.returning({ id: projects.id }),
		db
			.update(teams)
			.set({
				status: "archived",
				archivedAt: now,
				deletedAt: action === "delete" ? now : undefined,
				updatedAt: now,
			})
			.where(
				and(
					eq(teams.projectId, projectId),
					exists(
						db
							.select({ id: projects.id })
							.from(projects)
							.where(
								and(
									eq(projects.id, projectId),
									hasProjectOwnerMembership(applicationUserId),
									eq(projects.status, "archived"),
									eq(projects.archivedAt, now),
									eq(projects.updatedAt, now),
									action === "delete"
										? eq(projects.deletedAt, now)
										: isNull(projects.deletedAt),
								),
							),
					),
				),
			),
	] as const);

	return projectRows[0] ?? null;
}
