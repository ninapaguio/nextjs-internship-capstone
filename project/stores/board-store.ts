"use client";

import { create } from "zustand";
import type { BoardList, BoardTask } from "@/types";

interface BoardState {
	projectId: string | null;
	lists: BoardList[];
	draggedTaskId: string | null;
	dragTargetId: string | null;
	dragSnapshot: BoardList[] | null;
	dragSnapshotHadPendingChanges: boolean;
	hasPendingChanges: boolean;
	hydrate: (projectId: string, lists: BoardList[]) => void;
	addList: (list: BoardList) => void;
	updateList: (
		listId: string,
		changes: Pick<BoardList, "title" | "description">,
	) => void;
	archiveList: (listId: string) => void;
	deleteList: (listId: string) => void;
	addTask: (listId: string, task: BoardTask) => void;
	updateTask: (taskId: string, changes: Partial<BoardTask>) => void;
	deleteTask: (taskId: string) => void;
	replaceLists: (lists: BoardList[]) => void;
	markPersisted: () => void;
	beginTaskDrag: (taskId: string) => void;
	moveTaskOptimistically: (taskId: string, targetId: string) => void;
	finishTaskDrag: (canceled: boolean) => void;
}

// Finds the list containing a task without mutating board state.
function findTaskList(lists: BoardList[], taskId: string) {
	return lists.find((list) => list.tasks.some((task) => task.id === taskId));
}

// Produces an immutable task move for immediate optimistic board feedback.
function moveTask(lists: BoardList[], taskId: string, targetId: string) {
	if (taskId === targetId) return lists;

	const sourceList = findTaskList(lists, taskId);
	const targetList = targetId.startsWith("column:")
		? lists.find((list) => list.id === targetId.slice("column:".length))
		: findTaskList(lists, targetId);
	if (!sourceList || !targetList) return lists;

	const sourceIndex = sourceList.tasks.findIndex((task) => task.id === taskId);
	const rawTargetIndex = targetId.startsWith("column:")
		? targetList.tasks.length
		: targetList.tasks.findIndex((task) => task.id === targetId);
	if (sourceIndex < 0 || rawTargetIndex < 0) return lists;

	let targetIndex = rawTargetIndex;
	if (sourceList.id === targetList.id && sourceIndex < targetIndex) {
		targetIndex -= 1;
	}
	if (sourceList.id === targetList.id && sourceIndex === targetIndex) {
		return lists;
	}

	const task = sourceList.tasks[sourceIndex];
	if (!task) return lists;

	if (sourceList.id === targetList.id) {
		const tasks = [...sourceList.tasks];
		tasks.splice(sourceIndex, 1);
		tasks.splice(targetIndex, 0, task);
		const positionedTasks = tasks.map((item, position) =>
			item.position === position ? item : { ...item, position },
		);
		return lists.map((list) =>
			list.id === sourceList.id ? { ...list, tasks: positionedTasks } : list,
		);
	}

	const sourceTasks = sourceList.tasks
		.filter((item) => item.id !== taskId)
		.map((item, position) =>
			item.position === position ? item : { ...item, position },
		);
	const targetTasks = [...targetList.tasks];
	targetTasks.splice(targetIndex, 0, { ...task, listId: targetList.id });
	const positionedTargetTasks = targetTasks.map((item, position) =>
		item.position === position ? item : { ...item, position },
	);

	return lists.map((list) => {
		if (list.id === sourceList.id) return { ...list, tasks: sourceTasks };
		if (list.id === targetList.id) {
			return { ...list, tasks: positionedTargetTasks };
		}
		return list;
	});
}

// Owns the client-side Kanban state and reversible optimistic drag operations.
export const useBoardStore = create<BoardState>((set) => ({
	projectId: null,
	lists: [],
	draggedTaskId: null,
	dragTargetId: null,
	dragSnapshot: null,
	dragSnapshotHadPendingChanges: false,
	hasPendingChanges: false,
	hydrate: (projectId, lists) =>
		set((state) =>
			state.projectId === projectId
				? state
				: {
						projectId,
						lists,
						draggedTaskId: null,
						dragTargetId: null,
						dragSnapshot: null,
						dragSnapshotHadPendingChanges: false,
						hasPendingChanges: false,
					},
		),
	addList: (list) =>
		set((state) => ({
			lists: [...state.lists, list],
			hasPendingChanges: true,
		})),
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
		set((state) => ({
			lists: state.lists.map((list) =>
				list.id === listId ? { ...list, tasks: [...list.tasks, task] } : list,
			),
			hasPendingChanges: true,
		})),
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
	beginTaskDrag: (taskId) =>
		set((state) => ({
			draggedTaskId: taskId,
			dragTargetId: null,
			dragSnapshot: state.lists,
			dragSnapshotHadPendingChanges: state.hasPendingChanges,
		})),
	moveTaskOptimistically: (taskId, targetId) =>
		set((state) => {
			if (state.dragTargetId === targetId) return state;
			const lists = moveTask(state.lists, taskId, targetId);
			return lists === state.lists
				? { dragTargetId: targetId }
				: { lists, dragTargetId: targetId, hasPendingChanges: true };
		}),
	finishTaskDrag: (canceled) =>
		set((state) => ({
			lists: canceled && state.dragSnapshot ? state.dragSnapshot : state.lists,
			draggedTaskId: null,
			dragTargetId: null,
			dragSnapshot: null,
			dragSnapshotHadPendingChanges: false,
			hasPendingChanges: canceled
				? state.dragSnapshotHadPendingChanges
				: state.hasPendingChanges,
		})),
}));

/* // TODO: Task 5.3 - Set up client-side state management with Zustand
// TODO: Task 5.4 - Implement optimistic UI updates for smooth interactions

/*
TODO: Implementation Notes for Interns:

Board state management for Kanban functionality:
- Current project data
- Lists/columns
- Tasks
- Drag and drop state
- Optimistic updates
- Sync with server

Key features:
- Optimistic task creation/updates
- Drag and drop state management
- Real-time synchronization
- Conflict resolution
- Offline support (optional)

Example structure:
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface BoardState {
  // Data
  currentProject: Project | null
  lists: List[]
  tasks: Task[]

  // UI state
  draggedTask: Task | null
  draggedOverList: string | null

  // Loading states
  isLoading: boolean
  isSaving: boolean

  // Actions
  loadProject: (projectId: string) => Promise<void>
  createTask: (listId: string, task: Partial<Task>) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  moveTask: (taskId: string, newListId: string, newPosition: number) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>

  // Drag and drop
  setDraggedTask: (task: Task | null) => void
  setDraggedOverList: (listId: string | null) => void
}

export const useBoardStore = create<BoardState>()(
  subscribeWithSelector((set, get) => ({
	// ... implementation
  }))
)
*/

// Placeholder to prevent import errors
/*export const useBoardStore = () => {
	console.log("TODO: Implement board store with Zustand");
	return {
		currentProject: null,
		lists: [],
		tasks: [],
		isLoading: false,
		loadProject: (projectId: string) =>
			console.log(`TODO: Load project ${projectId}`),
		createTask: (listId: string, task: any) =>
			console.log(`TODO: Create task in list ${listId}`, task),
	};
}; 
*/
