"use client";

import { useDroppable } from "@dnd-kit/react";
import { Archive, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { TaskCard } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BoardList } from "@/types";

interface KanbanColumnProps {
	list: BoardList;
	onAddTask: (listId: string) => void;
	onAddList: () => void;
	onEdit: (list: BoardList) => void;
	onArchive: (listId: string) => void;
	onDelete: (listId: string) => void;
	onOpenTask: (taskId: string) => void;
	openingTaskId?: string | null;
	selectedTaskIds?: ReadonlySet<string>;
	draggedTaskIds?: ReadonlySet<string>;
	onToggleTaskSelection?: (taskId: string) => void;
	onRestoreTask?: (taskId: string) => void;
}

// Renders one board list as a droppable column in the Kanban interface.
export function KanbanColumn({
	list,
	onAddTask,
	onAddList,
	onEdit,
	onArchive,
	onDelete,
	onOpenTask,
	openingTaskId = null,
	selectedTaskIds = new Set<string>(),
	draggedTaskIds = new Set<string>(),
	onToggleTaskSelection,
	onRestoreTask,
}: KanbanColumnProps) {
	const { ref, isDropTarget } = useDroppable({
		id: `column:${list.id}`,
		accept: "task",
		data: { listId: list.id },
	});

	return (
		<section
			ref={ref}
			aria-labelledby={`column-${list.id}`}
			className={cn(
				"group/column flex h-[clamp(28rem,calc(100dvh-17rem),46rem)] min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-muted/70 p-2.5 transition-colors dark:border-border dark:bg-muted/60",
				isDropTarget && "bg-brand_teal-50/30 ring-2 ring-brand_teal-500/60 dark:bg-brand_teal-950/30",
			)}
		>
			<header className="px-1.5 pt-1.5 pb-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<h2
							id={`column-${list.id}`}
							className="text-sm font-semibold text-foreground tracking-tight"
						>
							{list.title}
						</h2>
						<span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-2xs border border-border">
							{list.tasks.length}
						</span>
					</div>
					<div className="flex items-center">
						<DropdownMenuTrigger>
							<TooltipTrigger delay={400}>
								<Button
									size="icon-sm"
									variant="ghost"
									aria-label={`Options for ${list.title}`}
									className="rounded-xl text-muted-foreground hover:bg-card hover:text-foreground"
								>
									<Ellipsis className="size-4" />
								</Button>
								<Tooltip placement="bottom">Column options</Tooltip>
							</TooltipTrigger>
							<DropdownMenu placement="bottom end">
								<DropdownMenuItem onAction={onAddList}>
									<Plus /> Add column
								</DropdownMenuItem>
								<DropdownMenuItem onAction={() => onEdit(list)}>
									<Pencil /> Edit column
								</DropdownMenuItem>
								<DropdownMenuItem onAction={() => onArchive(list.id)}>
									<Archive /> Archive column
								</DropdownMenuItem>
								<DropdownMenuItem
									variant="destructive"
									onAction={() => onDelete(list.id)}
								>
									<Trash2 /> Delete column
								</DropdownMenuItem>
							</DropdownMenu>
						</DropdownMenuTrigger>
						<TooltipTrigger delay={400}>
							<Button
								size="icon-sm"
								variant="ghost"
								onPress={() => onAddTask(list.id)}
								aria-label={`Add task to ${list.title}`}
								className="rounded-xl text-muted-foreground hover:bg-card hover:text-foreground"
							>
								<Plus className="size-4" />
							</Button>
							<Tooltip placement="bottom">Add task</Tooltip>
						</TooltipTrigger>
					</div>
				</div>
				{list.description ? (
					<p className="mt-1.5 text-xs leading-5 text-muted-foreground">
						{list.description}
					</p>
				) : null}
			</header>

			<div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pr-1">
				{list.tasks.map((task) => (
					<TaskCard
						key={task.id}
						task={task}
						listId={list.id}
						isOpening={openingTaskId === task.id}
						isSelected={selectedTaskIds.has(task.id)}
						selectedDragCount={
							selectedTaskIds.has(task.id) ? selectedTaskIds.size : 1
						}
						isGroupDragging={draggedTaskIds.has(task.id)}
						onToggleSelection={onToggleTaskSelection}
						onRestore={onRestoreTask}
						onOpen={onOpenTask}
					/>
				))}
				{list.tasks.length === 0 ? (
					<div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
						Drop a task here or add a new one.
					</div>
				) : null}
			</div>

			<Button
				type="button"
				variant="default"
				size="sm"
				onPress={() => onAddTask(list.id)}
				className="pointer-events-none mt-3 w-full translate-y-1 rounded-xl text-xs opacity-0 shadow-xs transition-[opacity,transform] focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 group-focus-within/column:pointer-events-auto group-focus-within/column:translate-y-0 group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:translate-y-0 group-hover/column:opacity-100"
			>
				<Plus data-icon="inline-start" /> Add task
			</Button>
		</section>
	);
}
