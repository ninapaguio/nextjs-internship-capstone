"use client";

import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import {
	ArrowDownAZ,
	CheckSquare,
	Filter,
	MoveRight,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	changeBoardListLifecycle,
	changeBoardTaskLifecycle,
	createBoardLabel,
	moveBoardTasks,
} from "@/actions/board";
import { KanbanColumn } from "@/components/kanban-column";
import { ConfirmLifecycleDialog } from "@/components/modals/confirm-lifecycle-dialog";
import { CreateListModal } from "@/components/modals/create-list-modal";
import { CreateTaskModal } from "@/components/modals/create-task-modal";
import { TaskDetailsPanel } from "@/components/tasks/task-details-panel";
import { TaskDragOverlay } from "@/components/tasks/task-drag-overlay";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Popover,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useBoardSync } from "@/hooks/use-board-sync";
import { useTaskComments } from "@/hooks/use-task-comments";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type {
	BoardLabelOption,
	BoardList,
	BoardTask,
	PriorityFilter,
	ProjectBoardData,
	TaskStatusFilter,
} from "@/types";

interface KanbanBoardProps {
	projectId: string;
	initialBoardVersion: number;
	realtimeConfig: ProjectRealtimeConfig | null;
	currentUserId: string;
	initialData: ProjectBoardData;
	canEditTasks: boolean;
	canManageColumns: boolean;
	initialSelectedTaskId?: string | null;
}

// Provides persisted board filtering, task details, and optimistic dnd-kit movement.
export function KanbanBoard({
	projectId,
	initialBoardVersion,
	realtimeConfig,
	currentUserId,
	initialData,
	canEditTasks,
	canManageColumns,
	initialSelectedTaskId,
}: KanbanBoardProps) {
	const columns = useBoardStore((state) => state.lists);
	const draggedTaskIds = useBoardStore((state) => state.draggedTaskIds);
	const hasPendingChanges = useBoardStore((state) => state.hasPendingChanges);
	const hydrate = useBoardStore((state) => state.hydrate);
	const addList = useBoardStore((state) => state.addList);
	const updateList = useBoardStore((state) => state.updateList);
	const archiveList = useBoardStore((state) => state.archiveList);
	const deleteList = useBoardStore((state) => state.deleteList);
	const addTask = useBoardStore((state) => state.addTask);
	const updateTask = useBoardStore((state) => state.updateTask);
	const beginTaskDrag = useBoardStore((state) => state.beginTaskDrag);
	const moveTasksOptimistically = useBoardStore(
		(state) => state.moveTasksOptimistically,
	);
	const finishTaskDrag = useBoardStore((state) => state.finishTaskDrag);
	const replaceLists = useBoardStore((state) => state.replaceLists);
	const markPersisted = useBoardStore((state) => state.markPersisted);
	useBoardSync({
		projectId,
		boardVersion: initialBoardVersion,
		isPaused: hasPendingChanges || draggedTaskIds.length > 0,
		realtimeConfig,
	});
	const [query, setQuery] = useState("");
	const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
	const [assigneeFilter, setAssigneeFilter] = useState("all");
	const [labelFilter, setLabelFilter] = useState("all");
	const [dueDateFilter, setDueDateFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(
		new Set(),
	);
	const [bulkTargetListId, setBulkTargetListId] = useState("");
	const [isBulkPending, setIsBulkPending] = useState(false);
	const [pendingListLifecycle, setPendingListLifecycle] = useState<{
		list: BoardList;
		action: "archive" | "delete";
	} | null>(null);
	const [sortDirection, setSortDirection] = useState<"none" | "asc" | "desc">(
		"none",
	);
	const [activeListId, setActiveListId] = useState<string | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
		initialSelectedTaskId ?? null,
	);

	useEffect(() => {
		if (initialSelectedTaskId) {
			setSelectedTaskId(initialSelectedTaskId);
		}
	}, [initialSelectedTaskId]);
	const [isListModalOpen, setIsListModalOpen] = useState(false);
	const [editingList, setEditingList] = useState<BoardList | null>(null);
	const [boardError, setBoardError] = useState<string | null>(null);
	const [boardLabels, setBoardLabels] = useState<BoardLabelOption[]>(
		initialData.labels,
	);
	const currentUser =
		initialData.members.find((member) => member.id === currentUserId) ?? null;
	const taskComments = useTaskComments(projectId, selectedTaskId);
	const draggedTaskIdSet = useMemo(
		() => new Set(draggedTaskIds),
		[draggedTaskIds],
	);
	const draggedTasks = useMemo(
		() =>
			columns
				.flatMap((list) => list.tasks)
				.filter((task) => draggedTaskIdSet.has(task.id)),
		[columns, draggedTaskIdSet],
	);

	// Persists a new project label and makes it available throughout the board.
	async function addBoardLabel(
		labelProjectId: string,
		name: string,
		color: string,
	): Promise<BoardLabelOption> {
		const formData = new FormData();
		formData.set("projectId", labelProjectId);
		formData.set("name", name);
		formData.set("color", color);
		const result = await createBoardLabel(formData);
		if (result.status === "error" || !result.data) {
			throw new Error(result.message);
		}
		const createdLabel = result.data;
		setBoardLabels((current) =>
			current.some((label) => label.id === createdLabel.id)
				? current
				: [...current, createdLabel],
		);
		toast.success("Label created.");
		return createdLabel;
	}

	// Initializes the shared board store from server-loaded database records.
	useEffect(() => {
		hydrate(projectId, initialData.lists);
	}, [hydrate, initialData.lists, projectId]);

	// Reconciles labels included in a newer server-rendered board snapshot.
	useEffect(() => {
		if (hasPendingChanges) return;
		setBoardLabels(initialData.labels);
	}, [hasPendingChanges, initialData.labels]);

	// Clears active-task selection when entering the archived search view.
	useEffect(() => {
		if (statusFilter !== "archived") return;
		setSelectedTaskIds(new Set());
		setBulkTargetListId("");
	}, [statusFilter]);

	// Clears edit-only selection state whenever the board becomes read-only.
	useEffect(() => {
		if (canEditTasks) return;
		setSelectedTaskIds(new Set());
		setBulkTargetListId("");
	}, [canEditTasks]);

	const displayedColumns = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const nextWeek = new Date(today);
		nextWeek.setDate(today.getDate() + 7);

		return columns
			.filter((column) => !column.archived)
			.map((column) => {
				const matchingTasks = column.tasks.filter((task) => {
					const matchesSearch =
						!normalizedQuery ||
						`${task.title} ${task.description ?? ""} ${task.assignees.map((member) => member.name).join(" ")}`
							.toLowerCase()
							.includes(normalizedQuery);
					const isArchived = Boolean(task.archivedAt);
					const matchesStatus =
						statusFilter === "archived"
							? isArchived
							: !isArchived &&
							(statusFilter === "all" ||
								(statusFilter === "open" && !task.completedAt) ||
								(statusFilter === "completed" && Boolean(task.completedAt)));
					const matchesPriority =
						priorityFilter === "all" || task.priority.key === priorityFilter;
					const matchesAssignee =
						assigneeFilter === "all" ||
						(assigneeFilter === "unassigned"
							? task.assignees.length === 0
							: task.assignees.some((member) => member.id === assigneeFilter));
					const matchesLabel =
						labelFilter === "all" ||
						(labelFilter === "unlabeled"
							? task.labels.length === 0
							: task.labels.some((label) => label.id === labelFilter));
					const dueDate = task.dueDate
						? new Date(`${task.dueDate}T00:00:00`)
						: null;
					const matchesDueDate =
						dueDateFilter === "all" ||
						(dueDateFilter === "none" && !dueDate) ||
						(dueDateFilter === "overdue" &&
							Boolean(dueDate && dueDate < today && !task.completedAt)) ||
						(dueDateFilter === "today" &&
							Boolean(dueDate && dueDate.getTime() === today.getTime())) ||
						(dueDateFilter === "week" &&
							Boolean(dueDate && dueDate >= today && dueDate <= nextWeek));
					return (
						matchesSearch &&
						matchesStatus &&
						matchesPriority &&
						matchesAssignee &&
						matchesLabel &&
						matchesDueDate
					);
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
	}, [
		assigneeFilter,
		columns,
		dueDateFilter,
		labelFilter,
		priorityFilter,
		query,
		sortDirection,
		statusFilter,
	]);

	// Adds or removes one task from the current bulk selection.
	function toggleTaskSelection(taskId: string) {
		setSelectedTaskIds((current) => {
			const next = new Set(current);
			if (next.has(taskId)) next.delete(taskId);
			else next.add(taskId);
			return next;
		});
	}

	// Returns selected task IDs in stable board order for group movement.
	function orderTaskIds(taskIds: ReadonlySet<string>) {
		return columns
			.flatMap((list) => list.tasks)
			.filter((task) => taskIds.has(task.id))
			.map((task) => task.id);
	}

	// Persists the current optimistic placement of a task group in one request.
	async function persistTaskGroup(taskIds: string[], snapshot: BoardList[]) {
		const currentLists = useBoardStore.getState().lists;
		const taskIdSet = new Set(taskIds);
		const targetList = currentLists.find((list) =>
			taskIds.every((taskId) => list.tasks.some((task) => task.id === taskId)),
		);
		const orderedTasks = targetList?.tasks.filter((task) =>
			taskIdSet.has(task.id),
		);
		const position = orderedTasks?.[0]?.position ?? -1;
		if (
			!targetList ||
			!orderedTasks ||
			orderedTasks.length !== taskIds.length ||
			position < 0
		) {
			replaceLists(snapshot);
			const message = "The selected tasks could not be positioned.";
			setBoardError(message);
			return false;
		}

		const formData = new FormData();
		formData.set("projectId", projectId);
		for (const task of orderedTasks) formData.append("taskIds", task.id);
		formData.set("targetListId", targetList.id);
		formData.set("position", String(position));
		const result = await moveBoardTasks(formData);
		if (result.status === "error") {
			replaceLists(snapshot);
			setBoardError(result.message);
			return false;
		}
		markPersisted();
		return true;
	}

	// Moves selected tasks optimistically and persists them as one group.
	async function moveSelectedTasks() {
		if (selectedTaskIds.size === 0 || !bulkTargetListId) return;
		setIsBulkPending(true);
		setBoardError(null);
		const snapshot = useBoardStore.getState().lists;
		const taskIds = orderTaskIds(selectedTaskIds);
		moveTasksOptimistically(taskIds, `column:${bulkTargetListId}`);
		const succeeded = await persistTaskGroup(taskIds, snapshot);
		setIsBulkPending(false);
		if (succeeded) {
			setSelectedTaskIds(new Set());
			setBulkTargetListId("");
			toast.success(
				`${taskIds.length} task${taskIds.length === 1 ? "" : "s"} moved.`,
			);
		}
	}

	// Restores one archived task from its card action.
	async function restoreTask(taskId: string) {
		setSelectedTaskIds(new Set());
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("taskId", taskId);
		formData.set("action", "restore");
		const result = await changeBoardTaskLifecycle(formData);
		if (result.status === "error") {
			setBoardError(result.message);
		} else {
			updateTask(taskId, { archivedAt: null });
			markPersisted();
			toast.success("Task restored.");
		}
	}

	const activeList = columns.find((list) => list.id === activeListId) ?? null;
	const selectedTask =
		columns
			.flatMap((list) => list.tasks)
			.find((task) => task.id === selectedTaskId) ?? null;
	const openingTaskId = taskComments.isLoading ? selectedTaskId : null;

	// Opens the creation dialog for a specific workflow column.
	function openCreateTask(listId: string) {
		if (!canEditTasks) return;
		setActiveListId(listId);
	}

	// Opens an empty dialog for creating another workflow column.
	function openAddList() {
		if (!canManageColumns) return;
		setEditingList(null);
		setIsListModalOpen(true);
	}

	// Opens the column dialog with an existing column's values.
	function openEditList(list: BoardList) {
		if (!canManageColumns) return;
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
		setBoardError(null);
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
			toast.error(result.message);
			return;
		}
		markPersisted();
		toast.success(
			action === "archive" ? "Column archived." : "Column deleted.",
		);
	}

	// Opens a confirmation dialog before changing a column's lifecycle.
	function confirmListLifecycle(listId: string, action: "archive" | "delete") {
		const list = columns.find((item) => item.id === listId);
		if (list) setPendingListLifecycle({ list, action });
	}

	// Adds a server-confirmed task to the selected workflow column.
	function createTask(task: BoardTask) {
		addTask(task.listId, task);
		markPersisted();
	}

	// Updates the task-card count after a comment is confirmed by the server.
	function recordTaskComment(
		taskId: string,
		comment: Parameters<typeof taskComments.recordComment>[1],
	) {
		taskComments.recordComment(taskId, comment);
		const task = useBoardStore
			.getState()
			.lists.flatMap((list) => list.tasks)
			.find((item) => item.id === taskId);
		if (!task) return;
		updateTask(taskId, { commentsCount: task.commentsCount + 1 });
		markPersisted();
	}

	// Persists the final optimistic task position and rolls back failed moves.
	async function persistDraggedTask() {
		const state = useBoardStore.getState();
		const taskIds = state.draggedTaskIds;
		const snapshot = state.dragSnapshot;
		if (taskIds.length === 0 || !snapshot) {
			finishTaskDrag(true);
			return;
		}

		// Clears the dragging appearance immediately; persistence continues remotely.
		finishTaskDrag(false);
		await persistTaskGroup(taskIds, snapshot);
	}

	const sortActionLabel =
		sortDirection === "none"
			? "Sort task titles ascending"
			: sortDirection === "asc"
				? "Sort task titles descending"
				: "Use manual task order";
	const activeFilterCount = [
		priorityFilter,
		assigneeFilter,
		labelFilter,
		dueDateFilter,
		statusFilter,
	].filter((value) => value !== "all").length;

	// Restores every task filter to its default active-board view.
	function clearTaskFilters() {
		setPriorityFilter("all");
		setAssigneeFilter("all");
		setLabelFilter("all");
		setDueDateFilter("all");
		setStatusFilter("all");
	}

	return (
		<section aria-label="Project Kanban board" data-project-id={projectId}>
			<div className="mb-5 flex w-full items-center justify-end gap-2.5">
				<InputGroup className="h-9 min-w-0 flex-1 bg-card border-border shadow-2xs sm:max-w-64">
					<InputGroupAddon>
						<Search aria-hidden="true" className="text-muted-foreground" />
					</InputGroupAddon>
					<InputGroupInput
						id="task-search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search tasks…"
						aria-label="Search tasks"
					/>
				</InputGroup>
				<PopoverTrigger>
					<Button
						variant="outline"
						size="icon-sm"
						className="relative shrink-0 rounded-xl shadow-2xs hover:border-brand_teal-500/50"
						aria-label={
							activeFilterCount > 0
								? `Task filters, ${activeFilterCount} active`
								: "Task filters"
						}
					>
						<Filter className="size-4" />
						{activeFilterCount > 0 ? (
							<span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-brand_navy-500 dark:bg-brand_mint-500 text-[9px] font-semibold text-white dark:text-brand_navy-950 shadow-xs">
								{activeFilterCount}
							</span>
						) : null}
					</Button>
					<Popover
						placement="bottom end"
						className="w-[min(20rem,calc(100vw-2rem))] gap-3 shadow-md"
					>
						<PopoverHeader className="flex-row items-center justify-between">
							<PopoverTitle>Filter tasks</PopoverTitle>
							{activeFilterCount > 0 ? (
								<Button variant="ghost" size="sm" onPress={clearTaskFilters}>
									Clear
								</Button>
							) : null}
						</PopoverHeader>
						<div className="grid gap-3 sm:grid-cols-2">
							<div className="grid gap-1.5">
								<p className="text-xs font-medium text-muted-foreground">
									Priority
								</p>
								<Select
									id="task-priority-filter"
									name="taskPriorityFilter"
									aria-label="Filter by priority"
									value={priorityFilter}
									onChange={(value) =>
										setPriorityFilter(String(value) as PriorityFilter)
									}
								>
									<SelectTrigger size="sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="all">All priorities</SelectItem>
										<SelectItem id="high">High</SelectItem>
										<SelectItem id="medium">Medium</SelectItem>
										<SelectItem id="low">Low</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<p className="text-xs font-medium text-muted-foreground">
									Assignee
								</p>
								<Select
									id="task-assignee-filter"
									name="taskAssigneeFilter"
									aria-label="Filter by assignee"
									value={assigneeFilter}
									onChange={(value) => setAssigneeFilter(String(value))}
								>
									<SelectTrigger size="sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="all">All assignees</SelectItem>
										<SelectItem id="unassigned">Unassigned</SelectItem>
										{initialData.members.map((member) => (
											<SelectItem key={member.id} id={member.id}>
												{member.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<p className="text-xs font-medium text-muted-foreground">
									Label
								</p>
								<Select
									id="task-label-filter"
									name="taskLabelFilter"
									aria-label="Filter by label"
									value={labelFilter}
									onChange={(value) => setLabelFilter(String(value))}
								>
									<SelectTrigger size="sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="all">All labels</SelectItem>
										<SelectItem id="unlabeled">No labels</SelectItem>
										{boardLabels.map((label) => (
											<SelectItem key={label.id} id={label.id}>
												{label.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5">
								<p className="text-xs font-medium text-muted-foreground">
									Due date
								</p>
								<Select
									id="task-due-date-filter"
									name="taskDueDateFilter"
									aria-label="Filter by due date"
									value={dueDateFilter}
									onChange={(value) => setDueDateFilter(String(value))}
								>
									<SelectTrigger size="sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="all">Any due date</SelectItem>
										<SelectItem id="overdue">Overdue</SelectItem>
										<SelectItem id="today">Due today</SelectItem>
										<SelectItem id="week">Next 7 days</SelectItem>
										<SelectItem id="none">No due date</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="grid gap-1.5 sm:col-span-2">
								<p className="text-xs font-medium text-muted-foreground">
									Status
								</p>
								<Select
									id="task-status-filter"
									name="taskStatusFilter"
									aria-label="Filter by task status"
									value={statusFilter}
									onChange={(value) =>
										setStatusFilter(String(value) as TaskStatusFilter)
									}
								>
									<SelectTrigger size="sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="all">All active</SelectItem>
										<SelectItem id="open">Open</SelectItem>
										<SelectItem id="completed">Completed</SelectItem>
										<SelectItem id="archived">Archived</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</Popover>
				</PopoverTrigger>
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

			{selectedTaskIds.size > 0 ? (
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-brand_teal-500/40 bg-card p-3.5 shadow-md ring-4 ring-brand_teal-500/10 transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2">
					<div className="flex items-center gap-2.5">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-brand_teal-500/30 bg-brand_teal-500/15 px-3 py-1 text-xs font-semibold text-brand_teal-700 dark:bg-brand_teal-500/25 dark:text-brand_teal-300">
							<CheckSquare className="size-3.5" />
							{selectedTaskIds.size}{" "}
							{selectedTaskIds.size === 1 ? "task" : "tasks"} selected
						</span>
						<p className="hidden text-xs font-medium text-muted-foreground sm:inline">
							Select a destination column to move them in bulk
						</p>
					</div>
					<div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
						<Select
							aria-label="Move selected tasks to column"
							value={bulkTargetListId || null}
							onChange={(value) => setBulkTargetListId(String(value))}
							className="min-w-44 max-w-60 flex-1"
						>
							<SelectTrigger size="sm">
								<SelectValue>Select a column</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{columns
									.filter((list) => !list.archived)
									.map((list) => (
										<SelectItem key={list.id} id={list.id}>
											{list.title}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						<Button
							variant="default"
							size="sm"
							className="bg-brand_teal-500 font-semibold text-white shadow-xs hover:bg-brand_teal-600"
							isDisabled={isBulkPending || !bulkTargetListId}
							onPress={() => void moveSelectedTasks()}
						>
							<MoveRight data-icon="inline-start" />
							{isBulkPending ? "Moving…" : "Move selected"}
						</Button>
						<TooltipTrigger delay={300}>
							<Button
								variant="ghost"
								size="sm"
								className="gap-1.5 text-muted-foreground hover:text-foreground"
								aria-label="Clear task selection"
								onPress={() => {
									setSelectedTaskIds(new Set());
									setBulkTargetListId("");
								}}
							>
								<X className="size-4" />
								<span className="hidden sm:inline">Clear</span>
							</Button>
							<Tooltip placement="bottom">Clear selection</Tooltip>
						</TooltipTrigger>
					</div>
				</div>
			) : null}

			{boardError ? (
				<p className="mb-4 text-sm text-destructive" role="alert">
					{boardError}
				</p>
			) : null}

			<DragDropProvider
				onDragStart={({ operation }) => {
					if (!canEditTasks) return;
					if (!operation.source) return;
					const taskId = String(operation.source.id);
					const taskIds = selectedTaskIds.has(taskId)
						? orderTaskIds(selectedTaskIds)
						: [taskId];
					beginTaskDrag(taskId, taskIds);
				}}
				onDragEnd={({ canceled, operation }) => {
					if (!canEditTasks) return;
					if (canceled || !operation.source || !operation.target) {
						finishTaskDrag(true);
						return;
					}

					// Reorders once on drop to avoid layout-measurement loops while dragging.
					const taskIds = useBoardStore.getState().draggedTaskIds;
					moveTasksOptimistically(taskIds, String(operation.target.id));
					void persistDraggedTask();
				}}
			>
				{displayedColumns.length ? (
					<div className="scrollbar-thin grid grid-flow-col auto-cols-[minmax(18rem,1fr)] sm:auto-cols-[minmax(20rem,1fr)] lg:auto-cols-[minmax(21rem,1fr)] gap-4 overflow-x-auto overscroll-x-contain pb-4 w-full">
						{displayedColumns.map((column) => (
							<KanbanColumn
								key={column.id}
								list={column}
								canEditTasks={canEditTasks}
								canManageColumn={canManageColumns}
								onAddTask={openCreateTask}
								onAddList={openAddList}
								onEdit={openEditList}
								onArchive={(id) => confirmListLifecycle(id, "archive")}
								onDelete={(id) => confirmListLifecycle(id, "delete")}
								onOpenTask={setSelectedTaskId}
								openingTaskId={openingTaskId}
								selectedTaskIds={selectedTaskIds}
								draggedTaskIds={draggedTaskIdSet}
								onToggleTaskSelection={
									!canEditTasks || statusFilter === "archived"
										? undefined
										: toggleTaskSelection
								}
								onRestoreTask={
									canEditTasks ? (id) => void restoreTask(id) : undefined
								}
							/>
						))}
					</div>
				) : (
					<div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-border bg-card/40 p-8 text-center shadow-2xs">
						<div>
							<p className="font-semibold text-foreground">No columns yet</p>
							<p className="mt-1 text-sm text-muted-foreground">
								Add the first workflow stage to begin planning tasks.
							</p>
							{canManageColumns ? (
								<Button className="mt-4" onPress={openAddList}>
									<Plus data-icon="inline-start" /> Add column
								</Button>
							) : null}
						</div>
					</div>
				)}
				<DragOverlay>
					<TaskDragOverlay tasks={draggedTasks} />
				</DragOverlay>
			</DragDropProvider>

			<CreateTaskModal
				projectId={projectId}
				list={activeList}
				priorityOptions={initialData.priorityOptions}
				members={initialData.members}
				labels={boardLabels}
				isOpen={activeListId !== null}
				onOpenChange={(open) => {
					if (!open) setActiveListId(null);
				}}
				onCreateTask={createTask}
				onCreateLabel={addBoardLabel}
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
				priorityOptions={initialData.priorityOptions}
				members={initialData.members}
				labels={boardLabels}
				comments={taskComments.comments}
				commentsError={taskComments.error}
				currentUser={currentUser}
				isCommentsLoading={taskComments.isLoading}
				onCommentCreated={recordTaskComment}
				onRetryComments={() => void taskComments.refetch()}
				onCreateLabel={addBoardLabel}
				isOpen={selectedTaskId !== null}
				canEdit={canEditTasks}
				onOpenChange={(open) => {
					if (!open) setSelectedTaskId(null);
				}}
				onSelectTask={setSelectedTaskId}
			/>
			{pendingListLifecycle && (
				<ConfirmLifecycleDialog
					action={pendingListLifecycle.action}
					itemName={pendingListLifecycle.list.title}
					itemType="column"
					isOpen
					onOpenChange={(open) => {
						if (!open) setPendingListLifecycle(null);
					}}
					onConfirm={() => {
						void changeListLifecycle(
							pendingListLifecycle.list.id,
							pendingListLifecycle.action,
						);
						setPendingListLifecycle(null);
					}}
				/>
			)}
		</section>
	);
}
