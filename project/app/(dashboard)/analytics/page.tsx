import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { AnalyticsEmptyState } from "@/components/analytics/analytics-empty-state";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { AnalyticsSummary } from "@/components/analytics/analytics-summary";
import { AttentionNeeded } from "@/components/analytics/attention-needed";
import { CompletionTrendChart } from "@/components/analytics/completion-trend-chart";
import { ProjectProgressChart } from "@/components/analytics/project-progress-chart";
import { WorkloadChart } from "@/components/analytics/workload-chart";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getAnalyticsDataForUser } from "@/lib/db/queries/analytics";
import { analyticsFilterSchema } from "@/lib/validations";

export const metadata: Metadata = {
	title: "Analytics",
	description:
		"Track project performance, completion trends, and team workload.",
	openGraph: {
		title: "Analytics | EverFlow",
		description:
			"Track project performance, completion trends, and team workload.",
	},
};

interface AnalyticsPageProps {
	searchParams: Promise<{
		project?: string;
		range?: string;
	}>;
}

// Loads analytics data for the current user
export default async function AnalyticsPage({
	searchParams,
}: AnalyticsPageProps) {
	const { userId: clerkId } = await auth();
	const applicationUser = clerkId ? await ensureApplicationUser(clerkId) : null;

	if (!applicationUser) {
		return (
			<section className="mx-auto max-w-7xl py-8">
				<div className="rounded-3xl border border-border bg-card p-8 text-center">
					<h1 className="text-xl font-semibold text-foreground">
						We couldn't load your workspace
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Refresh the page to try again. If the problem continues, sign out
						and sign back in.
					</p>
				</div>
			</section>
		);
	}

	const rawParams = await searchParams;
	const filter = analyticsFilterSchema.parse(rawParams);

	const analytics = await getAnalyticsDataForUser(applicationUser.id, {
		project: filter.project,
		range: filter.range,
	});

	if (!analytics.hasAccessibleProjects) {
		return (
			<div className="space-y-4 sm:space-y-6">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Analytics
					</h1>
				</div>
				<AnalyticsEmptyState />
			</div>
		);
	}

	// Render the analytics page
	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-border pb-3 sm:pb-4">
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Analytics
					</h1>
				</div>

				<AnalyticsFilters
					accessibleProjects={analytics.accessibleProjects}
					currentFilter={analytics.normalizedFilter}
				/>
			</div>

			{/* Summary Metric Cards */}
			<AnalyticsSummary
				summary={analytics.summary}
				range={analytics.normalizedFilter.range}
			/>

			{/* Actionable Attention Items */}
			<AttentionNeeded items={analytics.attentionItems} />

			{/* Primary Visualizations */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				<CompletionTrendChart
					data={analytics.completionTrend}
					range={analytics.normalizedFilter.range}
				/>
				<WorkloadChart
					data={analytics.workload}
					totalIncompleteTasks={Math.max(
						0,
						analytics.summary.totalTasks - analytics.summary.completedTasks,
					)}
				/>
			</div>

			{/* Project Progress Priority List */}
			<ProjectProgressChart projects={analytics.projectProgress} />
		</div>
	);
}
