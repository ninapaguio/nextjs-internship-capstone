"use client";

import type { CalendarDate } from "@internationalized/date";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type Key, useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createBoardLabel, createBoardTask } from "@/actions/board";
import { TaskLabelSelect } from "@/components/tasks/task-label-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
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
import { useActionToast } from "@/hooks/use-action-toast";
import type {
	BoardActionState,
	BoardLabelOption,
	CalendarTaskCreationOptions,
} from "@/types";

interface CreateCalendarTaskModalProps {
	options: CalendarTaskCreationOptions;
}

const initialState: BoardActionState = { status: "idle", message: "" };

// Shows submission progress without maintaining duplicate client loading state.
function CreateCalendarTaskSubmit() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Adding…" : "Add task"}
		</Button>
	);
}

// Formats the selected due date for the task form trigger.
function formatDueDate(date: CalendarDate | null) {
	if (!date) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date.toDate("UTC"));
}

// Creates a task from Calendar and navigates to its due date when available.
export function CreateCalendarTaskModal({
	options,
}: CreateCalendarTaskModalProps) {
	const router = useRouter();
	const firstProject = options.projects[0] ?? null;
	const [isOpen, setIsOpen] = useState(false);
	const [projectId, setProjectId] = useState(firstProject?.id ?? "");
	const [listId, setListId] = useState(firstProject?.columns[0]?.id ?? "");
	const [priorityId, setPriorityId] = useState(
		options.priorities[1]?.id ?? options.priorities[0]?.id ?? "",
	);
	const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
	const [labelIds, setLabelIds] = useState<string[]>([]);
	const [labelsByProject, setLabelsByProject] = useState(
		() =>
			new Map<string, BoardLabelOption[]>(
				options.projects.map((project) => [project.id, project.labels]),
			),
	);
	const selectedProject = useMemo(
		() => options.projects.find((project) => project.id === projectId) ?? null,
		[options.projects, projectId],
	);

	// Submits through the shared task action and updates the calendar URL on success.
	const [state, formAction] = useActionState(
		async (
			previousState: BoardActionState,
			formData: FormData,
		): Promise<BoardActionState> => {
			const result = await createBoardTask(previousState, formData);
			if (result.status !== "success" || !result.data) return result;

			setIsOpen(false);
			setLabelIds([]);
			const date = dueDate?.toString();
			if (date) {
				router.push(
					`/calendar?date=${encodeURIComponent(date)}&view=month&task=${encodeURIComponent(result.data.id)}`,
				);
			} else {
				router.refresh();
			}
			return result;
		},
		initialState,
	);
	useActionToast(state, { successMessage: "Task added to the calendar." });

	// Selects a project and defaults the destination to its first active column.
	function selectProject(value: Key | null) {
		const nextProjectId = String(value ?? "");
		const nextProject = options.projects.find(
			(project) => project.id === nextProjectId,
		);
		setProjectId(nextProjectId);
		setListId(nextProject?.columns[0]?.id ?? "");
		setLabelIds([]);
	}

	// Creates a reusable label for the selected project and adds it to this form.
	async function createProjectLabel(
		name: string,
		color: string,
	): Promise<BoardLabelOption> {
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("name", name);
		formData.set("color", color);
		const result = await createBoardLabel(formData);
		if (result.status === "error" || !result.data) {
			throw new Error(result.message);
		}
		const createdLabel = result.data;
		setLabelsByProject((current) => {
			const next = new Map(current);
			next.set(projectId, [...(next.get(projectId) ?? []), createdLabel]);
			return next;
		});
		return createdLabel;
	}

	const selectedProjectLabels = labelsByProject.get(projectId) ?? [];

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button size="sm" isDisabled={options.projects.length === 0}>
				<Plus data-icon="inline-start" /> Add task
			</Button>
			<Dialog className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
				<form action={formAction} className="grid gap-5">
					<input
						type="hidden"
						name="assigneeIds"
						value={options.currentUserId}
					/>
					<input
						type="hidden"
						name="dueDate"
						value={dueDate?.toString() ?? ""}
					/>
					{labelIds.map((labelId) => (
						<input
							key={labelId}
							type="hidden"
							name="labelIds"
							value={labelId}
						/>
					))}
					<DialogHeader>
						<DialogTitle>Create a task</DialogTitle>
						<DialogDescription>
							Choose the project and column where this task belongs.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2 text-sm font-medium">
								<span>
									Project <span className="text-destructive">*</span>
								</span>
								<Select
									id="calendar-task-project"
									name="projectId"
									aria-label="Project"
									isRequired
									value={projectId}
									onChange={selectProject}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{options.projects.map((project) => (
											<SelectItem key={project.id} id={project.id}>
												{project.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2 text-sm font-medium">
								<span>
									Column <span className="text-destructive">*</span>
								</span>
								<Select
									id="calendar-task-column"
									name="listId"
									aria-label="Column"
									isRequired
									value={listId}
									onChange={(value) => setListId(String(value ?? ""))}
									isDisabled={!selectedProject}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{selectedProject?.columns.map((column) => (
											<SelectItem key={column.id} id={column.id}>
												{column.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="calendar-task-title"
						>
							<span>
								Task title <span className="text-destructive">*</span>
							</span>
							<Input
								id="calendar-task-title"
								name="title"
								required
								maxLength={200}
								autoFocus
							/>
						</label>

						<label
							className="grid gap-2 text-sm font-medium"
							htmlFor="calendar-task-description"
						>
							<span>
								Description{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</span>
							<Textarea
								id="calendar-task-description"
								name="description"
								maxLength={10_000}
								className="min-h-24"
							/>
						</label>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid gap-2 text-sm font-medium">
								<span>
									Priority <span className="text-destructive">*</span>
								</span>
								<Select
									id="calendar-task-priority"
									name="priorityId"
									aria-label="Priority"
									isRequired
									value={priorityId}
									onChange={(value) => setPriorityId(String(value ?? ""))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{options.priorities.map((priority) => (
											<SelectItem key={priority.id} id={priority.id}>
												{priority.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2 text-sm font-medium">
								<span>
									Due date{" "}
									<span className="font-normal text-muted-foreground">
										(optional)
									</span>
								</span>
								<PopoverTrigger>
									<Button
										variant="outline"
										className="justify-start font-normal"
										aria-label={`Due date: ${formatDueDate(dueDate)}`}
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
							</div>
						</div>

						<div className="grid gap-2 text-sm font-medium">
							<span>
								Label{" "}
								<span className="font-normal text-muted-foreground">
									(optional)
								</span>
							</span>
							<TaskLabelSelect
								labels={selectedProjectLabels}
								value={labelIds}
								onChange={setLabelIds}
								onCreateLabel={createProjectLabel}
							/>
						</div>
					</div>

					{state.status === "error" ? (
						<p className="text-sm font-medium text-destructive" role="alert">
							{state.message}
						</p>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onPress={() => setIsOpen(false)}
						>
							Cancel
						</Button>
						<CreateCalendarTaskSubmit />
					</DialogFooter>
				</form>
			</Dialog>
		</DialogTrigger>
	);
}
