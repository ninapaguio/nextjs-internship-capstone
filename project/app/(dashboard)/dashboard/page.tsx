import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { DashboardActiveProjects } from "@/components/dashboard/dashboard-active-projects";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardMyTasks } from "@/components/dashboard/dashboard-my-tasks";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardSummary } from "@/components/dashboard/dashboard-summary";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getDashboardDataForUser } from "@/lib/db/queries/dashboard";

export const metadata: Metadata = {
	title: "Dashboard",
	description:
		"View your active projects, assigned tasks, and recent activity.",
	openGraph: {
		title: "Dashboard | EverFlow",
		description:
			"View your active projects, assigned tasks, and recent activity.",
	},
};

export default async function DashboardPage() {
	const { userId } = await auth();
	if (!userId) {
		return null;
	}

	const [clerkUser, applicationUser] = await Promise.all([
		currentUser(),
		ensureApplicationUser(userId),
	]);

	if (!applicationUser) {
		return (
			<section className="flex flex-col gap-6" aria-label="Dashboard">
				<div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
					<h1 className="text-xl font-semibold text-foreground">
						Workspace loading…
					</h1>
					<p className="text-sm text-muted-foreground">
						Preparing your projects and tasks.
					</p>
				</div>
			</section>
		);
	}

	const userDisplayName = clerkUser?.firstName ?? null;
	const data = await getDashboardDataForUser(applicationUser.id);

	if (!data.hasAccessibleProjects) {
		return (
			<div className="space-y-4 sm:space-y-6">
				<DashboardHeader userDisplayName={userDisplayName} />
				<DashboardEmptyState />
			</div>
		);
	}

	return (
		<div className="space-y-4 sm:space-y-6">
			<DashboardHeader userDisplayName={userDisplayName} />

			<DashboardSummary summary={data.summary} />

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				<DashboardMyTasks tasks={data.myTasks} />
				<DashboardActiveProjects projects={data.activeProjects} />
			</div>

			<DashboardRecentActivity activities={data.recentActivity} />
		</div>
	);
}
