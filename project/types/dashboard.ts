import type { ProjectAccessRole } from "./teams";

export interface DashboardSummaryMetrics {
	activeProjects: number;
	myActiveTasks: number;
	myOverdueTasks: number;
	dueThisWeek: number;
}

export interface DashboardTaskItem {
	id: string;
	title: string;
	projectName: string;
	columnName: string;
	dueDate: string | null;
	priorityKey: "low" | "medium" | "high";
	priorityLabel: string;
	isOverdue: boolean;
	isDueToday: boolean;
	href: string;
}

export interface DashboardProjectItem {
	id: string;
	name: string;
	accessRole: ProjectAccessRole;
	totalTasks: number;
	completedTasks: number;
	overdueTasks: number;
	progressPercentage: number;
	href: string;
}

export interface DashboardActivityItem {
	id: string;
	actorName: string;
	actorAvatarUrl: string | null;
	description: string;
	taskTitle: string;
	projectName: string;
	relativeTime: string;
	href: string;
}

export interface DashboardData {
	hasAccessibleProjects: boolean;
	summary: DashboardSummaryMetrics;
	myTasks: DashboardTaskItem[];
	activeProjects: DashboardProjectItem[];
	recentActivity: DashboardActivityItem[];
}
