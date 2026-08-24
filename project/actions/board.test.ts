import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	ensureApplicationUser: vi.fn(),
	getAccessibleProjectById: vi.fn(),
	getBoardMemberOptionByUserId: vi.fn(),
	checkRateLimit: vi.fn(),
	publishProjectBoardUpdate: vi.fn(),
	publishUserNotificationUpdates: vi.fn(),
	revalidatePath: vi.fn(),
	canAssignUsersToProject: vi.fn(),
	canUseLabelsInProject: vi.fn(),
	hasActiveTasksDependingOnTask: vi.fn(),
	hasActiveTasksInList: vi.fn(),
	hasIncompleteTaskDependencies: vi.fn(),
	isActiveListInProject: vi.fn(),
	isActiveTaskInProject: vi.fn(),
	validateTaskDependencies: vi.fn(),
	changeBoardListLifecycle: vi.fn(),
	changeBoardTaskLifecycle: vi.fn(),
	insertBoardComment: vi.fn(),
	insertBoardLabel: vi.fn(),
	insertBoardList: vi.fn(),
	insertBoardTask: vi.fn(),
	moveBoardTask: vi.fn(),
	moveBoardTasks: vi.fn(),
	updateBoardList: vi.fn(),
	updateBoardTask: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/ensure-application-user", () => ({
	ensureApplicationUser: mocks.ensureApplicationUser,
}));
vi.mock("@/lib/db/queries/projects", () => ({
	getAccessibleProjectById: mocks.getAccessibleProjectById,
}));
vi.mock("@/lib/db/queries/users", () => ({
	getBoardMemberOptionByUserId: mocks.getBoardMemberOptionByUserId,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/realtime/pusher-server", () => ({
	publishProjectBoardUpdate: mocks.publishProjectBoardUpdate,
	publishUserNotificationUpdates: mocks.publishUserNotificationUpdates,
}));
vi.mock("@/lib/db/queries/board", () => ({
	canAssignUsersToProject: mocks.canAssignUsersToProject,
	canUseLabelsInProject: mocks.canUseLabelsInProject,
	hasActiveTasksDependingOnTask: mocks.hasActiveTasksDependingOnTask,
	hasActiveTasksInList: mocks.hasActiveTasksInList,
	hasIncompleteTaskDependencies: mocks.hasIncompleteTaskDependencies,
	isActiveListInProject: mocks.isActiveListInProject,
	isActiveTaskInProject: mocks.isActiveTaskInProject,
	validateTaskDependencies: mocks.validateTaskDependencies,
}));
vi.mock("@/lib/db/mutations/board", () => ({
	changeBoardListLifecycle: mocks.changeBoardListLifecycle,
	changeBoardTaskLifecycle: mocks.changeBoardTaskLifecycle,
	insertBoardComment: mocks.insertBoardComment,
	insertBoardLabel: mocks.insertBoardLabel,
	insertBoardList: mocks.insertBoardList,
	insertBoardTask: mocks.insertBoardTask,
	moveBoardTask: mocks.moveBoardTask,
	moveBoardTasks: mocks.moveBoardTasks,
	updateBoardList: mocks.updateBoardList,
	updateBoardTask: mocks.updateBoardTask,
}));

import {
	changeBoardListLifecycle,
	changeBoardTaskLifecycle,
	createBoardComment,
	createBoardLabel,
	createBoardList,
	createBoardTask,
	moveBoardTask,
	moveBoardTasks,
	updateBoardList,
	updateBoardTask,
} from "@/actions/board";

const projectId = "11111111-1111-4111-8111-111111111111";
const listId = "22222222-2222-4222-8222-222222222222";
const priorityId = "33333333-3333-4333-8333-333333333333";
const applicationUserId = "44444444-4444-4444-8444-444444444444";
const taskId = "55555555-5555-4555-8555-555555555555";
const relatedTaskId = "66666666-6666-4666-8666-666666666666";
const assigneeId = "77777777-7777-4777-8777-777777777777";
const labelId = "88888888-8888-4888-8888-888888888888";

// Builds a valid request for creating one board column.
function createListForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("name", "Ready for review");
	formData.set("description", "");
	return formData;
}

// Builds a valid request for updating one board column.
function createListUpdateForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("listId", listId);
	formData.set("name", "Quality review");
	formData.set("description", "Ready for verification");
	return formData;
}

// Builds a valid request for adding one task comment.
function createCommentForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("taskId", taskId);
	formData.set("content", "Ready for review.");
	return formData;
}

// Builds a valid request for creating one project-scoped label.
function createLabelForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("name", "Urgent");
	formData.set("color", "#DC2626");
	return formData;
}

// Builds a valid request for moving one task to a target column position.
function createMoveTaskForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("taskId", taskId);
	formData.set("targetListId", listId);
	formData.set("position", "2");
	return formData;
}

// Builds a group-movement request from the supplied task identifiers.
function createMoveTasksForm(taskIds: string[]) {
	const formData = new FormData();
	formData.set("projectId", projectId);
	for (const id of taskIds) formData.append("taskIds", id);
	formData.set("targetListId", listId);
	formData.set("position", "1");
	return formData;
}

// Builds a valid request for changing one column's lifecycle.
function createListLifecycleForm(action: "archive" | "restore" | "delete") {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("listId", listId);
	formData.set("action", action);
	return formData;
}

// Builds a valid request for changing one task's lifecycle.
function createTaskLifecycleForm(action: "archive" | "restore" | "delete") {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("taskId", taskId);
	formData.set("action", action);
	return formData;
}

// Builds a relationship-only task update for one dependency direction.
function createDependencyUpdateForm(
	direction: "dependencies" | "blockingTasks",
) {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("taskId", taskId);
	if (direction === "dependencies") {
		formData.set("replaceDependencies", "true");
		formData.append("dependencyIds", relatedTaskId);
	} else {
		formData.set("replaceBlockingTasks", "true");
		formData.append("blockingTaskIds", relatedTaskId);
	}
	return formData;
}

// Builds a task update containing every project-scoped relationship and completion.
function createRelationshipUpdateForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("taskId", taskId);
	formData.set("replaceAssignees", "true");
	formData.append("assigneeIds", assigneeId);
	formData.set("replaceLabels", "true");
	formData.append("labelIds", labelId);
	formData.set("replaceDependencies", "true");
	formData.append("dependencyIds", relatedTaskId);
	formData.set("completed", "true");
	return formData;
}

// Builds the smallest valid task form used by the board action tests.
function createTaskForm() {
	const formData = new FormData();
	formData.set("projectId", projectId);
	formData.set("listId", listId);
	formData.set("title", "Prepare release notes");
	formData.set("description", "");
	formData.set("priorityId", priorityId);
	formData.set("dueDate", "");
	return formData;
}

describe("board authorization matrix", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "owner",
		});
		mocks.insertBoardList.mockResolvedValue({ id: listId });
		mocks.isActiveListInProject.mockResolvedValue(true);
		mocks.canAssignUsersToProject.mockResolvedValue(true);
		mocks.canUseLabelsInProject.mockResolvedValue(true);
		mocks.insertBoardTask.mockResolvedValue({
			id: taskId,
			notificationRecipientIds: [],
		});
	});

	it.each([
		["inactive", "owner", true],
		["inactive", "manager", true],
		["inactive", "member", false],
		["active", "owner", true],
		["active", "manager", true],
		["active", "member", false],
		["completed", "owner", false],
		["completed", "manager", false],
		["completed", "member", false],
	] as const)(
		"column mutation for a %s project and %s role is allowed=%s",
		async (status, accessRole, allowed) => {
			mocks.getAccessibleProjectById.mockResolvedValue({
				id: projectId,
				status,
				accessRole,
			});

			const result = await createBoardList(
				{ status: "idle", message: "" },
				createListForm(),
			);

			expect(result.status).toBe(allowed ? "success" : "error");
			if (allowed) {
				expect(mocks.insertBoardList).toHaveBeenCalled();
			} else {
				expect(mocks.insertBoardList).not.toHaveBeenCalled();
			}
		},
	);

	it.each([
		["inactive", "owner", true],
		["inactive", "manager", true],
		["inactive", "member", false],
		["active", "owner", true],
		["active", "manager", true],
		["active", "member", true],
		["completed", "owner", false],
		["completed", "manager", false],
		["completed", "member", false],
	] as const)(
		"task mutation for a %s project and %s role is allowed=%s",
		async (status, accessRole, allowed) => {
			mocks.getAccessibleProjectById.mockResolvedValue({
				id: projectId,
				status,
				accessRole,
			});

			const result = await createBoardTask(
				{ status: "idle", message: "" },
				createTaskForm(),
			);

			expect(result.status).toBe(allowed ? "success" : "error");
			if (allowed) {
				expect(mocks.insertBoardTask).toHaveBeenCalled();
			} else {
				expect(mocks.insertBoardTask).not.toHaveBeenCalled();
			}
		},
	);
});

describe("createBoardTask", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "owner",
		});
		mocks.isActiveListInProject.mockResolvedValue(true);
		mocks.canAssignUsersToProject.mockResolvedValue(true);
		mocks.canUseLabelsInProject.mockResolvedValue(true);
		mocks.insertBoardTask.mockResolvedValue({
			id: "55555555-5555-4555-8555-555555555555",
		});
	});

	// Prevents archived, deleted, missing, or cross-project columns from receiving tasks.
	it("rejects an unavailable target column before creating a task", async () => {
		mocks.isActiveListInProject.mockResolvedValue(false);

		const result = await createBoardTask(
			{ status: "idle", message: "" },
			createTaskForm(),
		);

		expect(result).toEqual({
			status: "error",
			message: "This column is archived, deleted, or unavailable.",
		});
		expect(mocks.canAssignUsersToProject).not.toHaveBeenCalled();
		expect(mocks.insertBoardTask).not.toHaveBeenCalled();
	});

	// Confirms an active project column continues through normal task creation.
	it("creates a task in an active project column", async () => {
		const result = await createBoardTask(
			{ status: "idle", message: "" },
			createTaskForm(),
		);

		expect(mocks.isActiveListInProject).toHaveBeenCalledWith(projectId, listId);
		expect(mocks.insertBoardTask).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId,
				listId,
				createdById: applicationUserId,
			}),
		);
		expect(result).toEqual({
			status: "success",
			message: "Task created successfully.",
			data: { id: "55555555-5555-4555-8555-555555555555" },
		});
	});
});

describe("createBoardComment", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "member",
		});
		mocks.checkRateLimit.mockResolvedValue({ allowed: true });
		mocks.isActiveTaskInProject.mockResolvedValue(true);
		mocks.getBoardMemberOptionByUserId.mockResolvedValue({
			id: applicationUserId,
			name: "Yuna Tester",
			imageUrl: null,
		});
		mocks.insertBoardComment.mockResolvedValue({
			id: "99999999-9999-4999-8999-999999999999",
			body: "Ready for review.",
			createdAt: new Date("2026-08-25T01:00:00.000Z"),
			notificationRecipientIds: [assigneeId],
		});
	});

	// Rejects excessive comment attempts before task and persistence work begins.
	it("enforces the comment rate limit", async () => {
		mocks.checkRateLimit.mockResolvedValue({ allowed: false });

		const result = await createBoardComment(
			{ status: "idle", message: "" },
			createCommentForm(),
		);

		expect(mocks.checkRateLimit).toHaveBeenCalledWith(
			"add-comment",
			applicationUserId,
		);
		expect(result).toEqual({
			status: "error",
			message: "Too many comments. Try again in 1 seconds.",
		});
		expect(mocks.isActiveTaskInProject).not.toHaveBeenCalled();
		expect(mocks.insertBoardComment).not.toHaveBeenCalled();
	});

	// Prevents comments on archived, deleted, missing, or cross-project tasks.
	it("rejects a comment for an unavailable task", async () => {
		mocks.isActiveTaskInProject.mockResolvedValue(false);

		const result = await createBoardComment(
			{ status: "idle", message: "" },
			createCommentForm(),
		);

		expect(result.message).toBe("This task is not available.");
		expect(mocks.getBoardMemberOptionByUserId).not.toHaveBeenCalled();
		expect(mocks.insertBoardComment).not.toHaveBeenCalled();
	});

	// Creates a comment, serializes its date, and publishes recipient notifications.
	it("creates an authorized comment", async () => {
		const result = await createBoardComment(
			{ status: "idle", message: "" },
			createCommentForm(),
		);

		expect(mocks.insertBoardComment).toHaveBeenCalledWith(
			projectId,
			taskId,
			applicationUserId,
			"Ready for review.",
		);
		expect(mocks.publishUserNotificationUpdates).toHaveBeenCalledWith([
			assigneeId,
		]);
		expect(result).toEqual({
			status: "success",
			message: "Comment posted.",
			data: {
				id: "99999999-9999-4999-8999-999999999999",
				body: "Ready for review.",
				createdAt: "2026-08-25T01:00:00.000Z",
				author: {
					id: applicationUserId,
					name: "Yuna Tester",
					imageUrl: null,
				},
			},
		});
	});

	// Rejects malformed input before authentication or rate-limit work.
	it("rejects an empty comment request", async () => {
		const result = await createBoardComment(
			{ status: "idle", message: "" },
			new FormData(),
		);

		expect(result.status).toBe("error");
		expect(result.fieldErrors).toEqual(
			expect.objectContaining({
				projectId: expect.any(Array),
				taskId: expect.any(Array),
				content: expect.any(Array),
			}),
		);
		expect(mocks.auth).not.toHaveBeenCalled();
		expect(mocks.checkRateLimit).not.toHaveBeenCalled();
	});
});

describe("label and list mutations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "owner",
		});
		mocks.insertBoardLabel.mockResolvedValue({
			id: labelId,
			name: "Urgent",
			color: "#DC2626",
		});
		mocks.updateBoardList.mockResolvedValue({ id: listId });
	});

	// Creates a project-scoped label and returns its selectable view model.
	it("creates a valid board label", async () => {
		const result = await createBoardLabel(createLabelForm());

		expect(mocks.insertBoardLabel).toHaveBeenCalledWith({
			projectId,
			name: "Urgent",
			color: "#DC2626",
		});
		expect(result).toEqual({
			status: "success",
			message: "Label created successfully.",
			data: { id: labelId, name: "Urgent", color: "#DC2626" },
		});
	});

	// Converts uniqueness or persistence failures into a non-secret user message.
	it("returns a safe error for a duplicate board label", async () => {
		mocks.insertBoardLabel.mockRejectedValue(new Error("unique constraint"));

		const result = await createBoardLabel(createLabelForm());

		expect(result).toEqual({
			status: "error",
			message: "That label may already exist in this project.",
		});
	});

	// Rejects an invalid color before authorization and persistence.
	it("rejects a malformed label color", async () => {
		const formData = createLabelForm();
		formData.set("color", "red");

		const result = await createBoardLabel(formData);

		expect(result.status).toBe("error");
		expect(result.fieldErrors?.color).toContain(
			"Color must be a six-digit hex value",
		);
		expect(mocks.auth).not.toHaveBeenCalled();
		expect(mocks.insertBoardLabel).not.toHaveBeenCalled();
	});

	// Saves editable column fields through the manager-authorized mutation boundary.
	it("updates a board column", async () => {
		const result = await updateBoardList(createListUpdateForm());

		expect(mocks.updateBoardList).toHaveBeenCalledWith(
			projectId,
			listId,
			expect.objectContaining({
				name: "Quality review",
				description: "Ready for verification",
			}),
		);
		expect(result).toEqual({
			status: "success",
			message: "Column updated successfully.",
		});
	});
});

describe("changeBoardListLifecycle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "owner",
		});
		mocks.hasActiveTasksInList.mockResolvedValue(false);
		mocks.changeBoardListLifecycle.mockResolvedValue({ id: listId });
	});

	// Prevents a column from hiding tasks that are still active.
	it("rejects deleting a column that contains active tasks", async () => {
		mocks.hasActiveTasksInList.mockResolvedValue(true);

		const result = await changeBoardListLifecycle(
			createListLifecycleForm("delete"),
		);

		expect(result).toEqual({
			status: "error",
			message:
				"This column still has active tasks. Move or archive them first.",
		});
		expect(mocks.changeBoardListLifecycle).not.toHaveBeenCalled();
	});

	// Restoring a column is allowed because it does not hide its tasks.
	it("does not apply the active-task guard when restoring a column", async () => {
		const result = await changeBoardListLifecycle(
			createListLifecycleForm("restore"),
		);

		expect(mocks.hasActiveTasksInList).not.toHaveBeenCalled();
		expect(mocks.changeBoardListLifecycle).toHaveBeenCalledWith(
			projectId,
			listId,
			"restore",
		);
		expect(result.status).toBe("success");
	});
});

describe("changeBoardTaskLifecycle", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "member",
		});
		mocks.hasActiveTasksDependingOnTask.mockResolvedValue(false);
		mocks.changeBoardTaskLifecycle.mockResolvedValue({
			id: taskId,
		});
	});

	// Keeps active dependent tasks from silently losing their prerequisite.
	it("rejects archiving a task that blocks active tasks", async () => {
		mocks.hasActiveTasksDependingOnTask.mockResolvedValue(true);

		const result = await changeBoardTaskLifecycle(
			createTaskLifecycleForm("archive"),
		);

		expect(result).toEqual({
			status: "error",
			message:
				"This task blocks other active tasks. Remove those dependencies first.",
		});
		expect(mocks.changeBoardTaskLifecycle).not.toHaveBeenCalled();
	});

	// Restoring a task cannot remove a prerequisite, so it skips the guard.
	it("does not apply the dependent-task guard when restoring a task", async () => {
		const result = await changeBoardTaskLifecycle(
			createTaskLifecycleForm("restore"),
		);

		expect(mocks.hasActiveTasksDependingOnTask).not.toHaveBeenCalled();
		expect(mocks.changeBoardTaskLifecycle).toHaveBeenCalled();
		expect(result.status).toBe("success");
	});
});

describe("updateBoardTask dependency validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "member",
		});
		mocks.validateTaskDependencies.mockResolvedValue("valid");
		mocks.updateBoardTask.mockResolvedValue({ id: taskId });
	});

	// Checks dependencies even when blocked tasks were not included in the form.
	it("validates dependency changes when blocking tasks are omitted", async () => {
		mocks.validateTaskDependencies.mockResolvedValue("circular");

		const result = await updateBoardTask(
			createDependencyUpdateForm("dependencies"),
		);

		expect(mocks.validateTaskDependencies).toHaveBeenCalledWith(
			projectId,
			taskId,
			[relatedTaskId],
			undefined,
		);
		expect(result.message).toBe(
			"This dependency would create a circular task chain.",
		);
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});

	// Checks blocked tasks even when dependencies were not included in the form.
	it("validates blocking-task changes when dependencies are omitted", async () => {
		mocks.validateTaskDependencies.mockResolvedValue("circular");

		const result = await updateBoardTask(
			createDependencyUpdateForm("blockingTasks"),
		);

		expect(mocks.validateTaskDependencies).toHaveBeenCalledWith(
			projectId,
			taskId,
			undefined,
			[relatedTaskId],
		);
		expect(result.message).toBe(
			"This dependency would create a circular task chain.",
		);
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});
});

describe("updateBoardTask relationships and completion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "member",
		});
		mocks.canAssignUsersToProject.mockResolvedValue(true);
		mocks.canUseLabelsInProject.mockResolvedValue(true);
		mocks.validateTaskDependencies.mockResolvedValue("valid");
		mocks.hasIncompleteTaskDependencies.mockResolvedValue(false);
		mocks.updateBoardTask.mockResolvedValue({
			id: taskId,
			notificationRecipientIds: [assigneeId],
		});
	});

	// Rejects assignees who are not members of the task's project.
	it("rejects an out-of-project assignee before saving", async () => {
		mocks.canAssignUsersToProject.mockResolvedValue(false);

		const result = await updateBoardTask(createRelationshipUpdateForm());

		expect(mocks.canAssignUsersToProject).toHaveBeenCalledWith(projectId, [
			assigneeId,
		]);
		expect(result.message).toBe("One or more assignees are invalid.");
		expect(mocks.canUseLabelsInProject).not.toHaveBeenCalled();
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});

	// Rejects labels that do not belong to the task's project.
	it("rejects an out-of-project label before saving", async () => {
		mocks.canUseLabelsInProject.mockResolvedValue(false);

		const result = await updateBoardTask(createRelationshipUpdateForm());

		expect(mocks.canUseLabelsInProject).toHaveBeenCalledWith(projectId, [
			labelId,
		]);
		expect(result.message).toBe("One or more labels are invalid.");
		expect(mocks.validateTaskDependencies).not.toHaveBeenCalled();
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});

	// Rejects missing, archived, deleted, or cross-project dependency tasks.
	it("rejects invalid dependencies before completion checks", async () => {
		mocks.validateTaskDependencies.mockResolvedValue("invalid");

		const result = await updateBoardTask(createRelationshipUpdateForm());

		expect(result.message).toBe("One or more dependencies are invalid.");
		expect(mocks.hasIncompleteTaskDependencies).not.toHaveBeenCalled();
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});

	// Requires every active prerequisite to finish before completing the task.
	it("blocks completion while a dependency is incomplete", async () => {
		mocks.hasIncompleteTaskDependencies.mockResolvedValue(true);

		const result = await updateBoardTask(createRelationshipUpdateForm());

		expect(mocks.hasIncompleteTaskDependencies).toHaveBeenCalledWith(
			projectId,
			taskId,
		);
		expect(result.message).toBe(
			"Complete every blocking task before completing this task.",
		);
		expect(mocks.updateBoardTask).not.toHaveBeenCalled();
	});

	// Saves scoped relationships and completion together after every guard succeeds.
	it("updates assignments, labels, dependencies, and completion", async () => {
		const result = await updateBoardTask(createRelationshipUpdateForm());

		expect(mocks.updateBoardTask).toHaveBeenCalledWith(
			projectId,
			taskId,
			applicationUserId,
			{
				completed: true,
				assigneeIds: [assigneeId],
				labelIds: [labelId],
				dependencyIds: [relatedTaskId],
			},
		);
		expect(mocks.publishUserNotificationUpdates).toHaveBeenCalledWith([
			assigneeId,
		]);
		expect(result).toEqual({
			status: "success",
			message: "Task updated successfully.",
		});
	});
});

describe("task movement actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ userId: "clerk-user" });
		mocks.ensureApplicationUser.mockResolvedValue({ id: applicationUserId });
		mocks.getAccessibleProjectById.mockResolvedValue({
			id: projectId,
			status: "active",
			accessRole: "member",
		});
		mocks.moveBoardTask.mockResolvedValue({ id: taskId });
		mocks.moveBoardTasks.mockResolvedValue({ movedCount: 2 });
	});

	// Persists one authorized movement and refreshes project-level board consumers.
	it("moves one task to a validated position", async () => {
		const result = await moveBoardTask(createMoveTaskForm());

		expect(mocks.moveBoardTask).toHaveBeenCalledWith(
			projectId,
			taskId,
			listId,
			2,
			applicationUserId,
		);
		expect(mocks.publishProjectBoardUpdate).toHaveBeenCalledWith(projectId);
		expect(result).toEqual({
			status: "success",
			message: "Task moved successfully.",
		});
	});

	// Persists a multi-task movement as one authorized operation.
	it("moves a group of unique tasks", async () => {
		const result = await moveBoardTasks(
			createMoveTasksForm([taskId, relatedTaskId]),
		);

		expect(mocks.moveBoardTasks).toHaveBeenCalledWith(
			projectId,
			[taskId, relatedTaskId],
			listId,
			1,
			applicationUserId,
		);
		expect(result).toEqual({
			status: "success",
			message: "2 tasks moved successfully.",
		});
	});

	// Rejects a duplicated task before authorization or persistence.
	it("rejects duplicate task IDs in a group movement", async () => {
		const result = await moveBoardTasks(createMoveTasksForm([taskId, taskId]));

		expect(result).toEqual({
			status: "error",
			message: "Invalid task movement.",
		});
		expect(mocks.auth).not.toHaveBeenCalled();
		expect(mocks.moveBoardTasks).not.toHaveBeenCalled();
	});

	// Enforces the documented maximum group size at the public action boundary.
	it("rejects movement of more than ten tasks", async () => {
		const taskIds = Array.from(
			{ length: 11 },
			(_, index) =>
				`00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
		);

		const result = await moveBoardTasks(createMoveTasksForm(taskIds));

		expect(result.message).toBe("Invalid task movement.");
		expect(mocks.auth).not.toHaveBeenCalled();
		expect(mocks.moveBoardTasks).not.toHaveBeenCalled();
	});

	// Rejects missing movement identifiers and positions before authorization.
	it("rejects an empty movement request", async () => {
		const result = await moveBoardTask(new FormData());

		expect(result).toEqual({
			status: "error",
			message: "Invalid task movement.",
		});
		expect(mocks.auth).not.toHaveBeenCalled();
		expect(mocks.moveBoardTask).not.toHaveBeenCalled();
	});

	// Returns an error without revalidation when persistence rejects a group move.
	it("does not refresh the board when a group movement fails", async () => {
		mocks.moveBoardTasks.mockResolvedValue(null);

		const result = await moveBoardTasks(
			createMoveTasksForm([taskId, relatedTaskId]),
		);

		expect(result.message).toBe("The selected tasks were not moved.");
		expect(mocks.publishProjectBoardUpdate).not.toHaveBeenCalled();
		expect(mocks.revalidatePath).not.toHaveBeenCalled();
	});
});
