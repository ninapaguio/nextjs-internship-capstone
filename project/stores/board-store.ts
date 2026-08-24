"use client";

import { create } from "zustand";
import type { BoardList, BoardState } from "@/types";

// Finds the list containing a task without mutating board state.
function findTaskList(lists: BoardList[], taskId: string) {
	return lists.find((list) => list.tasks.some((task) => task.id === taskId));
}

// Produces an immutable group move while preserving the selected tasks' board order.
function moveTasks(lists: BoardList[], taskIds: string[], targetId: string) {
	const movingIds = new Set(taskIds);
	if (movingIds.size === 0) return lists;

	const targetList = targetId.startsWith("column:")
		? lists.find((list) => list.id === targetId.slice("column:".length))
		: findTaskList(lists, targetId);
	if (!targetList) return lists;

	const movingTasks = lists.flatMap((list) =>
		list.tasks.filter((task) => movingIds.has(task.id)),
	);
	if (movingTasks.length !== movingIds.size) return lists;

	const rawTargetIndex = targetId.startsWith("column:")
		? targetList.tasks.length
		: targetList.tasks.findIndex((task) => task.id === targetId);
	if (rawTargetIndex < 0) return lists;
	const removedBeforeTarget = targetList.tasks
		.slice(0, rawTargetIndex)
		.filter((task) => movingIds.has(task.id)).length;
	const targetIndex = Math.max(0, rawTargetIndex - removedBeforeTarget);

	return lists.map((list) => {
		const remainingTasks = list.tasks.filter((task) => !movingIds.has(task.id));
		const nextTasks =
			list.id === targetList.id
				? [
						...remainingTasks.slice(0, targetIndex),
						...movingTasks.map((task) => ({ ...task, listId: targetList.id })),
						...remainingTasks.slice(targetIndex),
					]
				: remainingTasks;
		if (nextTasks.length === list.tasks.length && list.id !== targetList.id) {
			return list;
		}
		return {
			...list,
			tasks: nextTasks.map((task, position) =>
				task.position === position ? task : { ...task, position },
			),
		};
	});
}

// Owns the client-side Kanban state and reversible optimistic drag operations.
export const useBoardStore = create<BoardState>((set) => ({
	projectId: null,
	lists: [],
	draggedTaskId: null,
	draggedTaskIds: [],
	dragTargetId: null,
	dragSnapshot: null,
	dragSnapshotHadPendingChanges: false,
	hasPendingChanges: false,
	hydrate: (projectId, lists) =>
		set((state) => {
			if (state.projectId === projectId) {
				if (state.hasPendingChanges || state.draggedTaskId) return state;
				return { ...state, lists };
			}

			return {
				projectId,
				lists,
				draggedTaskId: null,
				draggedTaskIds: [],
				dragTargetId: null,
				dragSnapshot: null,
				dragSnapshotHadPendingChanges: false,
				hasPendingChanges: false,
			};
		}),
	addList: (list) =>
		set((state) =>
			state.lists.some((current) => current.id === list.id)
				? state
				: {
						lists: [...state.lists, list],
						hasPendingChanges: true,
					},
		),
	updateList: (listId, changes) =>
		set((state) => ({
			lists: state.lists.map((list) =>
				list.id === listId ? { ...list, ...changes } : list,
			),
			hasPendingChanges: true,
		})),
	archiveList: (listId) =>
		set((state) => ({
			lists: state.lists.map((list) =>
				list.id === listId ? { ...list, archived: true } : list,
			),
			hasPendingChanges: true,
		})),
	deleteList: (listId) =>
		set((state) => ({
			lists: state.lists.filter((list) => list.id !== listId),
			hasPendingChanges: true,
		})),
	addTask: (listId, task) =>
		set((state) =>
			state.lists.some((list) =>
				list.tasks.some((current) => current.id === task.id),
			)
				? state
				: {
						lists: state.lists.map((list) =>
							list.id === listId
								? { ...list, tasks: [...list.tasks, task] }
								: list,
						),
						hasPendingChanges: true,
					},
		),
	updateTask: (taskId, changes) =>
		set((state) => {
			const sourceList = findTaskList(state.lists, taskId);
			const task = sourceList?.tasks.find((item) => item.id === taskId);
			if (!sourceList || !task) return state;

			const targetListId = changes.listId ?? sourceList.id;
			const updatedTask = { ...task, ...changes, listId: targetListId };
			return {
				lists: state.lists.map((list) => {
					if (list.id === sourceList.id && list.id !== targetListId) {
						return {
							...list,
							tasks: list.tasks.filter((item) => item.id !== taskId),
						};
					}
					if (list.id === targetListId) {
						return {
							...list,
							tasks:
								list.id === sourceList.id
									? list.tasks.map((item) =>
											item.id === taskId ? updatedTask : item,
										)
									: [...list.tasks, updatedTask],
						};
					}
					return list;
				}),
				hasPendingChanges: true,
			};
		}),
	deleteTask: (taskId) =>
		set((state) => ({
			lists: state.lists.map((list) => ({
				...list,
				tasks: list.tasks.filter((task) => task.id !== taskId),
			})),
			hasPendingChanges: true,
		})),
	replaceLists: (lists) => set({ lists, hasPendingChanges: false }),
	markPersisted: () => set({ hasPendingChanges: false }),
	beginTaskDrag: (taskId, taskIds) =>
		set((state) => ({
			draggedTaskId: taskId,
			draggedTaskIds: taskIds,
			dragTargetId: null,
			dragSnapshot: state.lists,
			dragSnapshotHadPendingChanges: state.hasPendingChanges,
		})),
	moveTasksOptimistically: (taskIds, targetId) =>
		set((state) => {
			const lists = moveTasks(state.lists, taskIds, targetId);
			return lists === state.lists
				? { dragTargetId: targetId }
				: { lists, dragTargetId: targetId, hasPendingChanges: true };
		}),
	finishTaskDrag: (canceled) =>
		set((state) => ({
			lists: canceled && state.dragSnapshot ? state.dragSnapshot : state.lists,
			draggedTaskId: null,
			draggedTaskIds: [],
			dragTargetId: null,
			dragSnapshot: null,
			dragSnapshotHadPendingChanges: false,
			hasPendingChanges: canceled
				? state.dragSnapshotHadPendingChanges
				: state.hasPendingChanges,
		})),
}));
