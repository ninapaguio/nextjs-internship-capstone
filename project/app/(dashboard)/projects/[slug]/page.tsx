import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { InviteProjectMemberModal } from "@/components/modals/invite-project-member-modal";
import { LinkButton } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getProjectBoardData } from "@/lib/db/queries/board";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import {
	createProjectCompositeSlug,
	extractProjectIdFromSlug,
} from "@/lib/project-slug";
import { uuidSchema } from "@/lib/validations";
import type { ProjectPageProps } from "@/types";

export const metadata: Metadata = {
	title: "Project workspace | EverFlow",
	description:
		"Plan, prioritize, and move project work forward on a responsive Kanban board.",
	openGraph: {
		title: "Project workspace | EverFlow",
		description:
			"Plan, prioritize, and move project work forward on a responsive Kanban board.",
	},
};

// Loads an authorized project and renders its interactive Kanban workspace.
export default async function ProjectPage({
	params,
	searchParams,
}: ProjectPageProps) {
	const { slug } = await params;
	const resolvedSearchParams = searchParams ? await searchParams : undefined;
	const initialTaskId = resolvedSearchParams?.task;
	const parsedProjectId = uuidSchema.safeParse(extractProjectIdFromSlug(slug));

	if (!parsedProjectId.success) notFound();

	const { userId: clerkId } = await auth();
	if (!clerkId) notFound();

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) notFound();

	const project = await getAccessibleProjectById(
		parsedProjectId.data,
		applicationUser.id,
	);
	if (!project) notFound();
	const boardData = await getProjectBoardData(project.id);
	const canManageBoard =
		project.accessRole === "owner" || project.accessRole === "manager";
	const canEditTasks =
		project.status !== "completed" &&
		(canManageBoard || project.status === "active");
	const readOnlyMessage =
		project.status === "completed"
			? "This project is completed. Reopen it from the Projects page to continue editing."
			: !canManageBoard && project.status === "inactive"
				? "This project is planned. Members can work with tasks after an owner or manager starts the project."
				: !canManageBoard
					? "You can work with tasks. Only the project owner and managers can change columns or project settings."
					: null;

	const canonicalSlug = createProjectCompositeSlug(project.id, project.name);
	if (slug !== canonicalSlug) {
		const redirectQuery = initialTaskId ? `?task=${initialTaskId}` : "";
		redirect(`/projects/${canonicalSlug}${redirectQuery}`);
	}

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col">
			{/* Project Header */}
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<TooltipTrigger delay={400}>
						<Link
							href="/projects"
							className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground hover:text-brand_teal-600 dark:hover:text-brand_mint-400 transition-colors"
							aria-label="Back to projects"
						>
							<ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
							<h1 className="truncate text-sm font-semibold">{project.name}</h1>
						</Link>
						<Tooltip placement="bottom start">Back to projects</Tooltip>
					</TooltipTrigger>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{project.accessRole !== "member" ? (
						<InviteProjectMemberModal
							projectId={project.id}
							projectName={project.name}
						/>
					) : null}
					{project.teamId ? (
						<LinkButton href={`/team/${project.teamId}`} size="sm">
							<Users data-icon="inline-start" />
							Members
						</LinkButton>
					) : null}
				</div>
			</header>

			{/* Interactive Kanban board */}
			<div className="flex-1 py-5">
				{readOnlyMessage ? (
					<p className="mb-4 rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
						{readOnlyMessage}
					</p>
				) : null}
				<KanbanBoard
					projectId={project.id}
					currentUserId={applicationUser.id}
					initialData={boardData}
					canEditTasks={canEditTasks}
					canManageColumns={canManageBoard && canEditTasks}
					initialSelectedTaskId={initialTaskId}
				/>
			</div>
		</section>
	);
}
