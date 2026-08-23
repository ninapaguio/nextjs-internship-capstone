"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	changeBoardListLifecycle as changeBoardListLifecycleMutation,
	changeBoardTaskLifecycle as changeBoardTaskLifecycleMutation,
	insertBoardComment,
	insertBoardLabel,
	insertBoardList,
	insertBoardTask,
	moveBoardTask as moveBoardTaskMutation,
	moveBoardTasks as moveBoardTasksMutation,
	updateBoardList as updateBoardListMutation,
	updateBoardTask as updateBoardTaskMutation,
} from "@/lib/db/mutations/board";
import {
	canAssignUsersToProject,
	canUseLabelsInProject,
	hasActiveTasksDependingOnTask,
	hasActiveTasksInList,
	hasIncompleteTaskDependencies,
	isActiveListInProject,
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
	moveTasksSchema,
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

// Loads the signed-in application user and their accessible project membership.
async function getBoardAuthorizationContext(projectId: string) {
	const { userId: clerkId } = await auth();
	if (!clerkId) return null;

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) return null;

	const project = await getAccessibleProjectById(projectId, applicationUser.id);
	if (!project) return null;

	return { applicationUser, project };
}

// Allows task changes for managers, and for members only after the project starts.
async function authorizeBoardMember(projectId: string) {
	const context = await getBoardAuthorizationContext(projectId);
	if (!context) return null;

	const { applicationUser, project } = context;
	if (
		project.status === "completed" ||
		(project.status === "inactive" && project.accessRole === "member")
	) {
		return null;
	}

	return applicationUser;
}

// Restricts structural column changes to the project owner and managers.
async function authorizeBoardManager(projectId: string) {
	const context = await getBoardAuthorizationContext(projectId);
	if (!context) return null;

	const { applicationUser, project } = context;
	if (
		project.status === "completed" ||
		(project.accessRole !== "owner" && project.accessRole !== "manager")
	) {
		return null;
	}

	return applicationUser;
}

// Revalidates pages that display board tasks or project task totals.
async function revalidateBoardPages() {
	revalidatePath("/projects");
	revalidatePath("/projects/[slug]", "page");
}

// Refreshes project-card task totals without rerendering the open Zustand board.
function revalidateProjectList() {
	revalidatePath("/projects");
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
		const applicationUser = await authorizeBoardMember(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot comment on this board." };
		}
		const rateLimit = await checkRateLimit("add-comment", applicationUser.id);
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
			!(await isActiveTaskInProject(parsed.data.projectId, parsed.data.taskId))
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
		return { status: "error", message: "Could not post the comment." };
	}
}

// Validates and creates a reusable label for an authorized project board.
export async function createBoardLabel(
	formData: FormData,
): Promise<CreateBoardLabelActionState> {
	const parsed = labelSchema.safeParse({
		projectId: formData.get("projectId"),
		name: formData.get("name"),
		color: formData.get("color"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid label name and color.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		if (!(await authorizeBoardMember(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}

		const label = await insertBoardLabel(parsed.data);
		if (!label)
			return { status: "error", message: "The label was not created." };

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
		if (!(await authorizeBoardManager(parsed.data.projectId))) {
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
		return { status: "error", message: "Could not create the column." };
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
		if (!(await authorizeBoardManager(identifiers.data))) {
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
		return { status: "error", message: "Could not update the column." };
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
		if (!(await authorizeBoardManager(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}
		if (
			parsed.data.action !== "restore" &&
			(await hasActiveTasksInList(parsed.data.projectId, parsed.data.listId))
		) {
			return {
				status: "error",
				message:
					"This column still has active tasks. Move or archive them first.",
			};
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
		return { status: "error", message: "Could not change the column." };
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
		priorityId: formData.get("priorityId"),
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
		const applicationUser = await authorizeBoardMember(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot update this board." };
		}
		if (
			!(await isActiveListInProject(parsed.data.projectId, parsed.data.listId))
		) {
			return {
				status: "error",
				message: "This column is archived, deleted, or unavailable.",
			};
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
		return { status: "error", message: "Could not create the task." };
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
		priorityId: formData.get("priorityId") || undefined,
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
		blockingTaskIds:
			formData.get("replaceBlockingTasks") === "true"
				? formData.getAll("blockingTaskIds")
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
		const applicationUser = await authorizeBoardMember(parsed.data.projectId);
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
		if (
			parsed.data.dependencyIds !== undefined ||
			parsed.data.blockingTaskIds !== undefined
		) {
			const dependencyValidation = await validateTaskDependencies(
				parsed.data.projectId,
				parsed.data.taskId,
				parsed.data.dependencyIds,
				parsed.data.blockingTaskIds,
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
		return { status: "error", message: "Could not update the task." };
	}
}

// Archives, restores, or soft-deletes one task after validating project access.
export async function changeBoardTaskLifecycle(
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
		if (!(await authorizeBoardMember(parsed.data.projectId))) {
			return { status: "error", message: "You cannot update this board." };
		}
		if (
			parsed.data.action !== "restore" &&
			(await hasActiveTasksDependingOnTask(
				parsed.data.projectId,
				parsed.data.taskId,
			))
		) {
			return {
				status: "error",
				message:
					"This task blocks other active tasks. Remove those dependencies first.",
			};
		}
		const task = await changeBoardTaskLifecycleMutation(
			parsed.data.projectId,
			parsed.data.taskId,
			parsed.data.action,
		);
		if (!task) return { status: "error", message: "The task was not changed." };

		await revalidateBoardPages();
		return {
			status: "success",
			message:
				parsed.data.action === "archive"
					? "Task archived successfully."
					: parsed.data.action === "restore"
						? "Task restored successfully."
						: "Task deleted successfully.",
		};
	} catch {
		return { status: "error", message: "Could not change the task." };
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
		const applicationUser = await authorizeBoardMember(parsed.data.projectId);
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

		revalidateProjectList();
		return { status: "success", message: "Task moved successfully." };
	} catch {
		return { status: "error", message: "Could not move the task." };
	}
}

// Persists one validated group move after confirming access to the project board.
export async function moveBoardTasks(
	formData: FormData,
): Promise<BoardActionState> {
	const parsed = moveTasksSchema.safeParse({
		projectId: formData.get("projectId"),
		taskIds: formData.getAll("taskIds"),
		targetListId: formData.get("targetListId"),
		position: formData.get("position"),
	});
	if (!parsed.success) {
		return { status: "error", message: "Invalid task movement." };
	}

	try {
		const applicationUser = await authorizeBoardMember(parsed.data.projectId);
		if (!applicationUser) {
			return { status: "error", message: "You cannot update this board." };
		}

		const result = await moveBoardTasksMutation(
			parsed.data.projectId,
			parsed.data.taskIds,
			parsed.data.targetListId,
			parsed.data.position,
			applicationUser.id,
		);
		if (!result) {
			return { status: "error", message: "The selected tasks were not moved." };
		}

		revalidateProjectList();
		return {
			status: "success",
			message: `${result.movedCount} ${result.movedCount === 1 ? "task" : "tasks"} moved successfully.`,
		};
	} catch {
		return {
			status: "error",
			message: "Could not move the selected tasks.",
		};
	}
}
