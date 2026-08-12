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
import type { BoardList } from "@/stores/board-store";

interface KanbanColumnProps {
	list: BoardList;
	onAddTask: (listId: string) => void;
	onAddList: () => void;
	onEdit: (list: BoardList) => void;
	onArchive: (listId: string) => void;
	onDelete: (listId: string) => void;
}

// Renders one board list as a droppable column in the Kanban interface.
export function KanbanColumn({
	list,
	onAddTask,
	onAddList,
	onEdit,
	onArchive,
	onDelete,
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
				"group/column flex h-[clamp(28rem,calc(100dvh-17rem),46rem)] min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200/80 bg-zinc-100/80 p-2.5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60",
				isDropTarget && "bg-sky-50 ring-2 ring-sky-500/50 dark:bg-sky-950/30",
			)}
		>
			<header className="px-1.5 pt-1.5 pb-3">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<h2
							id={`column-${list.id}`}
							className="text-sm font-semibold text-zinc-950 dark:text-zinc-50"
						>
							{list.title}
						</h2>
						<span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-500 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
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
									className="rounded-xl text-zinc-500 hover:bg-white hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
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
								className="rounded-xl text-zinc-500 hover:bg-white hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
							>
								<Plus className="size-4" />
							</Button>
							<Tooltip placement="bottom">Add task</Tooltip>
						</TooltipTrigger>
					</div>
				</div>
				<p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
					{list.description}
				</p>
			</header>

			<div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pr-1">
				{list.tasks.map((task) => (
					<TaskCard
						key={task.id}
						task={task}
						listId={list.id}
						status={list.id}
					/>
				))}
				{list.tasks.length === 0 ? (
					<div className="flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
						Drop a task here or add a new one.
					</div>
				) : null}
			</div>

			<Button
				type="button"
				variant="outline"
				size="lg"
				onPress={() => onAddTask(list.id)}
				className="pointer-events-none mt-3 w-full translate-y-1 rounded-2xl text-xs text-zinc-600 opacity-0 shadow-sm transition-[opacity,transform] focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100 group-focus-within/column:pointer-events-auto group-focus-within/column:translate-y-0 group-focus-within/column:opacity-100 group-hover/column:pointer-events-auto group-hover/column:translate-y-0 group-hover/column:opacity-100 dark:text-zinc-300"
			>
				<Plus data-icon="inline-start" /> Add task
			</Button>
		</section>
	);
}
