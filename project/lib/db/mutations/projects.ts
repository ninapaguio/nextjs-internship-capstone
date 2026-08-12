import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import type { CreateProjectInput, UpdateProjectInput } from "@/types";

type InsertProjectInput = CreateProjectInput & {
	createdById: string;
};

// Inserts one validated project owned by an application user.
export async function insertProject(input: InsertProjectInput) {
	const [project] = await db.insert(projects).values(input).returning({
		id: projects.id,
	});

	return project ?? null;
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
				eq(projects.createdById, applicationUserId),
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
				eq(projects.createdById, applicationUserId),
				isNull(projects.deletedAt),
				isNull(projects.archivedAt),
			),
		)
		.returning({ id: projects.id });

	return project ?? null;
}
