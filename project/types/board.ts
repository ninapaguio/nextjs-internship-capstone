export interface BoardMemberOption {
	id: string;
	name: string;
	imageUrl: string | null;
}

export interface BoardComplexityOption {
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
	complexity: BoardComplexityOption;
	dueDate: string | null;
	position: number;
	completedAt: string | null;
	assignees: BoardMemberOption[];
	labels: BoardLabelOption[];
	dependencyIds: string[];
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
	complexityOptions: BoardComplexityOption[];
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
	| "column_changed"
	| "assignee_added"
	| "assignee_removed"
	| "label_added"
	| "label_removed"
	| "due_date_changed"
	| "complexity_changed"
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
}

export interface BoardState {
	projectId: string | null;
	lists: BoardList[];
	draggedTaskId: string | null;
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
	beginTaskDrag: (taskId: string) => void;
	moveTaskOptimistically: (taskId: string, targetId: string) => void;
	finishTaskDrag: (canceled: boolean) => void;
}

export type ComplexityFilter = BoardTask["complexity"]["key"] | "all";

export type EditableTaskField =
	| "title"
	| "assignees"
	| "labels"
	| "dependencies"
	| "column"
	| "complexity"
	| "description"
	| null;

export type TaskFeedTab = "comments" | "activity";

export type TaskFeedEntry =
	| { kind: "comment"; id: string; createdAt: string; comment: BoardComment }
	| {
			kind: "activity";
			id: string;
			createdAt: string;
			activity: BoardActivityItem;
	  };
