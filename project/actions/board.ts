"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	changeBoardListLifecycle as changeBoardListLifecycleMutation,
	insertBoardList,
	insertBoardTask,
	moveBoardTask as moveBoardTaskMutation,
	updateBoardList as updateBoardListMutation,
} from "@/lib/db/mutations/board";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import {
	createListSchema,
	createTaskSchema,
	listLifecycleSchema,
	moveTaskSchema,
	updateListSchema,
	uuidSchema,
} from "@/lib/validations";

export interface BoardActionState {
	status: "idle" | "success" | "error";
	message: string;
	data?: { id: string };
	fieldErrors?: Record<string, string[] | undefined>;
}

// Authenticates the current Clerk user and verifies access to a project board.
async function authorizeBoardProject(projectId: string) {
	const { userId: clerkId } = await auth();
	if (!clerkId) return null;

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) return null;

	const project = await getAccessibleProjectById(projectId, applicationUser.id);
	return project ? applicationUser : null;
}

// Revalidates pages that display board tasks or project task totals.
async function revalidateBoardPages() {
	revalidatePath("/projects");
	revalidatePath("/projects/[slug]", "page");
}

// Creates a project list.
export async function createBoardList(
	_previousState: BoardActionState,
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = createListSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		position: formData.get("position") || undefined,
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the column fields and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		if (!(await authorizeBoardProject(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const list = await insertBoardList(parsed.data);
		if (!list)
			return { status: "error", message: "The column was not created." };

		await revalidateBoardPages();
		return {
			status: "success",
			message: "Column created successfully.",
			data: { id: list.id },
		};
	} catch {
		return { status: "error", message: "We could not create the column." };
	}
}

// Updates a project list after validating its identifiers and editable fields.
export async function updateBoardList(
	formData: FormData,
): Promise<BoardActionState> {
	const identifiers = uuidSchema.safeParse(formData.get("projectId"));
	const listId = uuidSchema.safeParse(formData.get("listId"));
	const changes = updateListSchema.safeParse({
		name: formData.get("name") || undefined,
		position: formData.get("position") || undefined,
	});
	if (!identifiers.success || !listId.success || !changes.success) {
		return {
			status: "error",
			message: "Review the column fields and try again.",
		};
	}

	try {
		if (!(await authorizeBoardProject(identifiers.data))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const list = await updateBoardListMutation(
			identifiers.data,
			listId.data,
			changes.data,
		);
		if (!list)
			return { status: "error", message: "The column was not updated." };

		await revalidateBoardPages();
		return { status: "success", message: "Column updated successfully." };
	} catch {
		return { status: "error", message: "We could not update the column." };
	}
}

// Applies archive, restore, or delete behavior to one authorized board list.
export async function changeBoardListLifecycle(
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = listLifecycleSchema.safeParse({
		projectId: formData.get("projectId"),
		listId: formData.get("listId"),
		action: formData.get("action"),
	});
	if (!parsed.success)
		return { status: "error", message: "Invalid column action." };

	try {
		if (!(await authorizeBoardProject(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const list = await changeBoardListLifecycleMutation(
			parsed.data.projectId,
			parsed.data.listId,
			parsed.data.action,
		);
		if (!list)
			return { status: "error", message: "The column was not changed." };

		await revalidateBoardPages();
		return { status: "success", message: "Column updated successfully." };
	} catch {
		return { status: "error", message: "We could not change the column." };
	}
}

// Creates a task in an active list after validating and authorizing the board form.
export async function createBoardTask(
	_previousState: BoardActionState,
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = createTaskSchema.safeParse({
		projectId: formData.get("projectId"),
		listId: formData.get("listId"),
		title: formData.get("title"),
		description: formData.get("description"),
		complexityId: formData.get("complexityId"),
		dueDate: formData.get("dueDate"),
		position: formData.get("position") || undefined,
		assigneeIds: formData.getAll("assigneeIds"),
		labelIds: formData.getAll("labelIds"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the task fields and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		const applicationUser = await authorizeBoardProject(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot update this board." };
		}

		const {
			assigneeIds: _assigneeIds,
			labelIds: _labelIds,
			...taskInput
		} = parsed.data;
		const task = await insertBoardTask({
			...taskInput,
			createdById: applicationUser.id,
		});
		if (!task) return { status: "error", message: "The task was not created." };

		await revalidateBoardPages();
		return {
			status: "success",
			message: "Task created successfully.",
			data: { id: task.id },
		};
	} catch {
		return { status: "error", message: "We could not create the task." };
	}
}

// optimistic task movement after validating the target list and position
export async function moveBoardTask(
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = moveTaskSchema.safeParse({
		projectId: formData.get("projectId"),
		taskId: formData.get("taskId"),
		targetListId: formData.get("targetListId"),
		position: formData.get("position"),
	});
	if (!parsed.success)
		return { status: "error", message: "Invalid task movement." };

	try {
		if (!(await authorizeBoardProject(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const task = await moveBoardTaskMutation(
			parsed.data.projectId,
			parsed.data.taskId,
			parsed.data.targetListId,
			parsed.data.position,
		);
		if (!task) return { status: "error", message: "The task was not moved." };

		await revalidateBoardPages();
		return { status: "success", message: "Task moved successfully." };
	} catch {
		return { status: "error", message: "We could not move the task." };
	}
}
