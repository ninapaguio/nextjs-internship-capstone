"use client";

import { DragDropProvider } from "@dnd-kit/react";
import { ArrowDownAZ, Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { KanbanColumn } from "@/components/kanban-column";
import { CreateListModal } from "@/components/modals/create-list-modal";
import { CreateTaskModal } from "@/components/modals/create-task-modal";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
	type BoardList,
	type BoardTask,
	type BoardTaskComplexity,
	useBoardStore,
} from "@/stores/board-store";

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
}

const initialColumns: BoardList[] = [
	{
		id: "backlog",
		title: "Backlog",
		description: "Pending tasks and unresolved issues.",
		tasks: [],
	},
	{
		id: "current",
		title: "Current",
		description: "This item hasn't been started but planned to be worked on.",
		tasks: [],
	},
	{
		id: "in-progress",
		title: "In Progress",
		description: "This actively being worked on",
		tasks: [],
	},
	{
		id: "review",
		title: "In Review",
		description: "This is ready for review and approval",
		tasks: [],
	},
	{
		id: "done",
		title: "Done",
		description: "Completed and verified tasks",
		tasks: [],
	},
];

// Provides board filtering, task creation, and dnd-kit movement for a project.
export function KanbanBoard({ projectId }: KanbanBoardProps) {
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
	const [query, setQuery] = useState("");
	const [complexityFilter, setComplexityFilter] = useState<
		BoardTaskComplexity | "All"
	>("All");
	const [sortDirection, setSortDirection] = useState<"none" | "asc" | "desc">(
		"none",
	);
	const [activeListId, setActiveListId] = useState<string | null>(null);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [editingList, setEditingList] = useState<BoardList | null>(null);

	// Initializes the shared board store once for the active project.
	useEffect(() => {
		hydrate(projectId, initialColumns);
	}, [hydrate, projectId]);

	const displayedColumns = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return columns
			.filter((column) => !column.archived)
			.map((column) => {
				const matchingTasks = column.tasks.filter((task) => {
					const matchesSearch =
						!normalizedQuery ||
						`${task.title} ${task.description}`
							.toLowerCase()
							.includes(normalizedQuery);
					const matchesComplexity =
						complexityFilter === "All" || task.complexity === complexityFilter;
					return matchesSearch && matchesComplexity;
				});
				const tasks =
					sortDirection === "none"
						? matchingTasks
						: matchingTasks.sort((left, right) =>
								sortDirection === "asc"
									? left.title.localeCompare(right.title)
									: right.title.localeCompare(left.title),
							);
				return { ...column, tasks };
			});
	}, [columns, complexityFilter, query, sortDirection]);

	const activeList = columns.find((list) => list.id === activeListId);

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

	// Creates a column or saves changes to the selected column.
	function saveList(title: string, description: string) {
		if (editingList) {
			updateList(editingList.id, { title, description });
			return;
		}

		addList({
			id: crypto.randomUUID(),
			title,
			description,
			tasks: [],
		});
	}

	// Hides a column from the active board without deleting its local data.
	function archiveBoardList(listId: string) {
		archiveList(listId);
	}

	// Permanently removes a local column after explicit confirmation.
	function deleteBoardList(listId: string) {
		const list = columns.find((item) => item.id === listId);
		if (!list) return;
		if (!window.confirm(`Delete "${list.title}" and its tasks?`)) return;
		deleteList(listId);
	}

	// Adds a new local task to the selected workflow column.
	function createTask(task: BoardTask) {
		if (!activeListId) return;
		addTask(activeListId, task);
	}

	const sortActionLabel =
		sortDirection === "none"
			? "Sort task titles ascending"
			: sortDirection === "asc"
				? "Sort task titles descending"
				: "Use manual task order";

	return (
		<section aria-label="Project Kanban board" data-project-id={projectId}>
			<div className="mb-5 flex flex-wrap items-center justify-end gap-2">
				<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
					<InputGroup className="h-8 w-48 bg-muted/70 sm:w-56">
						<InputGroupAddon>
							<Search aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							id="board-search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search tasks"
							aria-label="Search tasks"
						/>
					</InputGroup>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onPress={() =>
							setComplexityFilter((current) =>
								current === "All"
									? "High"
									: current === "High"
										? "Medium"
										: current === "Medium"
											? "Low"
											: "All",
							)
						}
						className="rounded-full text-xs text-muted-foreground shadow-xs"
						aria-label="Filter tasks by complexity"
					>
						<Filter data-icon="inline-start" /> {complexityFilter}
					</Button>
					<TooltipTrigger delay={400}>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onPress={() =>
								setSortDirection((current) =>
									current === "none"
										? "asc"
										: current === "asc"
											? "desc"
											: "none",
								)
							}
							className="rounded-full text-muted-foreground shadow-xs"
							aria-label={sortActionLabel}
						>
							<ArrowDownAZ
								className={cn(
									"size-4 transition-transform",
									sortDirection === "desc" && "rotate-180",
									sortDirection === "none" && "opacity-60",
								)}
							/>
						</Button>
						<Tooltip placement="bottom">{sortActionLabel}</Tooltip>
					</TooltipTrigger>
				</div>
			</div>

			<DragDropProvider
				onDragStart={({ operation }) => {
					if (operation.source) beginTaskDrag(String(operation.source.id));
				}}
				onDragOver={({ operation }) => {
					if (!operation.source || !operation.target) return;
					moveTaskOptimistically(
						String(operation.source.id),
						String(operation.target.id),
					);
				}}
				onDragEnd={({ canceled }) => {
					finishTaskDrag(canceled);
				}}
			>
				<div className="scrollbar-thin grid grid-flow-col auto-cols-[minmax(280px,86vw)] gap-3 overflow-x-auto overscroll-x-contain pb-4 sm:auto-cols-80">
					{displayedColumns.map((column) => (
						<KanbanColumn
							key={column.id}
							list={column}
							onAddTask={openCreateTask}
							onAddList={openAddList}
							onEdit={openEditList}
							onArchive={archiveBoardList}
							onDelete={deleteBoardList}
						/>
					))}
				</div>
			</DragDropProvider>

			<CreateTaskModal
				isOpen={activeListId !== null}
				columnTitle={activeList?.title ?? "column"}
				onOpenChange={(isOpen) => {
					if (!isOpen) setActiveListId(null);
				}}
				onCreateTask={createTask}
			/>
			<CreateListModal
				isOpen={isListModalOpen}
				list={editingList}
				onOpenChange={setIsListModalOpen}
				onSave={saveList}
			/>
		</section>
	);
}
