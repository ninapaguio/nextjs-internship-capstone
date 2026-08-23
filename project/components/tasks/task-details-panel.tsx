"use client";

import { type CalendarDate, parseDate } from "@internationalized/date";
import {
	Archive,
	ArrowRightLeft,
	CalendarClock,
	Check,
	CheckCircle2,
	CircleMinus,
	Ellipsis,
	FileText,
	Gauge,
	History,
	Hourglass,
	type LucideIcon,
	Pencil,
	RotateCcw,
	Sparkles,
	Tag,
	Trash2,
	UserMinus,
	UserPlus,
	X,
} from "lucide-react";
import {
	type ReactNode,
	useActionState,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useFormStatus } from "react-dom";
import {
	changeBoardTaskLifecycle,
	createBoardComment,
	updateBoardTask,
} from "@/actions/board";
import { ConfirmLifecycleDialog } from "@/components/modals/confirm-lifecycle-dialog";
import { TaskLabelSelect } from "@/components/tasks/task-label-select";
import {
	Avatar,
	AvatarFallback,
	AvatarGroup,
	AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useTaskActivity } from "@/hooks/use-task-activity";
import { cn } from "@/lib/utils";
import { useBoardStore } from "@/stores/board-store";
import type {
	BoardActionState,
	BoardActivityItem,
	BoardActivityType,
	BoardComment,
	BoardLabelOption,
	BoardList,
	BoardMemberOption,
	BoardPriorityOption,
	BoardTask,
	CreateBoardCommentActionState,
	EditableTaskField,
	TaskFeedTab,
} from "@/types";

interface TaskDetailsPanelProps {
	projectId: string;
	task: BoardTask | null;
	lists: BoardList[];
	priorityOptions: BoardPriorityOption[];
	members: BoardMemberOption[];
	labels: BoardLabelOption[];
	isOpen: boolean;
	canEdit: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectTask: (taskId: string) => void;
	comments: BoardComment[];
	commentsError: string | null;
	isCommentsLoading: boolean;
	currentUser: BoardMemberOption | null;
	onCommentCreated: (taskId: string, comment: BoardComment) => void;
	onRetryComments: () => void;
	onCreateLabel: (
		projectId: string,
		name: string,
		color: string,
	) => Promise<BoardLabelOption> | BoardLabelOption;
}

const initialState: BoardActionState = { status: "idle", message: "" };
const initialCommentState: CreateBoardCommentActionState = {
	status: "idle",
	message: "",
};

const priorityStyles: Record<BoardPriorityOption["key"], string> = {
	low: "priority-badge-low",
	medium: "priority-badge-medium",
	high: "priority-badge-high",
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

// Formats a stored task due date for the compact dependency list.
function formatDependencyDueDate(dueDate: string | null) {
	if (!dueDate) return "No due date";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
	}).format(parseDate(dueDate).toDate("UTC"));
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
	title_changed: Pencil,
	column_changed: ArrowRightLeft,
	assignee_added: UserPlus,
	assignee_removed: UserMinus,
	label_added: Tag,
	label_removed: Tag,
	dependency_added: Hourglass,
	dependency_removed: Trash2,
	due_date_changed: CalendarClock,
	priority_changed: Gauge,
	description_changed: FileText,
	completed: CheckCircle2,
	reopened: RotateCcw,
};

// Turns an activity entry into a short, human-readable sentence fragment.
function describeActivity(item: BoardActivityItem) {
	switch (item.type) {
		case "created":
			return "created this task";
		case "title_changed":
			return item.previousDetail && item.detail
				? `changed the title from “${item.previousDetail}” to “${item.detail}”`
				: "changed the title";
		case "column_changed":
			return item.previousDetail && item.detail
				? `moved this task from ${item.previousDetail} to ${item.detail}`
				: item.detail
					? `moved this task to ${item.detail}`
					: "moved this task";
		case "assignee_added":
			return item.detail ? `assigned ${item.detail}` : "assigned a member";
		case "assignee_removed":
			return item.previousDetail
				? `unassigned ${item.previousDetail}`
				: "removed an assignee";
		case "label_added":
			return item.detail ? `added the ${item.detail} label` : "added a label";
		case "label_removed":
			return item.detail
				? `removed the ${item.detail} label`
				: item.previousDetail
					? `removed the ${item.previousDetail} label`
					: "removed a label";
		case "dependency_added":
			return item.detail
				? `added ${item.detail} as a dependency`
				: "added a dependency";
		case "dependency_removed":
			return item.previousDetail
				? `removed ${item.previousDetail} as a dependency`
				: "removed a dependency";
		case "due_date_changed":
			return item.previousDetail && item.detail
				? `changed the due date from ${formatDependencyDueDate(item.previousDetail)} to ${formatDependencyDueDate(item.detail)}`
				: item.detail
					? `set the due date to ${formatDependencyDueDate(item.detail)}`
					: "cleared the due date";
		case "priority_changed":
			return item.previousDetail && item.detail
				? `changed priority from ${item.previousDetail} to ${item.detail}`
				: item.detail
					? `set priority to ${item.detail}`
					: "changed the priority";
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
	align = "center",
}: {
	label: string;
	children: ReactNode;
	align?: "center" | "start";
}) {
	return (
		<div
			className={cn(
				"grid min-h-9 grid-cols-1 gap-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3",
				align === "start" ? "items-start" : "items-center",
			)}
		>
			<span className="text-sm font-medium text-muted-foreground">{label}</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

// Displays one finish-to-start relationship in the task dependency summary.
function DependencyDisplayRow({
	task,
	relationship,
	onSelectTask,
	onRemove,
}: {
	task: BoardTask;
	relationship: "blocked-by" | "blocking";
	onSelectTask: (taskId: string) => void;
	onRemove?: () => void;
}) {
	const isBlockedBy = relationship === "blocked-by";
	const RelationshipIcon = isBlockedBy ? Hourglass : CircleMinus;
	return (
		<div className="flex min-w-0 items-center gap-1">
			<TooltipTrigger delay={300}>
				<Button
					type="button"
					variant="ghost"
					className="grid h-auto min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 overflow-hidden rounded-md px-1 py-1 text-xs sm:grid-cols-[6.25rem_minmax(0,1fr)_auto]"
					aria-label={`Open task ${task.title}`}
					onPress={() => onSelectTask(task.id)}
				>
					<span
						className={cn(
							"col-span-2 flex items-center gap-1.5 whitespace-nowrap font-medium sm:col-span-1",
							isBlockedBy
								? "text-amber-700 dark:text-amber-300"
								: "text-rose-700 dark:text-rose-300",
						)}
					>
						<RelationshipIcon
							className="size-3.5 shrink-0"
							aria-hidden="true"
						/>
						{isBlockedBy ? "Blocked by" : "Blocking"}
					</span>
					<span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
						<CheckCircle2
							className={cn(
								"size-4 shrink-0",
								task.completedAt ? "text-emerald-600" : "text-muted-foreground",
							)}
							aria-hidden="true"
						/>
						<span className="block min-w-0 truncate font-medium text-foreground">
							{task.title}
						</span>
					</span>
					<span className="whitespace-nowrap text-muted-foreground">
						· {formatDependencyDueDate(task.dueDate)}
					</span>
				</Button>
				<Tooltip placement="top">{task.title}</Tooltip>
			</TooltipTrigger>
			{onRemove ? (
				<TooltipTrigger delay={300}>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="shrink-0"
						aria-label={`Remove dependency ${task.title}`}
						onPress={onRemove}
					>
						<X />
					</Button>
					<Tooltip placement="top">Remove dependency</Tooltip>
				</TooltipTrigger>
			) : null}
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
		{ key: "activity", label: "Activity" },
	];

	return (
		<div
			role="tablist"
			aria-label="Comments and task activity"
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
				<p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90 wrap-anywhere">
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

// Displays pending state from the nearest comment form action.
function CommentSubmitButton({ isEmpty }: { isEmpty: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="sm" isDisabled={isEmpty || pending}>
			{pending ? "Posting…" : "Comment"}
		</Button>
	);
}

// Submits a task comment through React action state with optimistic callbacks.
function CommentComposer({
	projectId,
	taskId,
	currentUser,
	onOptimisticComment,
	onCommentSettled,
}: {
	projectId: string;
	taskId: string;
	currentUser: BoardMemberOption | null;
	onOptimisticComment: (body: string) => string;
	onCommentSettled: (
		optimisticId: string | null,
		comment: BoardComment | null,
	) => void;
}) {
	const formRef = useRef<HTMLFormElement>(null);
	const [draft, setDraft] = useState("");

	// Shows the comment immediately, then keeps it if saving succeeds or removes it if saving fails.
	async function submitComment(
		previousState: CreateBoardCommentActionState,
		formData: FormData,
	): Promise<CreateBoardCommentActionState> {
		const body = String(formData.get("content") ?? "").trim();
		const optimisticId = body ? onOptimisticComment(body) : null;
		try {
			const result = await createBoardComment(previousState, formData);
			onCommentSettled(optimisticId, result.data ?? null);
			return result;
		} catch {
			onCommentSettled(optimisticId, null);
			return { status: "error", message: "We could not post the comment." };
		}
	}

	const [state, formAction, isPending] = useActionState(
		submitComment,
		initialCommentState,
	);

	useEffect(() => {
		if (state.status === "success") setDraft("");
	}, [state.status]);

	return (
		<form
			ref={formRef}
			action={formAction}
			className="flex gap-3 border-t bg-background px-6 py-4"
		>
			<input type="hidden" name="projectId" value={projectId} />
			<input type="hidden" name="taskId" value={taskId} />
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
					name="content"
					aria-label="Add a comment"
					aria-invalid={state.status === "error"}
					placeholder="Add a comment…"
					value={draft}
					maxLength={5_000}
					disabled={isPending}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (
							!isPending &&
							event.key === "Enter" &&
							(event.metaKey || event.ctrlKey)
						) {
							event.preventDefault();
							formRef.current?.requestSubmit();
						}
					}}
					className="min-h-16 bg-muted/30"
				/>
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs text-muted-foreground">
						⌘/Ctrl + Enter to send
					</span>
					<CommentSubmitButton isEmpty={!draft.trim()} />
				</div>
				{state.status === "error" ? (
					<p className="text-xs text-destructive" role="alert">
						{state.message}
					</p>
				) : null}
			</div>
		</form>
	);
}

// Renders separate comment and system-activity tabs without merging their records.
function TaskActivitySection({
	projectId,
	taskId,
	tab,
	onTabChange,
	comments,
	commentsError,
	isCommentsLoading,
	activity,
	activityError,
	isActivityLoading,
	currentUser,
	onCommentCreated,
	onRetryComments,
	onRetryActivity,
	canComment,
}: {
	projectId: string;
	taskId: string;
	tab: TaskFeedTab;
	onTabChange: (tab: TaskFeedTab) => void;
	comments: BoardComment[];
	commentsError: string | null;
	isCommentsLoading: boolean;
	activity: BoardActivityItem[];
	activityError: string | null;
	isActivityLoading: boolean;
	currentUser: BoardMemberOption | null;
	onCommentCreated: (taskId: string, comment: BoardComment) => void;
	onRetryComments: () => void;
	onRetryActivity: () => void;
	canComment: boolean;
}) {
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

	// Adds a temporary comment to the active task feed.
	function addOptimisticComment(body: string) {
		const optimisticId = `temp-${Date.now()}`;
		const optimisticComment: BoardComment = {
			id: optimisticId,
			author: currentUser ?? { id: "me", name: "You", imageUrl: null },
			body,
			createdAt: new Date().toISOString(),
		};
		setLocalComments((current) => [...current, optimisticComment]);
		return optimisticId;
	}

	// Replaces a temporary comment after success or removes it after failure.
	function settleOptimisticComment(
		optimisticId: string | null,
		persistedComment: BoardComment | null,
	) {
		setLocalComments((current) => {
			const withoutOptimistic = optimisticId
				? current.filter((comment) => comment.id !== optimisticId)
				: current;
			if (!persistedComment) return withoutOptimistic;
			if (
				withoutOptimistic.some((comment) => comment.id === persistedComment.id)
			) {
				return withoutOptimistic;
			}
			return [...withoutOptimistic, persistedComment];
		});
		if (persistedComment) onCommentCreated(taskId, persistedComment);
	}

	return (
		<div className="flex flex-col border-t bg-background">
			<FeedTabs
				active={tab}
				onChange={onTabChange}
				commentCount={localComments.length}
			/>

			<section
				aria-label={tab === "comments" ? "Task comments" : "Task activity"}
				aria-busy={
					(tab === "comments" && isCommentsLoading) ||
					(tab === "activity" && isActivityLoading)
				}
				className={cn(
					"space-y-4 px-6 py-5",
					tab === "comments" &&
						localComments.length > 3 &&
						"max-h-72 overflow-y-auto overscroll-contain",
				)}
			>
				{tab === "comments" && isCommentsLoading ? (
					<div
						className="space-y-4 py-1"
						role="status"
						aria-label="Loading comments"
					>
						{["first", "second", "third"].map((row) => (
							<div key={row} className="flex items-start gap-3">
								<Skeleton className="size-8 shrink-0 rounded-full" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-3 w-28 rounded-md" />
									<Skeleton className="h-4 w-full rounded-md" />
								</div>
							</div>
						))}
					</div>
				) : tab === "comments" && commentsError ? (
					<div className="py-6 text-center">
						<p className="text-sm text-destructive">{commentsError}</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-3"
							onPress={onRetryComments}
						>
							Try again
						</Button>
					</div>
				) : tab === "comments" ? (
					sortedComments.length > 0 ? (
						sortedComments.map((comment) => (
							<CommentRow key={comment.id} comment={comment} />
						))
					) : (
						<p className="py-6 text-center text-sm text-muted-foreground">
							No comments yet. Start the conversation below.
						</p>
					)
				) : isActivityLoading ? (
					<p className="py-6 text-center text-sm text-muted-foreground">
						Loading task activity…
					</p>
				) : activityError ? (
					<div className="py-6 text-center">
						<p className="text-sm text-destructive">{activityError}</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-3"
							onPress={onRetryActivity}
						>
							Try again
						</Button>
					</div>
				) : activity.length > 0 ? (
					activity.map((item) => <ActivityRow key={item.id} item={item} />)
				) : (
					<p className="py-6 text-center text-sm text-muted-foreground">
						No activity yet.
					</p>
				)}
			</section>

			{tab === "comments" && canComment ? (
				<CommentComposer
					key={taskId}
					projectId={projectId}
					taskId={taskId}
					currentUser={currentUser}
					onOptimisticComment={addOptimisticComment}
					onCommentSettled={settleOptimisticComment}
				/>
			) : null}
		</div>
	);
}

// Renders a side panel for editing a task, with a comments/activity feed
export function TaskDetailsPanel({
	projectId,
	task,
	lists,
	priorityOptions,
	members,
	labels,
	isOpen,
	canEdit,
	onOpenChange,
	onSelectTask,
	comments,
	commentsError,
	currentUser,
	isCommentsLoading,
	onCommentCreated,
	onRetryComments,
	onCreateLabel,
}: TaskDetailsPanelProps) {
	const updateTaskInStore = useBoardStore((state) => state.updateTask);
	const removeTaskFromStore = useBoardStore((state) => state.deleteTask);
	const replaceLists = useBoardStore((state) => state.replaceLists);
	const markPersisted = useBoardStore((state) => state.markPersisted);
	const [editingField, setEditingField] = useState<EditableTaskField>(null);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState<CalendarDate | null>(null);
	const [selectedListId, setSelectedListId] = useState("");
	const [selectedPriorityId, setSelectedPriorityId] = useState("");
	const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
	const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
	const [selectedDependencyIds, setSelectedDependencyIds] = useState<string[]>(
		[],
	);
	const [selectedBlockingTaskIds, setSelectedBlockingTaskIds] = useState<
		string[]
	>([]);
	const [dependencyRelationship, setDependencyRelationship] = useState<
		"blocked-by" | "blocking"
	>("blocked-by");
	const [dependencyQuery, setDependencyQuery] = useState("");
	const [feedTab, setFeedTab] = useState<TaskFeedTab>("comments");
	const [panelError, setPanelError] = useState<string | null>(null);
	const [isLifecyclePending, setIsLifecyclePending] = useState(false);
	const [lifecycleAction, setLifecycleAction] = useState<
		"archive" | "delete" | null
	>(null);
	const [localLabels, setLocalLabels] = useState<BoardLabelOption[]>(labels);
	const taskActivity = useTaskActivity(
		projectId,
		task?.id ?? null,
		isOpen && feedTab === "activity",
	);

	useEffect(() => {
		setLocalLabels(labels);
	}, [labels]);

	useEffect(() => {
		setEditingField(null);
		setTitle(task?.title ?? "");
		setDescription(task?.description ?? "");
		setDueDate(task?.dueDate ? parseDate(task.dueDate) : null);
		setSelectedListId(task?.listId ?? "");
		setSelectedPriorityId(task?.priority.id ?? "");
		setSelectedAssigneeIds(task?.assignees.map((member) => member.id) ?? []);
		setSelectedLabelIds(
			task?.labels.slice(0, 3).map((label) => label.id) ?? [],
		);
		setSelectedDependencyIds(task?.dependencyIds ?? []);
		setSelectedBlockingTaskIds(
			task
				? lists
						.flatMap((list) => list.tasks)
						.filter((candidate) => candidate.dependencyIds.includes(task.id))
						.map((candidate) => candidate.id)
				: [],
		);
		setDependencyRelationship("blocked-by");
		setDependencyQuery("");
		setFeedTab("comments");
		setPanelError(null);
	}, [lists, task]);

	// Adds a persisted label to the panel's available project labels.
	async function createPanelLabel(name: string, color: string) {
		const created = await onCreateLabel(projectId, name, color);
		setLocalLabels((current) =>
			current.some((label) => label.id === created.id)
				? current
				: [...current, created],
		);
		return created;
	}

	// Optimistically updates the task and restores the board if persistence fails.
	const [state, formAction] = useActionState(
		async (
			_previousState: BoardActionState,
			formData: FormData,
		): Promise<BoardActionState> => {
			if (!task) return { status: "error", message: "No task is selected." };
			const snapshot = useBoardStore.getState().lists;
			const priority = priorityOptions.find(
				(option) => option.id === selectedPriorityId,
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
				priority: priority ?? task.priority,
				dueDate: dueDate?.toString() ?? null,
				completedAt: task.completedAt,
				assignees,
				labels: selectedLabels,
				dependencyIds: selectedDependencyIds,
			};

			updateTaskInStore(task.id, changes);
			for (const candidate of lists.flatMap((list) => list.tasks)) {
				if (candidate.id === task.id) continue;
				const currentlyBlockedByTask = candidate.dependencyIds.includes(
					task.id,
				);
				const shouldBeBlockedByTask = selectedBlockingTaskIds.includes(
					candidate.id,
				);
				if (currentlyBlockedByTask === shouldBeBlockedByTask) continue;
				updateTaskInStore(candidate.id, {
					dependencyIds: shouldBeBlockedByTask
						? [...candidate.dependencyIds, task.id]
						: candidate.dependencyIds.filter((id) => id !== task.id),
				});
			}
			const result = await updateBoardTask(formData);
			if (result.status === "error") replaceLists(snapshot);
			else {
				markPersisted();
				setEditingField(null);
				void taskActivity.invalidate();
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
	const blockingTasks = dependencyCandidates.filter((candidate) =>
		selectedBlockingTaskIds.includes(candidate.id),
	);
	const activeDependencyIds =
		dependencyRelationship === "blocked-by"
			? selectedDependencyIds
			: selectedBlockingTaskIds;
	const activeDependencyTasks =
		dependencyRelationship === "blocked-by"
			? selectedDependencies
			: blockingTasks;
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
	const selectedPriority =
		priorityOptions.find((option) => option.id === selectedPriorityId) ??
		task.priority;

	// Toggles a dependency in the direction selected by the user.
	function toggleDependency(dependencyId: string) {
		const isSelected = activeDependencyIds.includes(dependencyId);
		const update = (current: string[]) =>
			current.includes(dependencyId)
				? current.filter((id) => id !== dependencyId)
				: [...current, dependencyId];
		if (dependencyRelationship === "blocked-by") {
			setSelectedDependencyIds(update);
			if (!isSelected) {
				setSelectedBlockingTaskIds((current) =>
					current.filter((id) => id !== dependencyId),
				);
			}
		} else {
			setSelectedBlockingTaskIds(update);
			if (!isSelected) {
				setSelectedDependencyIds((current) =>
					current.filter((id) => id !== dependencyId),
				);
			}
		}
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
		} else {
			markPersisted();
			void taskActivity.invalidate();
		}
	}

	// Archives, restores, or deletes the selected task after confirmation and persistence.
	async function handleTaskLifecycle(action: "archive" | "restore" | "delete") {
		setIsLifecyclePending(true);
		setPanelError(null);
		const formData = new FormData();
		formData.set("projectId", projectId);
		formData.set("taskId", activeTask.id);
		formData.set("action", action);
		const result = await changeBoardTaskLifecycle(formData);
		setIsLifecyclePending(false);
		if (result.status === "error") {
			setPanelError(result.message);
			return;
		}
		setLifecycleAction(null);
		if (action === "delete") removeTaskFromStore(activeTask.id);
		else {
			updateTaskInStore(activeTask.id, {
				archivedAt: action === "archive" ? new Date().toISOString() : null,
			});
		}
		markPersisted();
		onOpenChange(false);
	}

	return (
		<SheetContent
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			side="right"
			showCloseButton={false}
			className="data-[side=right]:w-full! sm:data-[side=right]:w-[65vw]! sm:max-w-2xl! lg:max-w-3xl! xl:max-w-4xl!"
		>
			<SheetHeader>
				<div className="flex items-center justify-between gap-3">
					{canEdit ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							isDisabled={
								Boolean(task.archivedAt) || (!task.completedAt && isBlocked)
							}
							onPress={handleCompletion}
						>
							<Check data-icon="inline-start" />
							{task.completedAt ? "Reopen task" : "Mark complete"}
						</Button>
					) : null}
					<div className="flex items-center gap-1">
						{canEdit ? (
							<DropdownMenuTrigger>
								<TooltipTrigger delay={400}>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Task options"
										isDisabled={isLifecyclePending}
									>
										<Ellipsis />
									</Button>
									<Tooltip placement="bottom">Task options</Tooltip>
								</TooltipTrigger>
								<DropdownMenu placement="bottom end">
									{task.archivedAt ? (
										<DropdownMenuItem
											onAction={() => void handleTaskLifecycle("restore")}
										>
											<Archive /> Restore task
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											onAction={() => setLifecycleAction("archive")}
										>
											<Archive /> Archive task
										</DropdownMenuItem>
									)}
									<DropdownMenuItem
										className="text-destructive"
										onAction={() => setLifecycleAction("delete")}
									>
										<Trash2 /> Delete task
									</DropdownMenuItem>
								</DropdownMenu>
							</DropdownMenuTrigger>
						) : null}
						<TooltipTrigger delay={400}>
							<SheetClose
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Close panel"
							>
								<X />
							</SheetClose>
							<Tooltip placement="bottom end">Close panel</Tooltip>
						</TooltipTrigger>
					</div>
				</div>
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
							<div className="max-w-full whitespace-normal py-1 text-left text-xl font-semibold wrap-anywhere">
								<span>{title}</span>{" "}
								{canEdit ? (
									<TooltipTrigger delay={400}>
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											className="inline-flex align-text-bottom"
											aria-label="Edit task title"
											onPress={() => canEdit && setEditingField("title")}
										>
											<Pencil />
										</Button>
										<Tooltip placement="bottom start">Edit task title</Tooltip>
									</TooltipTrigger>
								) : null}
							</div>
						)}
					</div>
				</div>
				<SheetDescription>
					Select a displayed value to edit it, then save your changes.
				</SheetDescription>
			</SheetHeader>

			<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-muted/20">
				<form action={formAction} className="flex min-h-full min-w-0 flex-col">
					<div className="min-w-0 space-y-2 px-6 py-6">
						<input type="hidden" name="projectId" value={projectId} />
						<input type="hidden" name="taskId" value={task.id} />
						<input type="hidden" name="title" value={title} />
						<input type="hidden" name="description" value={description} />
						<input type="hidden" name="listId" value={selectedListId} />
						<input type="hidden" name="replaceAssignees" value="true" />
						<input type="hidden" name="replaceLabels" value="true" />
						<input type="hidden" name="replaceDependencies" value="true" />
						<input type="hidden" name="replaceBlockingTasks" value="true" />
						<input type="hidden" name="priorityId" value={selectedPriorityId} />
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
						{selectedBlockingTaskIds.map((id) => (
							<input key={id} type="hidden" name="blockingTaskIds" value={id} />
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
									onEdit={() => canEdit && setEditingField("assignees")}
								/>
							)}
						</DetailRow>

						<DetailRow label="Label">
							{editingField === "labels" ? (
								<TaskLabelSelect
									labels={localLabels}
									value={selectedLabelIds}
									onChange={setSelectedLabelIds}
									onCreateLabel={createPanelLabel}
								/>
							) : (
								<Button
									type="button"
									variant="ghost"
									className="h-auto min-h-8 flex-wrap justify-start gap-1 px-2"
									onPress={() => canEdit && setEditingField("labels")}
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

						<DetailRow label="Dependencies" align="start">
							{editingField === "dependencies" ? (
								<div className="space-y-2">
									<div className="grid min-w-0 grid-cols-[9rem_minmax(0,1fr)] items-center gap-2">
										<Select
											aria-label="Dependency relationship"
											value={dependencyRelationship}
											onChange={(value) =>
												setDependencyRelationship(
													String(value) as "blocked-by" | "blocking",
												)
											}
										>
											<SelectTrigger className="w-full min-w-0">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem id="blocked-by">Blocked by</SelectItem>
												<SelectItem id="blocking">Blocking</SelectItem>
											</SelectContent>
										</Select>
										<PopoverTrigger>
											<Button
												type="button"
												variant="outline"
												className="w-full min-w-0 justify-start overflow-hidden bg-background font-normal text-muted-foreground"
											>
												<span className="truncate">Find a task</span>
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
															const isSelected = activeDependencyIds.includes(
																candidate.id,
															);
															return (
																<Button
																	key={candidate.id}
																	type="button"
																	aria-label={`${isSelected ? "Remove" : "Add"} ${candidate.title} ${isSelected ? "from" : "as"} a dependency`}
																	variant="ghost"
																	className="grid h-10 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(0,7rem)_auto] gap-2 overflow-hidden rounded-xl px-2 font-normal"
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
									{activeDependencyTasks.length > 0 ? (
										<div className="space-y-1.5">
											<div className="divide-y rounded-lg border bg-background px-2">
												{activeDependencyTasks.map((dependency) => (
													<DependencyDisplayRow
														key={dependency.id}
														task={dependency}
														relationship={dependencyRelationship}
														onSelectTask={onSelectTask}
														onRemove={() => toggleDependency(dependency.id)}
													/>
												))}
											</div>
											{dependencyRelationship === "blocked-by" ? (
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
											) : null}
										</div>
									) : null}
								</div>
							) : (
								<div className="space-y-1">
									{selectedDependencies.map((dependency) => (
										<DependencyDisplayRow
											key={`blocked-by-${dependency.id}`}
											task={dependency}
											relationship="blocked-by"
											onSelectTask={onSelectTask}
										/>
									))}
									{blockingTasks.map((dependency) => (
										<DependencyDisplayRow
											key={`blocking-${dependency.id}`}
											task={dependency}
											relationship="blocking"
											onSelectTask={onSelectTask}
										/>
									))}
									<Button
										type="button"
										variant="ghost"
										className="h-8 justify-start px-0 text-xs text-muted-foreground"
										onPress={() => canEdit && setEditingField("dependencies")}
									>
										Add dependencies
									</Button>
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
									onPress={() => canEdit && setEditingField("column")}
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
									isDisabled={!canEdit}
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

						<DetailRow label="Priority">
							{editingField === "priority" ? (
								<Select
									aria-label="Priority"
									value={selectedPriorityId}
									onChange={(value) => setSelectedPriorityId(String(value))}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{priorityOptions.map((option) => (
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
									onPress={() => canEdit && setEditingField("priority")}
								>
									<Badge
										variant="ghost"
										className={cn(
											"min-w-20",
											priorityStyles[selectedPriority.key],
										)}
									>
										{selectedPriority.label}
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
										className="min-h-36 max-w-full bg-background wrap-anywhere"
										autoFocus
									/>
								) : (
									<Button
										type="button"
										variant="ghost"
										className="h-auto min-h-24 w-full min-w-0 max-w-full justify-start overflow-hidden whitespace-normal px-3 py-3 text-left font-normal"
										onPress={() => canEdit && setEditingField("description")}
									>
										{description ? (
											<span className="min-w-0 max-w-full whitespace-pre-wrap wrap-anywhere">
												{description}
											</span>
										) : (
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

					{canEdit ? (
						<SheetFooter className="mt-auto flex-row justify-end px-6 py-4">
							<TaskDetailsSubmit />
						</SheetFooter>
					) : null}
				</form>

				<TaskActivitySection
					projectId={projectId}
					taskId={task.id}
					tab={feedTab}
					onTabChange={setFeedTab}
					comments={comments}
					commentsError={commentsError}
					isCommentsLoading={isCommentsLoading}
					activity={taskActivity.activity}
					activityError={taskActivity.error}
					isActivityLoading={taskActivity.isLoading}
					currentUser={currentUser}
					onCommentCreated={onCommentCreated}
					onRetryComments={onRetryComments}
					onRetryActivity={() => void taskActivity.refetch()}
					canComment={canEdit}
				/>
			</div>
			{lifecycleAction && (
				<ConfirmLifecycleDialog
					action={lifecycleAction}
					itemName={activeTask.title}
					itemType="task"
					isOpen
					isPending={isLifecyclePending}
					onOpenChange={(open) => {
						if (!open) setLifecycleAction(null);
					}}
					onConfirm={() => void handleTaskLifecycle(lifecycleAction)}
				/>
			)}
		</SheetContent>
	);
}
