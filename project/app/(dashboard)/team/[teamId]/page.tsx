import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteProjectMemberModal } from "@/components/modals/invite-project-member-modal";
import { ProjectInvitationsManager } from "@/components/project-invitations-manager";
import { TeamDetail } from "@/components/team-detail";
import { TeamRoleManager } from "@/components/team-role-manager";
import { LinkButton } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getTeamDetailForUser } from "@/lib/db/queries/teams";
import { uuidSchema } from "@/lib/validations";

interface TeamDetailPageProps {
	params: Promise<{ teamId: string }>;
}

export const metadata: Metadata = {
	title: "Team details",
	description: "Review team members and their assigned roles.",
	openGraph: {
		title: "Team details | EverFlow",
		description: "Review team members and their assigned roles.",
	},
};

// Loads one authorized team list and its project assignments.
export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
	const [{ userId: clerkId }, routeParams] = await Promise.all([
		auth(),
		params,
	]);
	const teamId = uuidSchema.safeParse(routeParams.teamId);
	if (!clerkId || !teamId.success) notFound();

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) notFound();

	const team = await getTeamDetailForUser(teamId.data, applicationUser.id);
	if (!team) notFound();

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col">
			<header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b py-3">
				<div className="flex min-w-0 items-center gap-3">
					<TooltipTrigger delay={400}>
						<Link
							href="/team"
							aria-label="Back to teams"
							className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground hover:text-brand_teal-600 dark:hover:text-brand_mint-400 transition-colors"
						>
							<ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
							<h1 className="truncate text-sm font-semibold">{team.name}</h1>
						</Link>
						<Tooltip placement="bottom start">Back to teams</Tooltip>
					</TooltipTrigger>
				</div>
				<div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto sm:ml-0">
					<LinkButton
						href="/projects"
						size="sm"
						aria-label="Projects"
						className="px-2.5 sm:px-3"
					>
						<FolderKanban data-icon="inline-start" />
						<span className="hidden sm:inline">Projects</span>
					</LinkButton>
					{team.canManage ? (
						<>
							<TeamRoleManager
								teamId={team.id}
								projectId={team.projectId}
								members={team.members}
								roles={team.roles}
								canAssignManager={team.isOwner}
							/>
							<ProjectInvitationsManager invitations={team.invitations} />
							<InviteProjectMemberModal
								projectId={team.projectId}
								projectName={team.name}
							/>
						</>
					) : null}
				</div>
			</header>
			<div className="flex-1 py-5">
				<TeamDetail team={team} />
			</div>
		</section>
	);
}
