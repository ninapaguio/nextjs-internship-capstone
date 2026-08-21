import type {
	Comment,
	Label,
	PriorityOption,
	Task,
	TaskActivity,
	User,
} from "./database";

export interface CommentWithAuthor extends Comment {
	author: User;
}

export interface TaskActivityWithActor extends TaskActivity {
	actor: User;
}

// the task-details modal uses this only after its server query loads all displayed relations, base Task type intentionally has none of these.
export interface TaskDetails extends Task {
	assignees: User[];
	labels: Label[];
	priority: PriorityOption;
	comments: CommentWithAuthor[];
	activities: TaskActivityWithActor[];
}
