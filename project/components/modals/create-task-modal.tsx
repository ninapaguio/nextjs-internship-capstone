"use client";

import { CalendarDays, Layers3, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BoardTask, BoardTaskComplexity } from "@/stores/board-store";

// TODO: Task 4.4 - Build task creation and editing functionality
// TODO: Task 5.6 - Create task detail modals and editing interfaces

/*
TODO: Implementation Notes for Interns:

Modal for creating and editing tasks.

Features to implement:
- Task title and description
- Priority selection
- Assignee selection
- Due date picker
- Labels/tags
- Attachments
- Comments section (for edit mode)
- Activity history (for edit mode)

Form fields:
- Title (required)
- Description (rich text editor)
- Priority (low/medium/high)
- Assignee (team member selector)
- Due date (date picker)
- Labels (tag input)
- Attachments (file upload)

Integration:
- Use task validation schema
- Call task creation/update API
- Update board state optimistically
- Handle file uploads
- Real-time updates for comments
*/

interface CreateTaskModalProps {
	isOpen: boolean;
	columnTitle: string;
	onOpenChange: (isOpen: boolean) => void;
	onCreateTask: (task: BoardTask) => void;
}

const inputClassName =
	"h-11 rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900";

// Converts an assignee name into compact initials for the task card avatar.
function getInitials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

// Collects the fields needed to add a task to the currently selected column.
export function CreateTaskModal({
	isOpen,
	columnTitle,
	onOpenChange,
	onCreateTask,
}: CreateTaskModalProps) {
	const [error, setError] = useState("");

	// Validates the lightweight board form and forwards a serializable task value.
	function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const title = String(form.get("title") ?? "").trim();
		const description = String(form.get("description") ?? "").trim();
		const dueDate = String(form.get("dueDate") ?? "").trim();
		const assignee = String(form.get("assignee") ?? "").trim();
		const complexity = String(
			form.get("complexity") ?? "Medium",
		) as BoardTaskComplexity;

		if (!title) {
			setError("Give the task a title before adding it.");
			return;
		}

		onCreateTask({
			id: crypto.randomUUID(),
			title,
			description: description || "No description added yet.",
			complexity,
			dueDate: dueDate
				? new Intl.DateTimeFormat("en", {
						month: "short",
						day: "numeric",
					}).format(new Date(`${dueDate}T00:00:00`))
				: "No date",
			assignee: getInitials(assignee) || "ME",
		});

		event.currentTarget.reset();
		setError("");
		onOpenChange(false);
	}

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="sm:max-w-xl">
			<form onSubmit={handleSubmit} className="grid gap-5">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Create a task
					</DialogTitle>
					<DialogDescription>
						Add a focused work item to <strong>{columnTitle}</strong>.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4">
					<label
						className="grid gap-2 text-sm font-medium"
						htmlFor="task-title"
					>
						Task title
						<Input
							id="task-title"
							name="title"
							placeholder="e.g. Review onboarding copy"
							className={inputClassName}
							autoFocus
						/>
					</label>

					<label
						className="grid gap-2 text-sm font-medium"
						htmlFor="task-description"
					>
						Description
						<Textarea
							id="task-description"
							name="description"
							placeholder="What needs to be done?"
							className="min-h-24 rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
						/>
					</label>

					<div className="grid gap-4 sm:grid-cols-3">
						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-complexity"
						>
							<span className="flex items-center gap-1.5">
								<Layers3 className="size-4" /> Complexity
							</span>
							<Select
								id="task-complexity"
								name="complexity"
								aria-label="Complexity"
								className={inputClassName}
								defaultValue="Medium"
							>
								<SelectTrigger className="h-full w-full rounded-xl bg-white dark:bg-zinc-900">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem id="Low">Low</SelectItem>
									<SelectItem id="Medium">Medium</SelectItem>
									<SelectItem id="High">High</SelectItem>
								</SelectContent>
							</Select>
						</label>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-due-date"
						>
							<span className="flex items-center gap-1.5">
								<CalendarDays className="size-4" /> Due date
							</span>
							<Input
								id="task-due-date"
								name="dueDate"
								type="date"
								className={inputClassName}
							/>
						</label>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-assignee"
						>
							<span className="flex items-center gap-1.5">
								<UserRound className="size-4" /> Assignee
							</span>
							<Input
								id="task-assignee"
								name="assignee"
								placeholder="Your name"
								className={inputClassName}
							/>
						</label>
					</div>
				</div>

				{error ? (
					<p className="text-sm font-medium text-rose-600" role="alert">
						{error}
					</p>
				) : null}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onPress={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="submit">Add task</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
