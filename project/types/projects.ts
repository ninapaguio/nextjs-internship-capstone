import type { List, Project, Task } from "./database";

// Use this only for a query that actually loads each list and its tasks.
export interface ListWithTasks extends List {
	tasks: Task[];
}

// Scenario: the project board Server Component receives a project together
// with the Kanban columns and tasks requested by its relational query.
export interface ProjectBoard extends Project {
	lists: ListWithTasks[];
}

// Scenario: dashboard totals and progress are calculated query results, not
// stored project columns, so the project-card UI gets a dedicated view type.
export interface ProjectCardView {
	id: Project["id"];
	name: Project["name"];
	description: Project["description"];
	startDate: Project["startDate"];
	endDate: Project["endDate"];
	totalTasks: number;
	totalMembers: number;
	progressPercentage: number;
}
