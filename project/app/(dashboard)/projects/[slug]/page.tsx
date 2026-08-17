import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KanbanBoard } from "@/components/kanban-board";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getProjectBoardData } from "@/lib/db/queries/board";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import {
	createProjectCompositeSlug,
	extractProjectIdFromSlug,
} from "@/lib/project-slug";
import { uuidSchema } from "@/lib/validations";

interface ProjectPageProps {
	params: Promise<{ slug: string }>;
}

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
export default async function ProjectPage({ params }: ProjectPageProps) {
	const { slug } = await params;
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
	const boardData = await getProjectBoardData(
		project.id,
		project.teamId,
		project.createdById,
	);

	const canonicalSlug = createProjectCompositeSlug(project.id, project.name);
	if (slug !== canonicalSlug) redirect(`/projects/${canonicalSlug}`);

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col">
			{/* Project Header */}
			<header className="flex min-h-14 items-center justify-between gap-4 border-b py-3">
				<div className="flex min-w-0 items-center gap-3">
					<TooltipTrigger delay={400}>
						<Link
							href="/projects"
							className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold hover:text-muted-foreground"
							aria-label="Back to projects"
						>
							<ArrowLeft className="size-3.5 shrink-0" aria-hidden="true" />
							<h1 className="truncate text-sm font-semibold">{project.name}</h1>
						</Link>
						<Tooltip placement="bottom start">Back to projects</Tooltip>
					</TooltipTrigger>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						className="flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-xs font-medium shadow-xs transition hover:bg-muted"
					>
						<Users className="size-3.5" /> Members
					</button>
				</div>
			</header>

			{/* Interactive Kanban board */}
			<div className="flex-1 py-5">
				<KanbanBoard projectId={project.id} initialData={boardData} />
			</div>
		</section>
	);
}
