import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { TeamOverview } from "@/components/team/team-overview";
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
						Refresh the page to try again. If the problem continues, sign out
						and sign back in.
					</p>
				</div>
			</section>
		);
	}

	const teams = await getTeamListForUser(applicationUser.id);

	return <TeamOverview teams={teams} />;
}
