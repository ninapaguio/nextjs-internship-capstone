"use client";

import { type CalendarDate, parseDate } from "@internationalized/date";
import {
	ArrowRightLeft,
	CalendarClock,
	Check,
	CheckCircle2,
	FileText,
	Gauge,
	History,
	Hourglass,
	type LucideIcon,
	Pencil,
	Plus,
	RotateCcw,
	Search,
	Send,
	Sparkles,
	Tag,
	UserMinus,
	UserPlus,
} from "lucide-react";
import {
	type ReactNode,
	useActionState,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useFormStatus } from "react-dom";
import { updateBoardTask } from "@/actions/board";
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
	BoardActionState,
	BoardActivityItem,
	BoardActivityType,
	BoardComment,
	BoardComplexityOption,
	BoardLabelOption,
	BoardList,
	BoardMemberOption,
	BoardTask,
	EditableTaskField,
	TaskFeedEntry,
	TaskFeedTab,
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
	comments?: BoardComment[];
	activity?: BoardActivityItem[];
	currentUser?: BoardMemberOption | null;
	onAddComment?: (taskId: string, body: string) => Promise<void> | void;
	onCreateLabel?: (
		projectId: string,
		name: string,
	) => Promise<BoardLabelOption> | BoardLabelOption;
}

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

// Formats an ISO timestamp as a short relative label ("2h ago", "yesterday").
function formatRelativeTime(iso: string) {
	const date = new Date(iso);
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
	const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
		["year", 60 * 60 * 24 * 365],
		["month", 60 * 60 * 24 * 30],
		["week", 60 * 60 * 24 * 7],
		["day", 60 * 60 * 24],
		["hour", 60 * 60],
		["minute", 60],
	];
	for (const [unit, secondsInUnit] of divisions) {
		if (Math.abs(diffSeconds) >= secondsInUnit) {
			return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
		}
	}
	return rtf.format(diffSeconds, "second");
}

const activityIcons: Record<BoardActivityType, LucideIcon> = {
	created: Sparkles,
	column_changed: ArrowRightLeft,
	assignee_added: UserPlus,
	assignee_removed: UserMinus,
	label_added: Tag,
	label_removed: Tag,
	due_date_changed: CalendarClock,
	complexity_changed: Gauge,
	description_changed: FileText,
	completed: CheckCircle2,
	reopened: RotateCcw,
};

// Turns an activity entry into a short, human-readable sentence fragment.
function describeActivity(item: BoardActivityItem) {
	switch (item.type) {
		case "created":
			return "created this task";
		case "column_changed":
			return item.detail
				? `moved this task to ${item.detail}`
				: "moved this task";
		case "assignee_added":
			return item.detail ? `assigned ${item.detail}` : "assigned a member";
		case "assignee_removed":
			return item.detail ? `unassigned ${item.detail}` : "removed an assignee";
		case "label_added":
			return item.detail ? `added the ${item.detail} label` : "added a label";
		case "label_removed":
			return item.detail
				? `removed the ${item.detail} label`
				: "removed a label";
		case "due_date_changed":
			return item.detail
				? `set the due date to ${item.detail}`
				: "cleared the due date";
		case "complexity_changed":
			return item.detail
				? `set complexity to ${item.detail}`
				: "changed the complexity";
		case "description_changed":
			return "updated the description";
		case "completed":
			return "marked this task complete";
		case "reopened":
			return "reopened this task";
		default:
			return "updated this task";
	}
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

// Segmented "Comments / All activity" switch
function FeedTabs({
	active,
	onChange,
	commentCount,
}: {
	active: TaskFeedTab;
	onChange: (tab: TaskFeedTab) => void;
	commentCount: number;
}) {
	const tabs: { key: TaskFeedTab; label: string }[] = [
		{
			key: "comments",
			label: commentCount > 0 ? `Comments (${commentCount})` : "Comments",
		},
		{ key: "activity", label: "All activity" },
	];

	return (
		<div
			role="tablist"
			aria-label="Comments and activity"
			className="flex items-center gap-4 border-b px-6"
		>
			{tabs.map((tab) => (
				<button
					key={tab.key}
					type="button"
					role="tab"
					aria-selected={active === tab.key}
					onClick={() => onChange(tab.key)}
					className={cn(
						"relative -mb-px py-3 text-sm font-medium transition-colors",
						active === tab.key
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{tab.label}
					{active === tab.key && (
						<span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
					)}
				</button>
			))}
		</div>
	);
}

// A single comment bubble with author, relative timestamp, and body text.
function CommentRow({ comment }: { comment: BoardComment }) {
	return (
		<div className="flex gap-3">
			<Avatar className="mt-0.5 size-8 shrink-0">
				{comment.author.imageUrl && (
					<AvatarImage
						src={comment.author.imageUrl}
						alt={comment.author.name}
					/>
				)}
				<AvatarFallback>
					{getMemberInitials(comment.author.name)}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1 rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border/60">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-sm font-medium">{comment.author.name}</span>
					<span className="shrink-0 text-xs text-muted-foreground">
						{formatRelativeTime(comment.createdAt)}
					</span>
				</div>
				<p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm text-foreground/90">
					{comment.body}
				</p>
			</div>
		</div>
	);
}

// single system activity entry
function ActivityRow({ item }: { item: BoardActivityItem }) {
	const Icon = activityIcons[item.type] ?? History;
	return (
		<div className="flex gap-3">
			<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
				<Icon className="size-4" />
			</span>
			<div className="min-w-0 flex-1 py-1">
				<p className="text-sm">
					<span className="font-medium">{item.actor.name}</span>{" "}
					<span className="text-muted-foreground">
						{describeActivity(item)}
					</span>
				</p>
				<span className="text-xs text-muted-foreground">
					{formatRelativeTime(item.createdAt)}
				</span>
			</div>
		</div>
	);
}

// Sticky comment composer: current user's avatar, a textarea, and a send button.
function CommentComposer({
	currentUser,
	onSubmit,
}: {
	currentUser?: BoardMemberOption | null;
	onSubmit: (body: string) => Promise<void> | void;
}) {
	const [draft, setDraft] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit() {
		const body = draft.trim();
		if (!body || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onSubmit(body);
			setDraft("");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="flex gap-3 border-t bg-background px-6 py-4">
			<Avatar className="mt-0.5 size-8 shrink-0">
				{currentUser?.imageUrl && (
					<AvatarImage src={currentUser.imageUrl} alt={currentUser.name} />
				)}
				<AvatarFallback>
					{getMemberInitials(currentUser?.name ?? "You")}
				</AvatarFallback>
			</Avatar>
			<div className="min-w-0 flex-1 space-y-2">
				<Textarea
					aria-label="Add a comment"
					placeholder="Add a comment…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
							event.preventDefault();
							handleSubmit();
						}
					}}
					className="min-h-16 bg-muted/30"
				/>
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">
						⌘/Ctrl + Enter to send
					</span>
					<Button
						type="button"
						size="sm"
						isDisabled={!draft.trim() || isSubmitting}
						onPress={handleSubmit}
					>
						<Send data-icon="inline-start" />
						{isSubmitting ? "Posting…" : "Comment"}
					</Button>
				</div>
			</div>
		</div>
	);
}

// Comments/activity section
function TaskActivitySection({
	taskId,
	comments,
	activity,
	currentUser,
	onAddComment,
}: {
	taskId: string;
	comments: BoardComment[];
	activity: BoardActivityItem[];
	currentUser?: BoardMemberOption | null;
	onAddComment?: (taskId: string, body: string) => Promise<void> | void;
}) {
	const [tab, setTab] = useState<TaskFeedTab>("comments");
	const [localComments, setLocalComments] = useState(comments);

	useEffect(() => {
		setLocalComments(comments);
	}, [comments]);

	const sortedComments = useMemo(
		() =>
			[...localComments].sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			),
		[localComments],
	);

	const feed = useMemo<TaskFeedEntry[]>(() => {
		const commentEntries: TaskFeedEntry[] = localComments.map((comment) => ({
			kind: "comment",
			id: `comment-${comment.id}`,
			createdAt: comment.createdAt,
			comment,
		}));
		const activityEntries: TaskFeedEntry[] = activity.map((item) => ({
			kind: "activity",
			id: `activity-${item.id}`,
			createdAt: item.createdAt,
			activity: item,
		}));
		return [...commentEntries, ...activityEntries].sort(
			(a, b) =>
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		);
	}, [localComments, activity]);

	// Optimistically appends the comment, then defers to the caller for persistence.
	async function handleAddComment(body: string) {
		const optimisticComment: BoardComment = {
			id: `temp-${Date.now()}`,
			author: currentUser ?? { id: "me", name: "You", imageUrl: null },
			body,
			createdAt: new Date().toISOString(),
		};
		setLocalComments((current) => [...current, optimisticComment]);
		await onAddComment?.(taskId, body);
	}

	return (
		<div className="flex flex-col border-t bg-background">
			<FeedTabs active={tab} onChange={setTab} commentCount={comments.length} />

			<div className="space-y-4 px-6 py-5">
				{tab === "comments" ? (
					sortedComments.length > 0 ? (
						sortedComments.map((comment) => (
							<CommentRow key={comment.id} comment={comment} />
						))
					) : (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No comments yet. Start the conversation below.
						</p>
					)
				) : feed.length > 0 ? (
					feed.map((entry) =>
						entry.kind === "comment" ? (
							<CommentRow key={entry.id} comment={entry.comment} />
						) : (
							<ActivityRow key={entry.id} item={entry.activity} />
						),
					)
				) : (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No activity yet.
					</p>
				)}
			</div>

			{tab === "comments" && (
				<CommentComposer
					currentUser={currentUser}
					onSubmit={handleAddComment}
				/>
			)}
		</div>
	);
}

// Renders a side panel for editing a task, with a comments/activity feed
export function TaskDetailsPanel({
	projectId,
	task,
	lists,
	complexityOptions,
	members,
	labels,
	isOpen,
	onOpenChange,
	comments = [],
	activity = [],
	currentUser = null,
	onAddComment,
	onCreateLabel,
}: TaskDetailsPanelProps) {
	const updateTaskInStore = useBoardStore((state) => state.updateTask);
	const replaceLists = useBoardStore((state) => state.replaceLists);
	const markPersisted = useBoardStore((state) => state.markPersisted);
	const [editingField, setEditingField] = useState<EditableTaskField>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
	const [selectedListId, setSelectedListId] = useState("");
	const [selectedComplexityId, setSelectedComplexityId] = useState("");
	const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
	const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
	const [selectedDependencyIds, setSelectedDependencyIds] = useState<string[]>(
		[],
	);
	const [dependencyQuery, setDependencyQuery] = useState("");
	const [panelError, setPanelError] = useState<string | null>(null);
	const [localLabels, setLocalLabels] = useState<BoardLabelOption[]>(labels);
	const [newLabelName, setNewLabelName] = useState("");
	const [isCreatingLabel, setIsCreatingLabel] = useState(false);

	useEffect(() => {
		setLocalLabels(labels);
	}, [labels]);

	useEffect(() => {
		setEditingField(null);
		setTitle(task?.title ?? "");
		setDescription(task?.description ?? "");
		setDueDate(task?.dueDate ? parseDate(task.dueDate) : null);
		setSelectedListId(task?.listId ?? "");
		setSelectedComplexityId(task?.complexity.id ?? "");
		setSelectedAssigneeIds(task?.assignees.map((member) => member.id) ?? []);
		setSelectedLabelIds(task?.labels.map((label) => label.id) ?? []);
		setSelectedDependencyIds(task?.dependencyIds ?? []);
		setDependencyQuery("");
		setNewLabelName("");
		setPanelError(null);
	}, [task]);

	// Creates a label from the current draft name, selects it, and clears the
	// input. Falls back to a local, unsaved label if `onCreateLabel` is absent.
	async function handleCreateLabel() {
		const name = newLabelName.trim();
		if (!name || isCreatingLabel) return;
		setIsCreatingLabel(true);
		try {
			const created =
				(await onCreateLabel?.(projectId, name)) ??
				({ id: `temp-label-${Date.now()}`, name } as BoardLabelOption);
			setLocalLabels((current) => [...current, created]);
			setSelectedLabelIds((current) => [...current, created.id]);
			setNewLabelName("");
		} finally {
			setIsCreatingLabel(false);
		}
	}

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
			const selectedLabels = localLabels.filter((label) =>
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
				dependencyIds: selectedDependencyIds,
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
	const selectedLabels = localLabels.filter((label) =>
		selectedLabelIds.includes(label.id),
	);
	const dependencyCandidates = lists.flatMap((list) =>
		list.tasks
			.filter((candidate) => candidate.id !== task.id)
			.map((candidate) => ({ ...candidate, listTitle: list.title })),
	);
	const selectedDependencies = dependencyCandidates.filter((candidate) =>
		selectedDependencyIds.includes(candidate.id),
	);
	const normalizedDependencyQuery = dependencyQuery.trim().toLowerCase();
	const filteredDependencyCandidates = dependencyCandidates.filter(
		(candidate) =>
			!normalizedDependencyQuery ||
			`${candidate.title} ${candidate.listTitle}`
				.toLowerCase()
				.includes(normalizedDependencyQuery),
	);
	const incompleteDependencies = selectedDependencies.filter(
		(dependency) => !dependency.completedAt,
	);
	const isBlocked = incompleteDependencies.length > 0;
	const selectedList = lists.find((list) => list.id === selectedListId);
	const selectedComplexity =
		complexityOptions.find((option) => option.id === selectedComplexityId) ??
		task.complexity;

	// Toggles one prerequisite while allowing several tasks to block the current task.
	function toggleDependency(dependencyId: string) {
		setSelectedDependencyIds((current) =>
			current.includes(dependencyId)
				? current.filter((id) => id !== dependencyId)
				: [...current, dependencyId],
		);
	}

	// Toggles completion immediately and restores the task if persistence fails.
	async function handleCompletion() {
		if (!activeTask.completedAt && isBlocked) {
			setPanelError(
				"Complete every blocking task before completing this task.",
			);
			return;
		}
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
				<div className="flex min-w-0 items-start gap-3">
					<SheetTitle className="sr-only">Task details</SheetTitle>
					<div className="min-w-0 flex-1">
						{editingField === "title" ? (
							<Input
								aria-label="Task title"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								maxLength={200}
								autoFocus
								className="h-10 w-full text-lg font-semibold"
							/>
						) : (
							<TooltipTrigger delay={400}>
								<Button
									type="button"
									variant="ghost"
									className="h-auto w-full min-w-0 justify-start gap-2 px-0 py-1 text-left text-xl font-semibold hover:bg-transparent"
									onPress={() => setEditingField("title")}
								>
									<span className="min-w-0 truncate">{title}</span>
									<Pencil className="size-4 shrink-0" />
								</Button>
								<Tooltip placement="bottom start">Edit task title</Tooltip>
							</TooltipTrigger>
						)}
					</div>
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
						<input type="hidden" name="replaceDependencies" value="true" />
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
						{selectedDependencyIds.map((id) => (
							<input key={id} type="hidden" name="dependencyIds" value={id} />
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
								<div className="space-y-2">
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
											{localLabels.map((label) => (
												<SelectItem key={label.id} id={label.id}>
													{label.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<div className="flex items-center gap-2">
										<Input
											aria-label="New label name"
											placeholder="Create a label…"
											value={newLabelName}
											onChange={(event) => setNewLabelName(event.target.value)}
											maxLength={40}
											className="h-8 flex-1"
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													event.preventDefault();
													handleCreateLabel();
												}
											}}
										/>
										<Button
											type="button"
											size="sm"
											variant="outline"
											isDisabled={!newLabelName.trim() || isCreatingLabel}
											onPress={handleCreateLabel}
										>
											<Plus data-icon="inline-start" />
											{isCreatingLabel ? "Adding…" : "Add"}
										</Button>
									</div>
								</div>
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

						<DetailRow label="Dependencies">
							{editingField === "dependencies" ? (
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<Badge variant="secondary" className="h-9 shrink-0 px-3">
											<Hourglass className="size-3.5" />
											Blocked by
										</Badge>
										<PopoverTrigger>
											<Button
												type="button"
												variant="outline"
												className="min-w-0 flex-1 justify-start bg-background font-normal text-muted-foreground"
											>
												<Search data-icon="inline-start" />
												Find a task
											</Button>
											<Popover
												placement="bottom end"
												className="w-[min(32rem,calc(100vw-2rem))] gap-2 p-2"
											>
												<Input
													aria-label="Find a task dependency"
													placeholder="Find a task"
													value={dependencyQuery}
													onChange={(event) =>
														setDependencyQuery(event.target.value)
													}
													autoFocus
												/>
												<fieldset className="max-h-72 space-y-1 overflow-y-auto">
													<legend className="sr-only">
														Available task dependencies
													</legend>
													{filteredDependencyCandidates.length > 0 ? (
														filteredDependencyCandidates.map((candidate) => {
															const isSelected = selectedDependencyIds.includes(
																candidate.id,
															);
															return (
																<Button
																	key={candidate.id}
																	type="button"
																	aria-label={`${isSelected ? "Remove" : "Add"} ${candidate.title} ${isSelected ? "from" : "as"} a dependency`}
																	variant="ghost"
																	className="h-10 w-full justify-start gap-2 rounded-xl px-2 font-normal"
																	onPress={() => toggleDependency(candidate.id)}
																>
																	<CheckCircle2
																		className={cn(
																			"size-4 shrink-0",
																			candidate.completedAt
																				? "text-emerald-600"
																				: "text-muted-foreground",
																		)}
																	/>
																	<span className="min-w-0 flex-1 truncate text-left">
																		{candidate.title}
																	</span>
																	<span className="max-w-36 truncate text-xs text-muted-foreground">
																		{candidate.listTitle}
																	</span>
																	<Check
																		className={cn(
																			"size-4 shrink-0",
																			!isSelected && "invisible",
																		)}
																	/>
																</Button>
															);
														})
													) : (
														<p className="px-3 py-6 text-center text-sm text-muted-foreground">
															No matching tasks
														</p>
													)}
												</fieldset>
											</Popover>
										</PopoverTrigger>
									</div>
									{selectedDependencies.length > 0 ? (
										<div className="space-y-1.5">
											<div className="flex flex-wrap gap-1.5">
												{selectedDependencies.map((dependency) => (
													<Badge key={dependency.id} variant="outline">
														{dependency.title}
													</Badge>
												))}
											</div>
											<p
												className={cn(
													"text-xs",
													isBlocked
														? "text-amber-700 dark:text-amber-300"
														: "text-emerald-700 dark:text-emerald-300",
												)}
											>
												{isBlocked
													? `${incompleteDependencies.length} blocking task${incompleteDependencies.length === 1 ? "" : "s"} remaining`
													: "All dependencies completed"}
											</p>
										</div>
									) : null}
								</div>
							) : (
								<div className="space-y-1">
									<Button
										type="button"
										variant="ghost"
										className="h-auto min-h-8 flex-wrap justify-start gap-1.5 px-2"
										onPress={() => setEditingField("dependencies")}
									>
										{selectedDependencies.length > 0 ? (
											selectedDependencies.map((dependency) => (
												<Badge
													key={dependency.id}
													variant="secondary"
													className={cn(
														dependency.completedAt
															? "text-emerald-700 dark:text-emerald-300"
															: "text-amber-700 dark:text-amber-300",
													)}
												>
													{dependency.title}
												</Badge>
											))
										) : (
											<span className="text-muted-foreground">
												Add dependencies
											</span>
										)}
									</Button>
									{selectedDependencies.length > 0 ? (
										<p
											className={cn(
												"px-2 text-xs",
												isBlocked
													? "text-amber-700 dark:text-amber-300"
													: "text-emerald-700 dark:text-emerald-300",
											)}
										>
											{isBlocked
												? `${incompleteDependencies.length} blocking task${incompleteDependencies.length === 1 ? "" : "s"} remaining`
												: "All dependencies completed"}
										</p>
									) : null}
								</div>
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
						<Button
							type="button"
							variant="outline"
							isDisabled={!task.completedAt && isBlocked}
							onPress={handleCompletion}
						>
							<Check data-icon="inline-start" />
							{task.completedAt ? "Reopen task" : "Mark complete"}
						</Button>
						<TaskDetailsSubmit />
					</SheetFooter>
				</form>

				<TaskActivitySection
					taskId={task.id}
					comments={comments}
					activity={activity}
					currentUser={currentUser}
					onAddComment={onAddComment}
				/>
			</div>
		</SheetContent>
	);
}
