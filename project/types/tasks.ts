import type {
	Comment,
	ComplexityOption,
	Label,
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

// Scenario: the task-details modal uses this only after its server query loads
// all displayed relations. The base Task type intentionally has none of these.
export interface TaskDetails extends Task {
	assignees: User[];
	labels: Label[];
	complexity: ComplexityOption;
	comments: CommentWithAuthor[];
	activities: TaskActivityWithActor[];
}
