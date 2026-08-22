import type { Project } from "./database";

// dashboard totals and progress are calculated query results, not stored project columns, so the project-card UI gets a dedicated view type.
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

// Complete view model rendered by a project card and its details panel.
export interface ProjectCardData extends ProjectCardView {
	href: string;
	teamId: string | null;
	accessRole: "owner" | "manager" | "member";
	teamName: string;
	status: Project["status"];
}

export interface ProjectMutationResult {
	status: "success" | "error";
	message: string;
}

export interface ProjectListData {
	currentPage: number;
	projectRows: ProjectCardData[];
	totalPages: number;
	totalProjects: number;
}

export type ProjectOptimisticAction =
	| { type: "add"; project: ProjectCardData }
	| {
			type: "update";
			projectId: ProjectCardData["id"];
			changes: Partial<ProjectCardData>;
	  }
	| { type: "remove"; projectId: ProjectCardData["id"] };

export interface UseProjectsOptions {
	applicationUserId: string;
	initialData: ProjectListData;
	search: string;
	page: number;
	pageSize: number;
}

export interface ProjectMutationVariables {
	action: ProjectOptimisticAction;
	mutation: () => Promise<ProjectMutationResult>;
}

export interface ProjectsPageProps {
	searchParams: Promise<{ search?: string; page?: string }>;
}

export interface ProjectPageProps {
	params: Promise<{ slug: string }>;
}
