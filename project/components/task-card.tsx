"use client";

import { useDraggable, useDroppable } from "@dnd-kit/react";
import {
	CheckCircle2,
	Circle,
	Clock3,
	MoreHorizontal,
	PanelRightOpen,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/types";

// TODO: Task 5.6 - Create task detail modals and editing interfaces

/*
TODO: Implementation Notes for Interns:

This component should display:
- Task title and description
- Priority indicator
- Assignee avatar
- Due date
- Labels/tags
- Comments count
- Drag handle for reordering

Props interface:
interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high'
    assignee?: User
    dueDate?: Date
    labels: string[]
    commentsCount: number
  }
  isDragging?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

Features to implement:
- Drag and drop support
- Click to open task modal
- Priority color coding
- Overdue indicators
- Responsive design
*/

interface TaskCardProps {
	task: BoardTask;
	listId: string;
	onOpen: (taskId: string) => void;
}

const complexityStyles: Record<BoardTask["complexity"]["key"], string> = {
	low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
	medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
	high: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

// Returns the status icon used in the leading task marker.
function TaskStatusIcon({ task }: Pick<TaskCardProps, "task">) {
	if (task.completedAt) return <CheckCircle2 className="size-4" />;
	if (task.assignees.length > 0) return <Clock3 className="size-4" />;
	return <Circle className="size-4" />;
}

// Formats a stored ISO date for the compact task card.
function formatDueDate(value: string | null) {
	if (!value) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(new Date(`${value}T00:00:00`));
}

// Renders a controlled draggable task and a stable task-level drop target.
function TaskCardComponent({ task, listId, onOpen }: TaskCardProps) {
	const {
		ref: draggableRef,
		handleRef,
		isDragSource,
	} = useDraggable({
		id: task.id,
		type: "task",
		data: { listId },
	});
	const { ref: droppableRef, isDropTarget } = useDroppable({
		id: task.id,
		accept: "task",
		data: { listId },
	});

	// Connects both dnd-kit roles to one stable card DOM node.
	function setCardRef(element: HTMLElement | null) {
		draggableRef(element);
		droppableRef(element);
	}

	return (
		<article
			ref={setCardRef}
			className={cn(
				"relative isolate flex min-h-36 w-full flex-col rounded-2xl border border-black/5 bg-white p-3.5 text-left shadow-sm transition-[box-shadow,opacity,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/8 dark:bg-zinc-900",
				isDragSource && "opacity-45 shadow-lg",
				isDropTarget && "ring-2 ring-sky-500/60 ring-offset-2",
			)}
		>
			<Button
				ref={handleRef}
				type="button"
				variant="ghost"
				aria-label={`Drag ${task.title}`}
				className="absolute inset-0 z-0 h-auto w-full cursor-grab rounded-2xl p-0 hover:bg-transparent active:cursor-grabbing dark:hover:bg-transparent"
			>
				<span className="sr-only">Drag {task.title}</span>
			</Button>

			<div className="pointer-events-none relative z-10 flex items-center justify-between gap-3">
				<div className="flex items-center gap-1 text-zinc-500">
					<span aria-hidden="true">
						<TaskStatusIcon task={task} />
					</span>
				</div>
				<div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-300">
					<span>{formatDueDate(task.dueDate)}</span>
					<span title={`${task.assignees.length} assignees`}>
						{task.assignees.length || "Unassigned"}
					</span>
					<DropdownMenuTrigger>
						<TooltipTrigger delay={400}>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								className="pointer-events-auto relative z-20 rounded-lg"
								aria-label={`Actions for ${task.title}`}
							>
								<MoreHorizontal />
							</Button>
							<Tooltip placement="bottom end">Task actions</Tooltip>
						</TooltipTrigger>
						<DropdownMenu placement="bottom end">
							<DropdownMenuItem onAction={() => onOpen(task.id)}>
								<PanelRightOpen />
								View task details
							</DropdownMenuItem>
						</DropdownMenu>
					</DropdownMenuTrigger>
				</div>
			</div>

			<div className="pointer-events-none relative z-10 mt-3 flex min-h-20 flex-1 flex-col">
				<h3 className="line-clamp-2 w-full text-left text-sm font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
					{task.title}
				</h3>

				<div className="mt-auto w-full pt-6 text-left">
					<span
						className={cn(
							"rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide",
							complexityStyles[task.complexity.key],
						)}
					>
						{task.complexity.label}
					</span>
				</div>
			</div>
		</article>
	);
}

// Avoids rerendering unchanged task cards when another card moves.
export const TaskCard = memo(TaskCardComponent);
