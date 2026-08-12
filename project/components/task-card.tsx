"use client";

import { useDraggable, useDroppable } from "@dnd-kit/react";
import { CheckCircle2, Circle, CircleUserRound, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardTask, BoardTaskComplexity } from "@/stores/board-store";

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
	status: string;
}

const complexityStyles: Record<BoardTaskComplexity, string> = {
	Low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
	Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
	High: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

// Returns the status icon used in the leading task marker.
function TaskStatusIcon({ status }: Pick<TaskCardProps, "status">) {
	if (status === "done") return <CheckCircle2 className="size-4" />;
	if (status === "in-progress") return <Clock3 className="size-4" />;
	return <Circle className="size-4" />;
}

// Renders a controlled draggable task and a stable task-level drop target.
export function TaskCard({ task, listId, status }: TaskCardProps) {
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
		handleRef(element);
	}

	return (
		<button
			type="button"
			ref={setCardRef}
			aria-label={`Drag ${task.title}`}
			className={cn(
				"flex min-h-36 w-full cursor-grab flex-col rounded-2xl border border-black/5 bg-white p-3.5 text-left shadow-sm transition-[box-shadow,opacity,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing dark:border-white/8 dark:bg-zinc-900",
				isDragSource && "opacity-45 shadow-lg",
				isDropTarget && "ring-2 ring-sky-500/60 ring-offset-2",
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<span className="text-zinc-500" aria-hidden="true">
					<TaskStatusIcon status={status} />
				</span>
				<div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-300">
					<span>{task.dueDate}</span>
					<CircleUserRound
						className="size-5"
						aria-label={`Assigned to ${task.assignee}`}
					/>
				</div>
			</div>

			<h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
				{task.title}
			</h3>

			<div className="mt-auto pt-6">
				<span
					className={cn(
						"rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide",
						complexityStyles[task.complexity],
					)}
				>
					{task.complexity}
				</span>
			</div>
		</button>
	);
}
