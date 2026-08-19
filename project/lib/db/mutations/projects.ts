import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, exists, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects, teams } from "@/lib/db/schema";
import type { CreateProjectInput, UpdateProjectInput } from "@/types";

type InsertProjectInput = CreateProjectInput & {
	createdById: string;
};

// Inserts a solo project and grants its creator owner access
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
	]);

	return projectRows[0] ?? null;
}

// Updates one non-deleted project owned by the application user.
export async function updateOwnedProject(
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
				exists(
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
	const [project] = await db
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
				exists(
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
				),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.returning({ id: projects.id });

	if (project) {
		await db
			.update(teams)
			.set({
				status: "archived",
				archivedAt: now,
				deletedAt: action === "delete" ? now : undefined,
				updatedAt: now,
			})
			.where(eq(teams.projectId, projectId));
	}

	return project ?? null;
}
