"use client";

import { CheckCircle2, Circle, Clock3, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/types";

interface TaskDragOverlayProps {
	tasks: BoardTask[];
}

const priorityStyles: Record<BoardTask["priority"]["key"], string> = {
	low: "priority-badge-low",
	medium: "priority-badge-medium",
	high: "priority-badge-high",
};

// Formats the due date shown in the visual drag preview.
function formatDueDate(value: string | null) {
	if (!value) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(new Date(`${value}T00:00:00`));
}

// Returns a compact fallback when an assignee has no Clerk profile image.
function getMemberInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

// Selects the same compact status marker used by regular task cards.
function TaskStatusMarker({ task }: { task: BoardTask }) {
	if (task.completedAt)
		return (
			<CheckCircle2 className="size-4 text-brand_mint-600 dark:text-brand_mint-400" />
		);
	if (task.assignees.length > 0)
		return (
			<Clock3 className="size-4 text-brand_teal-600 dark:text-brand_teal-400" />
		);
	return <Circle className="size-4" />;
}

// Renders a lightweight stacked preview that follows a selected task group.
export function TaskDragOverlay({ tasks }: TaskDragOverlayProps) {
	if (tasks.length === 0) return null;
	const [task] = tasks;
	if (!task) return null;

	return (
		<div
			className="relative w-[min(19rem,calc(100vw-2rem))] pb-3"
			aria-hidden="true"
		>
			{tasks.length > 2 ? (
				<div className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border bg-card/70 shadow-md" />
			) : null}
			{tasks.length > 1 ? (
				<div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-xl border bg-card/85 shadow-lg" />
			) : null}
			<div className="relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-card p-3.5 shadow-xl dark:border-white/8">
				<div className="flex items-center gap-2 text-muted-foreground">
					<TaskStatusMarker task={task} />
					<span className="text-[11px]">{formatDueDate(task.dueDate)}</span>
				</div>

				<h3 className="mt-3 text-sm font-semibold leading-5 wrap-anywhere">
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
							<Badge
								key={label.id}
								style={{
									backgroundColor: `${label.color}15`,
									borderColor: `${label.color}35`,
								}}
								className="max-w-full text-[10px] gap-1.5 font-medium"
							>
								<span
									className="size-1.5 rounded-full shrink-0"
									style={{ backgroundColor: label.color }}
									aria-hidden="true"
								/>
								<span className="truncate">{label.name}</span>
							</Badge>
						))}
					</div>
				) : null}

				<div className="mt-4 flex items-end justify-between gap-3">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<span
							className={cn(
								"rounded-full px-2 py-1 text-[10px] font-semibold",
								priorityStyles[task.priority.key],
							)}
						>
							{task.priority.label}
						</span>
						{task.commentsCount > 0 ? (
							<span className="flex items-center gap-1 text-[11px] text-muted-foreground">
								<MessageSquare className="size-3.5" />
								{task.commentsCount}
							</span>
						) : null}
					</div>
					{task.assignees.length > 0 ? (
						<div className="flex -space-x-1.5">
							{task.assignees.slice(0, 3).map((member) => (
								<Avatar key={member.id} className="size-6 border-2 border-card">
									{member.imageUrl ? (
										<AvatarImage src={member.imageUrl} alt="" />
									) : null}
									<AvatarFallback className="text-[9px]">
										{getMemberInitials(member.name)}
									</AvatarFallback>
								</Avatar>
							))}
						</div>
					) : null}
				</div>
				{tasks.length > 1 ? (
					<p className="mt-3 border-t pt-2 text-xs font-medium text-muted-foreground">
						Moving with {tasks.length - 1} more selected
					</p>
				) : null}
			</div>
			{tasks.length > 1 ? (
				<span className="absolute -top-2 -right-2 z-20 grid min-w-7 place-items-center rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
					{tasks.length}
				</span>
			) : null}
		</div>
	);
}
