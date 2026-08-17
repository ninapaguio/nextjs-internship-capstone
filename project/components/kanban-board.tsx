"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { ArrowDownAZ, Filter, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { changeBoardListLifecycle, moveBoardTask } from "@/actions/board";
import { KanbanColumn } from "@/components/kanban-column";
import { CreateListModal } from "@/components/modals/create-list-modal";
import { CreateTaskModal } from "@/components/modals/create-task-modal";
import { TaskDetailsPanel } from "@/components/tasks/task-details-panel";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type { BoardList, BoardTask, ProjectBoardData } from "@/types";

// TODO: Task 5.1 - Design responsive Kanban board layout
// TODO: Task 5.2 - Implement drag-and-drop functionality with dnd-kit

/*
TODO: Implementation Notes for Interns:

This is the main Kanban board component that should:
- Display columns (lists) horizontally
- Allow drag and drop of tasks between columns
- Support adding new tasks and columns
- Handle real-time updates
- Be responsive on mobile

Key dependencies to install:
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities

Features to implement:
- Drag and drop tasks between columns
- Drag and drop to reorder tasks within columns
- Add new task button in each column
- Add new column functionality
- Optimistic updates (Task 5.4)
- Real-time persistence (Task 5.5)
- Mobile responsive design
- Loading states
- Error handling

State management:
- Use Zustand store for board state (Task 5.3)
- Implement optimistic updates
- Handle conflicts with server state
*/

interface KanbanBoardProps {
	projectId: string;
	initialData: ProjectBoardData;
}

type ComplexityFilter = BoardTask["complexity"]["key"] | "all";

// Provides persisted board filtering, task details, and optimistic dnd-kit movement.
export function KanbanBoard({ projectId, initialData }: KanbanBoardProps) {
	const columns = useBoardStore((state) => state.lists);
	const hydrate = useBoardStore((state) => state.hydrate);
	const addList = useBoardStore((state) => state.addList);
	const updateList = useBoardStore((state) => state.updateList);
	const archiveList = useBoardStore((state) => state.archiveList);
	const deleteList = useBoardStore((state) => state.deleteList);
	const addTask = useBoardStore((state) => state.addTask);
	const beginTaskDrag = useBoardStore((state) => state.beginTaskDrag);
	const moveTaskOptimistically = useBoardStore(
		(state) => state.moveTaskOptimistically,
	);
	const finishTaskDrag = useBoardStore((state) => state.finishTaskDrag);
	const replaceLists = useBoardStore((state) => state.replaceLists);
	const markPersisted = useBoardStore((state) => state.markPersisted);
	const [query, setQuery] = useState("");
	const [complexityFilter, setComplexityFilter] =
		useState<ComplexityFilter>("all");
	const [sortDirection, setSortDirection] = useState<"none" | "asc" | "desc">(
		"none",
	);
	const [activeListId, setActiveListId] = useState<string | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [editingList, setEditingList] = useState<BoardList | null>(null);
	const [boardError, setBoardError] = useState<string | null>(null);

	// Initializes the shared board store from server-loaded database records.
	useEffect(() => {
		hydrate(projectId, initialData.lists);
	}, [hydrate, initialData.lists, projectId]);

	const displayedColumns = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		if (
			!normalizedQuery &&
			complexityFilter === "all" &&
			sortDirection === "none"
		) {
			return columns.filter((column) => !column.archived);
		}

		return columns
			.filter((column) => !column.archived)
			.map((column) => {
				const matchingTasks = column.tasks.filter((task) => {
					const matchesSearch =
						!normalizedQuery ||
						`${task.title} ${task.description ?? ""} ${task.assignees.map((member) => member.name).join(" ")}`
							.toLowerCase()
							.includes(normalizedQuery);
					const matchesComplexity =
						complexityFilter === "all" ||
						task.complexity.key === complexityFilter;
					return matchesSearch && matchesComplexity;
				});
				const tasks =
					sortDirection === "none"
						? matchingTasks
						: [...matchingTasks].sort((left, right) =>
								sortDirection === "asc"
									? left.title.localeCompare(right.title)
									: right.title.localeCompare(left.title),
							);
				return { ...column, tasks };
			});
	}, [columns, complexityFilter, query, sortDirection]);

	const activeList = columns.find((list) => list.id === activeListId) ?? null;
	const selectedTask =
		columns
			.flatMap((list) => list.tasks)
			.find((task) => task.id === selectedTaskId) ?? null;

	// Opens the creation dialog for a specific workflow column.
	function openCreateTask(listId: string) {
		setActiveListId(listId);
	}

	// Opens an empty dialog for creating another workflow column.
	function openAddList() {
		setEditingList(null);
		setIsListModalOpen(true);
	}

	// Opens the column dialog with an existing column's values.
	function openEditList(list: BoardList) {
		setEditingList(list);
		setIsListModalOpen(true);
	}

	// Publishes a server-confirmed column record to the shared board store.
	function saveConfirmedList(list: BoardList) {
		if (editingList) updateList(list.id, list);
		else addList(list);
		markPersisted();
	}

	// Applies an optimistic column lifecycle change and restores failures.
	async function changeListLifecycle(
		listId: string,
		action: "archive" | "delete",
	) {
		const snapshot = useBoardStore.getState().lists;
		if (action === "archive") archiveList(listId);
		else deleteList(listId);
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("listId", listId);
		formData.set("action", action);
		const result = await changeBoardListLifecycle(formData);
		if (result.status === "error") {
			replaceLists(snapshot);
			setBoardError(result.message);
			return;
		}
		markPersisted();
	}

	// Confirms destructive removal before deleting a column and its tasks.
	function deleteBoardList(listId: string) {
		const list = columns.find((item) => item.id === listId);
		if (!list || !window.confirm(`Delete "${list.title}" and its tasks?`))
			return;
		void changeListLifecycle(listId, "delete");
	}

	// Adds a server-confirmed task to the selected workflow column.
	function createTask(task: BoardTask) {
		addTask(task.listId, task);
		markPersisted();
	}

	// Persists the final optimistic task position and rolls back failed moves.
	async function persistDraggedTask() {
		const state = useBoardStore.getState();
		const taskId = state.draggedTaskId;
		const snapshot = state.dragSnapshot;
		const targetList = state.lists.find((list) =>
			list.tasks.some((task) => task.id === taskId),
		);
		const position =
			targetList?.tasks.findIndex((task) => task.id === taskId) ?? -1;
		if (!taskId || !targetList || position < 0) {
			finishTaskDrag(true);
			return;
		}

		// Clears the dragging appearance immediately; persistence continues remotely.
		finishTaskDrag(false);
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("taskId", taskId);
		formData.set("targetListId", targetList.id);
		formData.set("position", String(position));
		const result = await moveBoardTask(formData);
		if (result.status === "error") {
			if (snapshot) replaceLists(snapshot);
			setBoardError(result.message);
		} else markPersisted();
	}

	const complexityLabel =
		complexityFilter === "all"
			? "All"
			: complexityFilter[0].toUpperCase() + complexityFilter.slice(1);
	const sortActionLabel =
		sortDirection === "none"
			? "Sort task titles ascending"
			: sortDirection === "asc"
				? "Sort task titles descending"
				: "Use manual task order";

	return (
		<section aria-label="Project Kanban board" data-project-id={projectId}>
			<div className="mb-5 flex flex-wrap items-center justify-end gap-2">
				<InputGroup className="h-8 w-48 bg-muted/70 sm:w-56">
					<InputGroupAddon>
						<Search aria-hidden="true" />
					</InputGroupAddon>
					<InputGroupInput
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search tasks"
						aria-label="Search tasks"
					/>
				</InputGroup>
				<Button
					variant="outline"
					size="sm"
					className="rounded-full text-xs"
					onPress={() =>
						setComplexityFilter((current) =>
							current === "all"
								? "high"
								: current === "high"
									? "medium"
									: current === "medium"
										? "low"
										: "all",
						)
					}
					aria-label="Filter tasks by complexity"
				>
					<Filter data-icon="inline-start" /> {complexityLabel}
				</Button>
				<TooltipTrigger delay={400}>
					<Button
						variant="outline"
						size="icon-sm"
						className="rounded-full"
						onPress={() =>
							setSortDirection((current) =>
								current === "none"
									? "asc"
									: current === "asc"
										? "desc"
										: "none",
							)
						}
						aria-label={sortActionLabel}
					>
						<ArrowDownAZ
							className={cn(
								"size-4",
								sortDirection === "desc" && "rotate-180",
								sortDirection === "none" && "opacity-60",
							)}
						/>
					</Button>
					<Tooltip placement="bottom">{sortActionLabel}</Tooltip>
				</TooltipTrigger>
			</div>

			{boardError ? (
				<p className="mb-4 text-sm text-destructive" role="alert">
					{boardError}
				</p>
			) : null}

			<DragDropProvider
				onDragStart={({ operation }) => {
					if (operation.source) beginTaskDrag(String(operation.source.id));
				}}
				onDragEnd={({ canceled, operation }) => {
					if (canceled || !operation.source || !operation.target) {
						finishTaskDrag(true);
						return;
					}

					// Reorders once on drop to avoid layout-measurement loops while dragging.
					moveTaskOptimistically(
						String(operation.source.id),
						String(operation.target.id),
					);
					void persistDraggedTask();
				}}
			>
				{displayedColumns.length ? (
					<div className="scrollbar-thin grid grid-flow-col auto-cols-[minmax(280px,86vw)] gap-3 overflow-x-auto overscroll-x-contain pb-4 sm:auto-cols-80">
						{displayedColumns.map((column) => (
							<KanbanColumn
								key={column.id}
								list={column}
								onAddTask={openCreateTask}
								onAddList={openAddList}
								onEdit={openEditList}
								onArchive={(id) => void changeListLifecycle(id, "archive")}
								onDelete={deleteBoardList}
								onOpenTask={setSelectedTaskId}
							/>
						))}
					</div>
				) : (
					<div className="grid min-h-72 place-items-center rounded-3xl border border-dashed bg-muted/20 p-8 text-center">
						<div>
							<p className="font-semibold">No columns yet</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Add the first workflow stage to begin planning tasks.
							</p>
							<Button className="mt-4" onPress={openAddList}>
								<Plus data-icon="inline-start" /> Add column
							</Button>
						</div>
					</div>
				)}
			</DragDropProvider>

			<CreateTaskModal
				projectId={projectId}
				list={activeList}
				complexityOptions={initialData.complexityOptions}
				members={initialData.members}
				labels={initialData.labels}
				isOpen={activeListId !== null}
				onOpenChange={(open) => {
					if (!open) setActiveListId(null);
				}}
				onCreateTask={createTask}
			/>
			<CreateListModal
				projectId={projectId}
				isOpen={isListModalOpen}
				list={editingList}
				nextPosition={columns.length}
				onOpenChange={setIsListModalOpen}
				onSaved={saveConfirmedList}
			/>
			<TaskDetailsPanel
				projectId={projectId}
				task={selectedTask}
				lists={columns.filter((list) => !list.archived)}
				complexityOptions={initialData.complexityOptions}
				members={initialData.members}
				labels={initialData.labels}
				isOpen={selectedTaskId !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedTaskId(null);
				}}
			/>
		</section>
	);
}
