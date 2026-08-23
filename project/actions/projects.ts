"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { db } from "@/lib/db";
import {
	changeOwnedProjectLifecycle,
	insertProject,
	updateManagedProject,
} from "@/lib/db/mutations/projects";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import { lists, tasks } from "@/lib/db/schema";
import {
	createProjectSchema,
	projectLifecycleSchema,
	updateProjectSchema,
} from "@/lib/validations";
import type {
	CreateProjectActionState,
	ProjectMutationActionState,
} from "@/types";

// Creates a solo project and makes the authenticated creator its owner.
export async function createProject(
	_previousState: CreateProjectActionState,
	formData: FormData,
): Promise<CreateProjectActionState> {
	const { userId: clerkId } = await auth();

	if (!clerkId) {
		return { status: "error", message: "Sign in to create a project." };
	}

	const parsed = createProjectSchema.safeParse({
		name: formData.get("name"),
		description: formData.get("description"),
		startDate: formData.get("startDate"),
		endDate: formData.get("endDate"),
	});

	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the highlighted fields and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);

		if (!applicationUser) {
			return {
				status: "error",
				message:
					"Your account is still being prepared. Please try again shortly.",
			};
		}

		await insertProject({
			...parsed.data,
			createdById: applicationUser.id,
		});

		revalidatePath("/projects");
		revalidatePath("/dashboard");

		return { status: "success", message: "Project created successfully." };
	} catch {
		return {
			status: "error",
			message: "We could not create the project. Please try again.",
		};
	}
}

// Updates project details or performs an allowed owner/manager status transition.
export async function updateProject(
	formData: FormData,
): Promise<ProjectMutationActionState> {
	const { userId: clerkId } = await auth();
	if (!clerkId)
		return { status: "error", message: "Sign in to edit projects." };

	const parsed = updateProjectSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name") ?? undefined,
		description: formData.has("description")
			? formData.get("description")
			: undefined,
		startDate: formData.has("startDate")
			? formData.get("startDate")
			: undefined,
		endDate: formData.has("endDate") ? formData.get("endDate") : undefined,
		status: formData.get("status") ?? undefined,
	});

	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the highlighted fields and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const { projectId, ...changes } = parsed.data;
	const accessibleProject = await getAccessibleProjectById(
		projectId,
		applicationUser.id,
	);
	if (
		!accessibleProject ||
		(accessibleProject.accessRole !== "owner" &&
			accessibleProject.accessRole !== "manager")
	) {
		return {
			status: "error",
			message: "Only the project owner or a manager can edit it.",
		};
	}

	if (changes.status && changes.status !== accessibleProject.status) {
		const transition = `${accessibleProject.status}:${changes.status}`;
		const allowedTransitions = new Set([
			"inactive:active",
			"active:inactive",
			"active:completed",
			"completed:active",
		]);
		if (!allowedTransitions.has(transition)) {
			return {
				status: "error",
				message: "That project status change is not allowed.",
			};
		}
	}

	if (changes.status === "completed") {
		const [{ incompleteCount, totalCount }] = await db
			.select({
				incompleteCount: sql<number>`count(*) filter (where ${tasks.completedAt} is null)::int`,
				totalCount: sql<number>`count(*)::int`,
			})
			.from(tasks)
			.innerJoin(
				lists,
				and(eq(tasks.listId, lists.id), eq(tasks.projectId, lists.projectId)),
			)
			.where(
				and(
					eq(tasks.projectId, projectId),
					isNull(tasks.archivedAt),
					isNull(tasks.deletedAt),
					isNull(lists.archivedAt),
					isNull(lists.deletedAt),
				),
			);

		if (totalCount === 0) {
			return {
				status: "error",
				message: "Add at least one task before completing this project.",
			};
		}

		if (incompleteCount > 0) {
			return {
				status: "error",
				message: `Complete all tasks (${incompleteCount} remaining) before marking this project as complete.`,
			};
		}
	}

	const project = await updateManagedProject(
		projectId,
		applicationUser.id,
		changes,
	);
	if (!project) {
		return {
			status: "error",
			message: "Only the project owner or a manager can edit it.",
		};
	}

	revalidatePath("/projects");
	revalidatePath(`/projects/${projectId}`);
	return { status: "success", message: "Project updated successfully." };
}

// Archives or soft-deletes a project after validating project ownership.
export async function changeProjectLifecycle(
	formData: FormData,
): Promise<ProjectMutationActionState> {
	const { userId: clerkId } = await auth();
	if (!clerkId)
		return { status: "error", message: "Sign in to manage projects." };

	const parsed = projectLifecycleSchema.safeParse({
		projectId: formData.get("projectId"),
		action: formData.get("action"),
	});
	if (!parsed.success || parsed.data.action === "restore") {
		return { status: "error", message: "Invalid project action." };
	}

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const project = await changeOwnedProjectLifecycle(
		parsed.data.projectId,
		applicationUser.id,
		parsed.data.action,
	);
	if (!project) {
		return {
			status: "error",
			message: "Only the project owner can perform this action.",
		};
	}

	revalidatePath("/projects");
	revalidatePath("/dashboard");
	return {
		status: "success",
		message:
			parsed.data.action === "archive"
				? "Project archived successfully."
				: "Project deleted successfully.",
	};
}
