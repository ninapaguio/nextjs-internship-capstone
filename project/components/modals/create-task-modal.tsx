"use client";

import type { CalendarDate } from "@internationalized/date";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createBoardTask } from "@/actions/board";
import { TaskLabelSelect } from "@/components/tasks/task-label-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
	BoardActionState,
	BoardComplexityOption,
	BoardLabelOption,
	BoardList,
	BoardMemberOption,
	BoardTask,
} from "@/types";

interface CreateTaskModalProps {
	projectId: string;
	list: BoardList | null;
	complexityOptions: BoardComplexityOption[];
	members: BoardMemberOption[];
	labels: BoardLabelOption[];
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onCreateTask: (task: BoardTask) => void;
	onCreateLabel: (projectId: string, name: string) => Promise<BoardLabelOption>;
}

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

const initialState: BoardActionState = { status: "idle", message: "" };

// Shows pending feedback while the create-task Server Action runs.
function CreateTaskSubmit() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Adding…" : "Add task"}
		</Button>
	);
}

// Formats a calendar date for the create-task trigger.
function formatDueDate(date: CalendarDate | null) {
	if (!date) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date.toDate("UTC"));
}

// Creates a persisted task in the currently selected board list.
export function CreateTaskModal({
	projectId,
	list,
	complexityOptions,
	members,
	labels,
	isOpen,
	onOpenChange,
	onCreateTask,
	onCreateLabel,
}: CreateTaskModalProps) {
	const defaultComplexity =
		complexityOptions[1] ?? complexityOptions[0] ?? null;
	const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
	const [complexityId, setComplexityId] = useState(defaultComplexity?.id ?? "");
	const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
	const [labelIds, setLabelIds] = useState<string[]>([]);

	// Calls the task action and adds the confirmed database record to Zustand.
	const [state, formAction] = useActionState(
		async (
			previousState: BoardActionState,
			formData: FormData,
		): Promise<BoardActionState> => {
			if (!list) return { status: "error", message: "Select a column first." };
			const result = await createBoardTask(previousState, formData);
			if (result.status !== "success" || !result.data) return result;

			const complexity = complexityOptions.find(
				(option) => option.id === complexityId,
			);
			if (!complexity) {
				return { status: "error", message: "Select a valid complexity." };
			}

			onCreateTask({
				id: result.data.id,
				listId: list.id,
				title: String(formData.get("title") ?? ""),
				description: String(formData.get("description") ?? "") || null,
				complexity,
				dueDate: dueDate?.toString() ?? null,
				position: list.tasks.length,
				completedAt: null,
				assignees: members.filter((member) => assigneeIds.includes(member.id)),
				labels: labels.filter((label) => labelIds.includes(label.id)),
				dependencyIds: [],
				commentsCount: 0,
			});
			setDueDate(null);
			setAssigneeIds([]);
			setLabelIds([]);
			onOpenChange(false);
			return result;
		},
		initialState,
	);

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange} className="sm:max-w-xl">
			<form action={formAction} className="grid gap-5">
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="listId" value={list?.id ?? ""} />
				<input type="hidden" name="complexityId" value={complexityId} />
				<input type="hidden" name="dueDate" value={dueDate?.toString() ?? ""} />
				{assigneeIds.map((id) => (
					<input key={id} type="hidden" name="assigneeIds" value={id} />
				))}
				{labelIds.map((id) => (
					<input key={id} type="hidden" name="labelIds" value={id} />
				))}
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Create a task
					</DialogTitle>
					<DialogDescription>
						Add a focused work item to{" "}
						<strong>{list?.title ?? "this column"}</strong>.
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
							required
							maxLength={200}
							autoFocus
							className="rounded-md border-border bg-background shadow-xs"
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
							className="min-h-24 rounded-md border-border bg-background shadow-xs"
							maxLength={10_000}
						/>
					</label>

					<div className="grid gap-4 sm:grid-cols-2">
						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-complexity"
						>
							<span>Complexity</span>
							<Select
								className="w-full"
								id="task-complexity"
								aria-label="Complexity"
								value={complexityId}
								onChange={(value) => setComplexityId(String(value))}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{complexityOptions.map((option) => (
										<SelectItem key={option.id} id={option.id}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-due-date"
						>
							<span>Due date</span>
							<PopoverTrigger>
								<Button
									variant="outline"
									className="h-9 w-full justify-start rounded-md border-border bg-background font-normal"
								>
									{formatDueDate(dueDate)}
								</Button>
								<Popover className="w-auto p-0">
									<Calendar
										aria-label="Task due date"
										value={dueDate}
										onChange={setDueDate}
									/>
								</Popover>
							</PopoverTrigger>
						</label>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="task-assignee"
						>
							<span>Assignee</span>
							<Select
								className="w-full"
								id="task-assignee"
								aria-label="Assignees"
								selectionMode="multiple"
								value={assigneeIds}
								onChange={(values) =>
									setAssigneeIds(Array.from(values, String))
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{members.map((member) => (
										<SelectItem key={member.id} id={member.id}>
											{member.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>

						<div className="grid gap-2 text-sm font-medium">
							<span>Label</span>
							<TaskLabelSelect
								labels={labels}
								value={labelIds}
								onChange={setLabelIds}
								onCreateLabel={(name) => onCreateLabel(projectId, name)}
							/>
						</div>
					</div>
				</div>

				{state.status === "error" ? (
					<p className="text-sm font-medium text-rose-600" role="alert">
						{state.message}
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
					<CreateTaskSubmit />
				</DialogFooter>
			</form>
		</Dialog>
	);
}
