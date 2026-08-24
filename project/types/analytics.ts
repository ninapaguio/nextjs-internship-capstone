// Explicit types and view models for the EverFlow analytics dashboard.

export type AnalyticsDateRange = "today" | "7d" | "15d" | "30d";

export interface AnalyticsFilterState {
	project: "all" | string;
	range: AnalyticsDateRange;
}

export interface AccessibleProjectOption {
	id: string;
	name: string;
}

export interface AnalyticsSummaryMetrics {
	totalProjects: number;
	totalTasks: number;
	completedTasks: number;
	completionRate: number;
	overdueTasks: number;
	completedInRange: number;
}

export interface CompletionTrendPoint {
	dateKey: string;
	label: string;
	completedCount: number;
}

export interface ProjectProgressItem {
	projectId: string;
	projectName: string;
	href: string;
	completedTasks: number;
	totalTasks: number;
	progressPercentage: number;
	overdueTasks: number;
	incompleteTasks: number;
}

export interface WorkloadMemberItem {
	userId: string | null;
	name: string;
	activeTasks: number;
	overdueTasks: number;
}

export type AttentionInsightType =
	| "overdue"
	| "unassigned"
	| "stalled"
	| "high_backlog";

export interface AttentionNeededItem {
	id: string;
	type: AttentionInsightType;
	title: string;
	description: string;
	count: number;
	projectName?: string;
	severity: "high" | "medium" | "low";
}

export interface AnalyticsData {
	normalizedFilter: AnalyticsFilterState;
	accessibleProjects: AccessibleProjectOption[];
	summary: AnalyticsSummaryMetrics;
	completionTrend: CompletionTrendPoint[];
	projectProgress: ProjectProgressItem[];
	workload: WorkloadMemberItem[];
	attentionItems: AttentionNeededItem[];
	hasAccessibleProjects: boolean;
	hasActiveTasks: boolean;
}
