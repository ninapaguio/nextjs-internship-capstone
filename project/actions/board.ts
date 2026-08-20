"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	changeBoardListLifecycle as changeBoardListLifecycleMutation,
	deleteBoardTask as deleteBoardTaskMutation,
	insertBoardComment,
	insertBoardList,
	insertBoardLabel,
	insertBoardTask,
	moveBoardTask as moveBoardTaskMutation,
	updateBoardList as updateBoardListMutation,
	updateBoardTask as updateBoardTaskMutation,
} from "@/lib/db/mutations/board";
import {
	canAssignUsersToProject,
	canUseLabelsInProject,
	hasIncompleteTaskDependencies,
	isActiveTaskInProject,
	validateTaskDependencies,
} from "@/lib/db/queries/board";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import { getBoardMemberOptionByUserId } from "@/lib/db/queries/users";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	boardCommentSchema,
	createListSchema,
	createTaskSchema,
	labelSchema,
	listLifecycleSchema,
	moveTaskSchema,
	taskLifecycleSchema,
	updateBoardTaskSchema,
	updateListSchema,
	uuidSchema,
} from "@/lib/validations";
import type {
	BoardActionState,
	CreateBoardCommentActionState,
	CreateBoardLabelActionState,
} from "@/types";

const DEFAULT_LABEL_COLOR = "#64748B";

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

// Validates and creates a task comment for an authorized project member.
export async function createBoardComment(
	_previousState: CreateBoardCommentActionState,
	formData: FormData,
): Promise<CreateBoardCommentActionState> {
	const parsed = boardCommentSchema.safeParse({
		projectId: formData.get("projectId"),
		taskId: formData.get("taskId"),
		content: formData.get("content"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid comment and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		const applicationUser = await authorizeBoardProject(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot comment on this board." };
		}
		const rateLimit = await checkRateLimit(
			"add-comment",
			applicationUser.id,
		);
		if (!rateLimit.allowed) {
			const retryAfterSeconds = Math.max(
				1,
				Math.ceil(((rateLimit.resetAt ?? Date.now()) - Date.now()) / 1_000),
			);
			return {
				status: "error",
				message: `Too many comments. Try again in ${retryAfterSeconds} seconds.`,
			};
		}
		if (
			!(await isActiveTaskInProject(
				parsed.data.projectId,
				parsed.data.taskId,
			))
		) {
			return { status: "error", message: "This task is not available." };
		}

		const author = await getBoardMemberOptionByUserId(applicationUser.id);
		if (!author) {
			return { status: "error", message: "Your profile is not available." };
		}
		const comment = await insertBoardComment(
			parsed.data.taskId,
			applicationUser.id,
			parsed.data.content,
		);
		if (!comment) {
			return { status: "error", message: "The comment was not created." };
		}

		await revalidateBoardPages();
		return {
			status: "success",
			message: "Comment posted.",
			data: {
				id: comment.id,
				body: comment.body,
				createdAt: comment.createdAt.toISOString(),
				author,
			},
		};
	} catch {
		return { status: "error", message: "We could not post the comment." };
	}
}

// Validates and creates a reusable label for an authorized project board.
export async function createBoardLabel(
	formData: FormData,
): Promise<CreateBoardLabelActionState> {
	const parsed = labelSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		color: DEFAULT_LABEL_COLOR,
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid label name.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		if (!(await authorizeBoardProject(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const label = await insertBoardLabel(parsed.data);
		if (!label) return { status: "error", message: "The label was not created." };

		await revalidateBoardPages();
		return {
			status: "success",
			message: "Label created successfully.",
			data: label,
		};
	} catch {
		return {
			status: "error",
			message: "That label may already exist in this project.",
		};
	}
}

// Creates a project list.
export async function createBoardList(
	_previousState: BoardActionState,
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = createListSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		description: formData.get("description"),
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
		description: formData.get("description"),
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

		if (
			!(await canAssignUsersToProject(
				parsed.data.projectId,
				parsed.data.assigneeIds,
			))
		) {
			return { status: "error", message: "One or more assignees are invalid." };
		}
		if (
			!(await canUseLabelsInProject(
				parsed.data.projectId,
				parsed.data.labelIds,
			))
		) {
			return { status: "error", message: "One or more labels are invalid." };
		}

		const task = await insertBoardTask({
			...parsed.data,
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

// Validates and authorizes updates to a task's details, placement, relationships,
// and completion before saving the changes and refreshing the board pages.
export async function updateBoardTask(
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = updateBoardTaskSchema.safeParse({
		projectId: formData.get("projectId"),
		taskId: formData.get("taskId"),
		listId: formData.get("listId") || undefined,
		title: formData.get("title") || undefined,
		description: formData.has("description")
			? formData.get("description")
			: undefined,
		complexityId: formData.get("complexityId") || undefined,
		dueDate: formData.has("dueDate") ? formData.get("dueDate") : undefined,
		completed: formData.get("completed") || undefined,
		assigneeIds:
			formData.get("replaceAssignees") === "true"
				? formData.getAll("assigneeIds")
				: undefined,
		labelIds:
			formData.get("replaceLabels") === "true"
				? formData.getAll("labelIds")
				: undefined,
		dependencyIds:
			formData.get("replaceDependencies") === "true"
				? formData.getAll("dependencyIds")
				: undefined,
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
		if (
			parsed.data.assigneeIds &&
			!(await canAssignUsersToProject(
				parsed.data.projectId,
				parsed.data.assigneeIds,
			))
		) {
			return { status: "error", message: "One or more assignees are invalid." };
		}
		if (
			parsed.data.labelIds &&
			!(await canUseLabelsInProject(
				parsed.data.projectId,
				parsed.data.labelIds,
			))
		) {
			return { status: "error", message: "One or more labels are invalid." };
		}
		if (parsed.data.dependencyIds) {
			const dependencyValidation = await validateTaskDependencies(
				parsed.data.projectId,
				parsed.data.taskId,
				parsed.data.dependencyIds,
			);
			if (dependencyValidation === "circular") {
				return {
					status: "error",
					message: "This dependency would create a circular task chain.",
				};
			}
			if (dependencyValidation === "invalid") {
				return {
					status: "error",
					message: "One or more dependencies are invalid.",
				};
			}
		}
		if (
			parsed.data.completed === true &&
			(await hasIncompleteTaskDependencies(
				parsed.data.projectId,
				parsed.data.taskId,
			))
		) {
			return {
				status: "error",
				message: "Complete every blocking task before completing this task.",
			};
		}

		const { projectId, taskId, ...changes } = parsed.data;
		const task = await updateBoardTaskMutation(
			projectId,
			taskId,
			applicationUser.id,
			changes,
		);
		if (!task) return { status: "error", message: "The task was not updated." };

		await revalidateBoardPages();
		return { status: "success", message: "Task updated successfully." };
	} catch {
		return { status: "error", message: "We could not update the task." };
	}
}

// Soft-deletes one task after validating access to its project board.
export async function deleteBoardTask(
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = taskLifecycleSchema.safeParse({
		projectId: formData.get("projectId"),
		taskId: formData.get("taskId"),
		action: formData.get("action"),
	});
	if (!parsed.success)
		return { status: "error", message: "Invalid task action." };

	try {
		if (!(await authorizeBoardProject(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}
		const task = await deleteBoardTaskMutation(
			parsed.data.projectId,
			parsed.data.taskId,
		);
		if (!task) return { status: "error", message: "The task was not deleted." };

		await revalidateBoardPages();
		return { status: "success", message: "Task deleted successfully." };
	} catch {
		return { status: "error", message: "We could not delete the task." };
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
		const applicationUser = await authorizeBoardProject(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot update this board." };
		}

		const task = await moveBoardTaskMutation(
			parsed.data.projectId,
			parsed.data.taskId,
			parsed.data.targetListId,
			parsed.data.position,
			applicationUser.id,
		);
		if (!task) return { status: "error", message: "The task was not moved." };

		await revalidateBoardPages();
		return { status: "success", message: "Task moved successfully." };
	} catch {
		return { status: "error", message: "We could not move the task." };
	}
}
