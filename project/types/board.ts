export interface BoardMemberOption {
	id: string;
	name: string;
	imageUrl: string | null;
}

export interface BoardPriorityOption {
	id: string;
	key: "low" | "medium" | "high";
	label: string;
}

export interface BoardLabelOption {
	id: string;
	name: string;
	color: string;
}

export interface BoardTask {
	id: string;
	listId: string;
	title: string;
	description: string | null;
	priority: BoardPriorityOption;
	dueDate: string | null;
	position: number;
	completedAt: string | null;
	archivedAt: string | null;
	assignees: BoardMemberOption[];
	labels: BoardLabelOption[];
	dependencyIds: string[];
	commentsCount: number;
}

export interface BoardList {
	id: string;
	title: string;
	description: string | null;
	position: number;
	tasks: BoardTask[];
	archived?: boolean;
}

export interface ProjectBoardData {
	lists: BoardList[];
	priorityOptions: BoardPriorityOption[];
	members: BoardMemberOption[];
	labels: BoardLabelOption[];
}
export interface BoardComment {
	id: string;
	author: BoardMemberOption;
	body: string;
	createdAt: string;
}

export type BoardActivityType =
	| "created"
	| "title_changed"
	| "column_changed"
	| "assignee_added"
	| "assignee_removed"
	| "label_added"
	| "label_removed"
	| "dependency_added"
	| "dependency_removed"
	| "due_date_changed"
	| "priority_changed"
	| "description_changed"
	| "completed"
	| "reopened";

// A system-generated change displayed in the task activity timeline.
export interface BoardActivityItem {
	id: string;
	type: BoardActivityType;
	actor: BoardMemberOption;
	createdAt: string;
	detail?: string;
	previousDetail?: string;
}

export interface BoardState {
	projectId: string | null;
	lists: BoardList[];
	draggedTaskId: string | null;
	draggedTaskIds: string[];
	dragTargetId: string | null;
	dragSnapshot: BoardList[] | null;
	dragSnapshotHadPendingChanges: boolean;
	hasPendingChanges: boolean;
	hydrate: (projectId: string, lists: BoardList[]) => void;
	addList: (list: BoardList) => void;
	updateList: (
		listId: string,
		changes: Pick<BoardList, "title" | "description">,
	) => void;
	archiveList: (listId: string) => void;
	deleteList: (listId: string) => void;
	addTask: (listId: string, task: BoardTask) => void;
	updateTask: (taskId: string, changes: Partial<BoardTask>) => void;
	deleteTask: (taskId: string) => void;
	replaceLists: (lists: BoardList[]) => void;
	markPersisted: () => void;
	beginTaskDrag: (taskId: string, taskIds: string[]) => void;
	moveTasksOptimistically: (taskIds: string[], targetId: string) => void;
	finishTaskDrag: (canceled: boolean) => void;
}

export type PriorityFilter = BoardTask["priority"]["key"] | "all";

export type TaskStatusFilter =
	| "all"
	| "open"
	| "completed"
	| "overdue"
	| "archived";

export type EditableTaskField =
	| "title"
	| "assignees"
	| "labels"
	| "dependencies"
	| "column"
	| "priority"
	| "description"
	| null;

export type TaskFeedTab = "comments" | "activity";
