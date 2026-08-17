"use client";

import { type CalendarDate, parseDate } from "@internationalized/date";
import { Check, Pencil } from "lucide-react";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { type BoardActionState, updateBoardTask } from "@/actions/board";
import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type {
	BoardComplexityOption,
	BoardLabelOption,
	BoardList,
	BoardMemberOption,
	BoardTask,
} from "@/types";

interface TaskDetailsPanelProps {
	projectId: string;
	task: BoardTask | null;
	lists: BoardList[];
	complexityOptions: BoardComplexityOption[];
	members: BoardMemberOption[];
	labels: BoardLabelOption[];
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

type EditableField =
	| "title"
	| "assignees"
	| "labels"
	| "column"
	| "complexity"
	| "description"
	| null;

const initialState: BoardActionState = { status: "idle", message: "" };

const complexityStyles: Record<BoardComplexityOption["key"], string> = {
	low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
	medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
	high: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

// Shows pending feedback for task detail submissions.
function TaskDetailsSubmit() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Saving…" : "Save changes"}
		</Button>
	);
}

// Formats the selected due date for the calendar trigger.
function formatDueDate(date: CalendarDate | null) {
	if (!date) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date.toDate("UTC"));
}

// Returns compact initials when a member has no profile image.
function getMemberInitials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

// Renders a labeled detail row with consistent alignment and spacing.
function DetailRow({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid min-h-9 grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
			<span className="text-sm font-medium text-muted-foreground">{label}</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

// Displays assigned members as profile avatars with accessible name tooltips.
function AssigneeAvatars({
	assignees,
	onEdit,
}: {
	assignees: BoardMemberOption[];
	onEdit: () => void;
}) {
	if (assignees.length === 0) {
		return (
			<Button
				type="button"
				variant="ghost"
				className="h-8 px-2 text-muted-foreground"
				onPress={onEdit}
			>
				Unassigned
				<Pencil data-icon="inline-end" />
			</Button>
		);
	}

	return (
		<AvatarGroup className="w-fit">
			{assignees.map((member) => (
				<TooltipTrigger key={member.id} delay={300}>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="rounded-full p-0"
						aria-label={`Edit assignees; ${member.name} is assigned`}
						onPress={onEdit}
					>
						<Avatar>
							{member.imageUrl && (
								<AvatarImage src={member.imageUrl} alt={member.name} />
							)}
							<AvatarFallback>{getMemberInitials(member.name)}</AvatarFallback>
						</Avatar>
					</Button>
					<Tooltip placement="top">{member.name}</Tooltip>
				</TooltipTrigger>
			))}
		</AvatarGroup>
	);
}

// Renders a side panel for editing a task without comments or activity history.
export function TaskDetailsPanel({
	projectId,
	task,
	lists,
	complexityOptions,
	members,
	labels,
	isOpen,
	onOpenChange,
}: TaskDetailsPanelProps) {
	const updateTaskInStore = useBoardStore((state) => state.updateTask);
	const replaceLists = useBoardStore((state) => state.replaceLists);
	const markPersisted = useBoardStore((state) => state.markPersisted);
	const [editingField, setEditingField] = useState<EditableField>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
	const [selectedListId, setSelectedListId] = useState("");
	const [selectedComplexityId, setSelectedComplexityId] = useState("");
	const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
	const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
	const [panelError, setPanelError] = useState<string | null>(null);

	useEffect(() => {
		setEditingField(null);
		setTitle(task?.title ?? "");
		setDescription(task?.description ?? "");
		setDueDate(task?.dueDate ? parseDate(task.dueDate) : null);
		setSelectedListId(task?.listId ?? "");
		setSelectedComplexityId(task?.complexity.id ?? "");
		setSelectedAssigneeIds(task?.assignees.map((member) => member.id) ?? []);
		setSelectedLabelIds(task?.labels.map((label) => label.id) ?? []);
		setPanelError(null);
	}, [task]);

	// Optimistically updates the task and restores the board if persistence fails.
	const [state, formAction] = useActionState(
		async (
			_previousState: BoardActionState,
			formData: FormData,
		): Promise<BoardActionState> => {
			if (!task) return { status: "error", message: "No task is selected." };
			const snapshot = useBoardStore.getState().lists;
			const complexity = complexityOptions.find(
				(option) => option.id === selectedComplexityId,
			);
			const assignees = members.filter((member) =>
				selectedAssigneeIds.includes(member.id),
			);
			const selectedLabels = labels.filter((label) =>
				selectedLabelIds.includes(label.id),
			);
			const changes: Partial<BoardTask> = {
				listId: selectedListId,
				title,
				description: description || null,
				complexity: complexity ?? task.complexity,
				dueDate: dueDate?.toString() ?? null,
				completedAt: task.completedAt,
				assignees,
				labels: selectedLabels,
			};

			updateTaskInStore(task.id, changes);
			const result = await updateBoardTask(formData);
			if (result.status === "error") replaceLists(snapshot);
			else {
				markPersisted();
				setEditingField(null);
			}
			return result;
		},
		initialState,
	);

	if (!task) return null;
	const activeTask = task;
	const selectedAssignees = members.filter((member) =>
		selectedAssigneeIds.includes(member.id),
	);
	const selectedLabels = labels.filter((label) =>
		selectedLabelIds.includes(label.id),
	);
	const selectedList = lists.find((list) => list.id === selectedListId);
	const selectedComplexity =
		complexityOptions.find((option) => option.id === selectedComplexityId) ??
		task.complexity;

	// Toggles completion immediately and restores the task if persistence fails.
	async function handleCompletion() {
		const snapshot = useBoardStore.getState().lists;
		const completed = !activeTask.completedAt;
		updateTaskInStore(activeTask.id, {
			completedAt: completed ? new Date().toISOString() : null,
		});
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("taskId", activeTask.id);
		formData.set("completed", String(completed));
		const result = await updateBoardTask(formData);
		if (result.status === "error") {
			replaceLists(snapshot);
			setPanelError(result.message);
		} else markPersisted();
	}

	return (
		<SheetContent
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			side="right"
			className="w-full sm:max-w-xl lg:max-w-2xl"
		>
			<SheetHeader className="border-b pr-14">
				<div className="flex items-start justify-between gap-3">
					<SheetTitle className="sr-only">Task details</SheetTitle>
					{editingField === "title" ? (
						<Input
							aria-label="Task title"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							maxLength={200}
							autoFocus
							className="h-10 flex-1 text-lg font-semibold"
						/>
					) : (
						<TooltipTrigger delay={400}>
							<Button
								type="button"
								variant="ghost"
								className="h-auto min-w-0 justify-start gap-2 px-0 py-1 text-left text-xl font-semibold hover:bg-transparent"
								onPress={() => setEditingField("title")}
							>
								<span className="truncate">{title}</span>
								<Pencil className="size-4" />
							</Button>
							<Tooltip placement="bottom start">Edit task title</Tooltip>
						</TooltipTrigger>
					)}
				</div>
				<SheetDescription>
					Select a displayed value to edit it, then save your changes.
				</SheetDescription>
			</SheetHeader>

			<div className="min-h-0 flex-1 overflow-y-auto bg-muted/20">
				<form action={formAction} className="flex min-h-full flex-col">
					<div className="space-y-2 px-6 py-6">
						<input type="hidden" name="projectId" value={projectId} />
						<input type="hidden" name="taskId" value={task.id} />
						<input type="hidden" name="title" value={title} />
						<input type="hidden" name="description" value={description} />
						<input type="hidden" name="listId" value={selectedListId} />
						<input type="hidden" name="replaceAssignees" value="true" />
						<input type="hidden" name="replaceLabels" value="true" />
						<input
							type="hidden"
							name="complexityId"
							value={selectedComplexityId}
						/>
						<input
							type="hidden"
							name="dueDate"
							value={dueDate?.toString() ?? ""}
						/>
						{selectedAssigneeIds.map((id) => (
							<input key={id} type="hidden" name="assigneeIds" value={id} />
						))}
						{selectedLabelIds.map((id) => (
							<input key={id} type="hidden" name="labelIds" value={id} />
						))}

						<DetailRow label="Assignees">
							{editingField === "assignees" ? (
								<Select
									aria-label="Assignees"
									selectionMode="multiple"
									value={selectedAssigneeIds}
									onChange={(values) =>
										setSelectedAssigneeIds(Array.from(values, String))
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
							) : (
								<AssigneeAvatars
									assignees={selectedAssignees}
									onEdit={() => setEditingField("assignees")}
								/>
							)}
						</DetailRow>

						<DetailRow label="Labels">
							{editingField === "labels" ? (
								<Select
									aria-label="Labels"
									selectionMode="multiple"
									value={selectedLabelIds}
									onChange={(values) =>
										setSelectedLabelIds(Array.from(values, String))
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{labels.map((label) => (
											<SelectItem key={label.id} id={label.id}>
												{label.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Button
									type="button"
									variant="ghost"
									className="h-auto min-h-8 flex-wrap justify-start gap-1 px-2"
									onPress={() => setEditingField("labels")}
								>
									{selectedLabels.length > 0 ? (
										selectedLabels.map((label) => (
											<Badge key={label.id} variant="secondary">
												{label.name}
											</Badge>
										))
									) : (
										<span className="text-muted-foreground">No labels</span>
									)}
								</Button>
							)}
						</DetailRow>

						<DetailRow label="Column">
							{editingField === "column" ? (
								<Select
									aria-label="Column"
									value={selectedListId}
									onChange={(value) => setSelectedListId(String(value))}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{lists.map((list) => (
											<SelectItem key={list.id} id={list.id}>
												{list.title}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Button
									type="button"
									variant="ghost"
									className="h-8 px-2"
									onPress={() => setEditingField("column")}
								>
									{selectedList?.title ?? "Choose a column"}
								</Button>
							)}
						</DetailRow>

						<DetailRow label="Due date">
							<PopoverTrigger>
								<Button
									type="button"
									variant="ghost"
									className="h-8 px-2 font-normal"
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
						</DetailRow>

						<DetailRow label="Complexity">
							{editingField === "complexity" ? (
								<Select
									aria-label="Complexity"
									value={selectedComplexityId}
									onChange={(value) => setSelectedComplexityId(String(value))}
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
							) : (
								<Button
									type="button"
									variant="ghost"
									className="h-8 px-2"
									onPress={() => setEditingField("complexity")}
								>
									<Badge
										variant="ghost"
										className={cn(
											"min-w-20",
											complexityStyles[selectedComplexity.key],
										)}
									>
										{selectedComplexity.label}
									</Badge>
								</Button>
							)}
						</DetailRow>

						<div className="pt-5">
							<Field>
								<FieldLabel htmlFor="task-details-description">
									Description
								</FieldLabel>
								{editingField === "description" ? (
									<Textarea
										id="task-details-description"
										aria-label="Task description"
										value={description}
										onChange={(event) => setDescription(event.target.value)}
										maxLength={10_000}
										className="min-h-36 bg-background"
										autoFocus
									/>
								) : (
									<Button
										type="button"
										variant="ghost"
										className="h-auto min-h-24 w-full justify-start whitespace-normal px-3 py-3 text-left font-normal"
										onPress={() => setEditingField("description")}
									>
										{description || (
											<span className="text-muted-foreground">
												Add a description…
											</span>
										)}
									</Button>
								)}
							</Field>
						</div>

						{state.status !== "idle" && (
							<p
								className={
									state.status === "error"
										? "text-sm text-destructive"
										: "text-sm text-emerald-600"
								}
								role="status"
							>
								{state.message}
							</p>
						)}
						{panelError && (
							<p className="text-sm text-destructive" role="alert">
								{panelError}
							</p>
						)}
					</div>

					<SheetFooter className="mt-auto flex-row justify-between border-t bg-background px-6 py-4">
						<Button type="button" variant="outline" onPress={handleCompletion}>
							<Check data-icon="inline-start" />
							{task.completedAt ? "Reopen task" : "Mark complete"}
						</Button>
						<TaskDetailsSubmit />
					</SheetFooter>
				</form>
			</div>
		</SheetContent>
	);
}
