"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	changeOwnedProjectLifecycle,
	insertProject,
	updateOwnedProject,
} from "@/lib/db/mutations/projects";
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

// Updates a project after validating owner access.
export async function updateProject(
	formData: FormData,
): Promise<ProjectMutationActionState> {
	const { userId: clerkId } = await auth();
	if (!clerkId)
		return { status: "error", message: "Sign in to edit projects." };

	const parsed = updateProjectSchema.safeParse({
		projectId: formData.get("projectId"),
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

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const { projectId, ...changes } = parsed.data;
	const project = await updateOwnedProject(
		projectId,
		applicationUser.id,
		changes,
	);
	if (!project) {
		return { status: "error", message: "Only the project owner can edit it." };
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
