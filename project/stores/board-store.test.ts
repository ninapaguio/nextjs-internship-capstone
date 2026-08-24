import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "@/stores/board-store";
import type { BoardList, BoardTask } from "@/types";

const priority = {
	id: "priority-medium",
	key: "medium",
	label: "Medium",
} as const;

// Creates a complete board task fixture for store transition tests.
function createTask(id: string, listId: string, position: number): BoardTask {
	return {
		id,
		listId,
		title: `Task ${id}`,
		description: null,
		priority,
		dueDate: null,
		position,
		completedAt: null,
		archivedAt: null,
		assignees: [],
		labels: [],
		dependencyIds: [],
		commentsCount: 0,
	};
}

// Creates a fresh two-column board so tests never share nested object references.
function createBoardLists(): BoardList[] {
	return [
		{
			id: "backlog",
			title: "Backlog",
			description: null,
			position: 0,
			tasks: [
				createTask("alpha", "backlog", 0),
				createTask("beta", "backlog", 1),
			],
		},
		{
			id: "done",
			title: "Done",
			description: null,
			position: 1,
			tasks: [createTask("gamma", "done", 0)],
		},
	];
}

describe("useBoardStore optimistic task movement", () => {
	beforeEach(() => {
		useBoardStore.setState(useBoardStore.getInitialState(), true);
	});

	// Moves immediately, preserves the original snapshot, and normalizes positions.
	it("optimistically moves a task to another column", () => {
		const initialLists = createBoardLists();
		useBoardStore.getState().hydrate("project-1", initialLists);
		useBoardStore.getState().beginTaskDrag("alpha", ["alpha"]);
		useBoardStore.getState().moveTasksOptimistically(["alpha"], "column:done");

		const state = useBoardStore.getState();
		expect(state.dragSnapshot).toEqual(initialLists);
		expect(
			state.lists[0].tasks.map(({ id, position }) => ({ id, position })),
		).toEqual([{ id: "beta", position: 0 }]);
		expect(
			state.lists[1].tasks.map(({ id, listId, position }) => ({
				id,
				listId,
				position,
			})),
		).toEqual([
			{ id: "gamma", listId: "done", position: 0 },
			{ id: "alpha", listId: "done", position: 1 },
		]);
		expect(state.hasPendingChanges).toBe(true);
	});

	// Preserves stable board order when the input selection arrives out of order.
	it("optimistically moves multiple tasks in their original board order", () => {
		useBoardStore.getState().hydrate("project-1", createBoardLists());
		useBoardStore.getState().beginTaskDrag("beta", ["beta", "alpha"]);
		useBoardStore
			.getState()
			.moveTasksOptimistically(["beta", "alpha"], "column:done");

		const state = useBoardStore.getState();
		expect(state.lists[0].tasks).toEqual([]);
		expect(
			state.lists[1].tasks.map(({ id, listId, position }) => ({
				id,
				listId,
				position,
			})),
		).toEqual([
			{ id: "gamma", listId: "done", position: 0 },
			{ id: "alpha", listId: "done", position: 1 },
			{ id: "beta", listId: "done", position: 2 },
		]);
	});

	it.each([
		["beta", "alpha"],
		["alpha", "column:backlog"],
	] as const)(
		"reorders %s within its existing column using target %s",
		(taskId, targetId) => {
			useBoardStore.getState().hydrate("project-1", createBoardLists());
			useBoardStore.getState().beginTaskDrag(taskId, [taskId]);
			useBoardStore.getState().moveTasksOptimistically([taskId], targetId);

			const tasks = useBoardStore.getState().lists[0].tasks;
			expect(tasks.map(({ id, position }) => ({ id, position }))).toEqual([
				{ id: "beta", position: 0 },
				{ id: "alpha", position: 1 },
			]);
			expect(tasks.every((task) => task.listId === "backlog")).toBe(true);
		},
	);

	// Leaves task placement unchanged when any selected task is unavailable.
	it("does not partially move a selection containing an unknown task", () => {
		const initialLists = createBoardLists();
		useBoardStore.getState().hydrate("project-1", initialLists);

		useBoardStore
			.getState()
			.moveTasksOptimistically(["alpha", "missing"], "column:done");

		const state = useBoardStore.getState();
		expect(state.lists).toEqual(initialLists);
		expect(state.hasPendingChanges).toBe(false);
	});

	// Retains the optimistic placement and clears pending state after persistence succeeds.
	it("commits a successful optimistic move", () => {
		useBoardStore.getState().hydrate("project-1", createBoardLists());
		useBoardStore.getState().beginTaskDrag("alpha", ["alpha"]);
		useBoardStore.getState().moveTasksOptimistically(["alpha"], "column:done");
		useBoardStore.getState().finishTaskDrag(false);

		let state = useBoardStore.getState();
		expect(state.lists[1].tasks.map((task) => task.id)).toEqual([
			"gamma",
			"alpha",
		]);
		expect(state.dragSnapshot).toBeNull();
		expect(state.draggedTaskIds).toEqual([]);
		expect(state.hasPendingChanges).toBe(true);

		useBoardStore.getState().markPersisted();
		state = useBoardStore.getState();
		expect(state.hasPendingChanges).toBe(false);
		expect(state.lists[1].tasks.map((task) => task.id)).toEqual([
			"gamma",
			"alpha",
		]);
	});

	// Restores the captured server state when persistence rejects the optimistic move.
	it("rolls back a failed optimistic move", () => {
		const initialLists = createBoardLists();
		useBoardStore.getState().hydrate("project-1", initialLists);
		useBoardStore.getState().beginTaskDrag("alpha", ["alpha"]);
		const snapshot = useBoardStore.getState().dragSnapshot;
		useBoardStore.getState().moveTasksOptimistically(["alpha"], "column:done");
		useBoardStore.getState().finishTaskDrag(false);

		expect(snapshot).not.toBeNull();
		useBoardStore.getState().replaceLists(snapshot ?? []);

		const state = useBoardStore.getState();
		expect(state.lists).toEqual(initialLists);
		expect(state.lists[0].tasks.map((task) => task.id)).toEqual([
			"alpha",
			"beta",
		]);
		expect(state.hasPendingChanges).toBe(false);
	});

	// Restores both the board snapshot and its previous dirty state after cancellation.
	it("preserves pre-existing pending changes when a drag is canceled", () => {
		useBoardStore.getState().hydrate("project-1", createBoardLists());
		useBoardStore.getState().updateTask("beta", { title: "Edited task" });
		const preDragLists = useBoardStore.getState().lists;
		useBoardStore.getState().beginTaskDrag("alpha", ["alpha"]);
		useBoardStore.getState().moveTasksOptimistically(["alpha"], "column:done");

		useBoardStore.getState().finishTaskDrag(true);

		const state = useBoardStore.getState();
		expect(state.lists).toEqual(preDragLists);
		expect(state.lists[0].tasks[1].title).toBe("Edited task");
		expect(state.hasPendingChanges).toBe(true);
		expect(state.dragSnapshot).toBeNull();
	});
});
