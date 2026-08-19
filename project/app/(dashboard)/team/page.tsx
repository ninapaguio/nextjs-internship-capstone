import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TeamOverview } from "@/components/team-overview";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getTeamListForUser } from "@/lib/db/queries/teams";

export const metadata: Metadata = {
	title: "Teams",
	description: "Manage teams, members, and shared project workspaces.",
	openGraph: {
		title: "Teams | EverFlow",
		description: "Manage teams, members, and shared project workspaces.",
	},
};

// Loads the signed-in user's owned and shared team workspaces.
export default async function TeamPage() {
	const { userId: clerkId } = await auth();
	const applicationUser = clerkId ? await ensureApplicationUser(clerkId) : null;

	if (!applicationUser) {
		return (
			<section className="mx-auto max-w-7xl py-8">
				<div className="rounded-4xl border bg-card p-8 text-center">
					<h1 className="text-xl font-semibold">
						We couldn't load your workspace
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Refresh the page to try again. If the problem continues, sign out and
						sign back in.
					</p>
				</div>
			</section>
		);
	}

	const teams = await getTeamListForUser(applicationUser.id);

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col gap-6 py-4">
			<header className="border-b pb-3">
				<TooltipTrigger delay={400}>
					<Link
						href="/dashboard"
						aria-label="Back to dashboard"
						className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-muted-foreground"
					>
						<ArrowLeft className="size-3.5" aria-hidden="true" />
						<span>Team workspace</span>
					</Link>
					<Tooltip placement="bottom start">Back to dashboard</Tooltip>
				</TooltipTrigger>
			</header>
			<TeamOverview teams={teams} />
		</section>
	);
}
