"use client";

import { useDraggable, useDroppable } from "@dnd-kit/react";
import {
	AlertTriangle,
	CheckCircle2,
	Circle,
	Clock3,
	GripVertical,
	LoaderCircle,
	MessageSquare,
	MoreHorizontal,
	PanelRightOpen,
	Square,
	SquareCheckBig,
} from "lucide-react";
import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/types";

interface TaskCardProps {
	task: BoardTask;
	listId: string;
	isOpening?: boolean;
	isSelected?: boolean;
	isGroupDragging?: boolean;
	selectedDragCount?: number;
	onToggleSelection?: (taskId: string) => void;
	onRestore?: (taskId: string) => void;
	onOpen: (taskId: string) => void;
}

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

const priorityStyles: Record<BoardTask["priority"]["key"], string> = {
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

// Checks whether an unfinished task passed its local calendar due date.
function isTaskOverdue(task: BoardTask) {
	if (!task.dueDate || task.completedAt) return false;
	const dueDate = new Date(`${task.dueDate}T00:00:00`);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return dueDate < today;
}

// Produces a compact avatar fallback from a synchronized member name.
function getMemberInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

// Renders a controlled draggable task and a stable task-level drop target.
function TaskCardComponent({
	task,
	listId,
	isOpening = false,
	isSelected = false,
	isGroupDragging = false,
	selectedDragCount = 1,
	onToggleSelection,
	onRestore,
	onOpen,
}: TaskCardProps) {
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
	const overdue = isTaskOverdue(task);

	return (
		<article
			ref={setCardRef}
			aria-busy={isOpening}
			className={cn(
				"relative isolate flex w-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white p-3.5 text-left shadow-sm transition-[box-shadow,opacity,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/8 dark:bg-zinc-900",
				overdue &&
					"border-rose-300 bg-rose-50/60 shadow-rose-100 dark:border-rose-900 dark:bg-rose-950/20 dark:shadow-none",
				isGroupDragging && "scale-[0.98] opacity-35 shadow-none",
				isDragSource && "opacity-25",
				isDropTarget && "ring-2 ring-sky-500/60 ring-offset-2",
				isSelected && "ring-2 ring-primary ring-inset",
			)}
		>
			<Button
				type="button"
				variant="ghost"
				aria-label={`Open task ${task.title}`}
				className="absolute inset-0 z-0 h-auto w-full rounded-2xl p-0 hover:bg-transparent dark:hover:bg-transparent"
				onPress={() => {
					if (!task.archivedAt) onOpen(task.id);
				}}
			>
				<span className="sr-only">Open task {task.title}</span>
			</Button>

			<div className="pointer-events-none relative z-10 flex items-start justify-between gap-3 pr-7">
				<div className="flex min-w-0 items-center gap-2 text-zinc-500">
					{onToggleSelection ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="pointer-events-auto -ml-1 rounded-md"
							aria-label={
								isSelected ? `Deselect ${task.title}` : `Select ${task.title}`
							}
							aria-pressed={isSelected}
							onPress={() => onToggleSelection(task.id)}
						>
							{isSelected ? <SquareCheckBig /> : <Square />}
						</Button>
					) : null}
					<span aria-hidden="true">
						<TaskStatusIcon task={task} />
					</span>
					<span
						className={cn(
							"truncate text-[11px] text-zinc-600 dark:text-zinc-300",
							overdue && "font-semibold text-rose-700 dark:text-rose-300",
						)}
					>
						{overdue ? "Overdue · " : ""}
						{formatDueDate(task.dueDate)}
					</span>
					{overdue ? (
						<AlertTriangle
							className="size-3.5 shrink-0 text-rose-600"
							aria-hidden="true"
						/>
					) : null}
				</div>
			</div>

			<div className="absolute top-2 right-2 z-20 flex flex-col items-center gap-0.5">
				{isOpening ? (
					<LoaderCircle
						className="m-1.5 size-4 animate-spin text-muted-foreground"
						aria-label="Opening task details"
					/>
				) : (
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
							{task.archivedAt ? (
								<DropdownMenuItem onAction={() => onRestore?.(task.id)}>
									Restore task
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem onAction={() => onOpen(task.id)}>
									<PanelRightOpen />
									View task details
								</DropdownMenuItem>
							)}
						</DropdownMenu>
					</DropdownMenuTrigger>
				)}
				{!task.archivedAt ? (
					<TooltipTrigger delay={400}>
						<Button
							ref={handleRef}
							type="button"
							variant="ghost"
							size="icon-xs"
							className="cursor-grab rounded-lg text-muted-foreground active:cursor-grabbing"
							aria-label={
								isSelected && selectedDragCount > 1
									? `Drag ${selectedDragCount} selected tasks`
									: `Drag ${task.title}`
							}
						>
							<GripVertical />
						</Button>
						<Tooltip placement="right">
							{isSelected && selectedDragCount > 1
								? `Drag ${selectedDragCount} selected tasks`
								: "Drag task"}
						</Tooltip>
					</TooltipTrigger>
				) : null}
			</div>

			<div className="pointer-events-none relative z-10 mt-3 flex flex-col pr-5">
				{task.archivedAt ? (
					<Badge variant="outline" className="mb-2 w-fit">
						Archived
					</Badge>
				) : null}
				<h3 className="w-full text-left text-sm font-semibold leading-5 text-zinc-950 wrap-anywhere dark:text-zinc-50">
					{task.title}
				</h3>
				{task.description ? (
					<p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
						{task.description}
					</p>
				) : null}
				{task.labels.length > 0 ? (
					<div className="mt-3 flex flex-wrap gap-1">
						{task.labels.slice(0, 3).map((label) => (
							<Badge key={label.id} variant="secondary" className="max-w-full">
								<span className="truncate">{label.name}</span>
							</Badge>
						))}
					</div>
				) : null}

				<div className="mt-4 flex w-full items-end justify-between gap-3 text-left">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<span
							className={cn(
								"rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide",
								priorityStyles[task.priority.key],
							)}
						>
							{task.priority.label}
						</span>
						{task.commentsCount > 0 ? (
							<span className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<MessageSquare className="size-3.5" aria-hidden="true" />
								{task.commentsCount}
							</span>
						) : null}
					</div>
					{task.assignees.length > 0 ? (
						<div className="pointer-events-auto relative z-20 flex -space-x-1.5">
							{task.assignees.slice(0, 3).map((member) => (
								<TooltipTrigger key={member.id} delay={300}>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="rounded-full p-0 ring-2 ring-background"
										aria-label={`Assigned to ${member.name}`}
										onPress={() => onOpen(task.id)}
									>
										<Avatar size="sm">
											{member.imageUrl ? (
												<AvatarImage src={member.imageUrl} alt={member.name} />
											) : null}
											<AvatarFallback>
												{getMemberInitials(member.name)}
											</AvatarFallback>
										</Avatar>
									</Button>
									<Tooltip placement="top">{member.name}</Tooltip>
								</TooltipTrigger>
							))}
							{task.assignees.length > 3 ? (
								<span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
									+{task.assignees.length - 3}
								</span>
							) : null}
						</div>
					) : null}
				</div>
			</div>
		</article>
	);
}

// Avoids rerendering unchanged task cards when another card moves.
export const TaskCard = memo(TaskCardComponent);
