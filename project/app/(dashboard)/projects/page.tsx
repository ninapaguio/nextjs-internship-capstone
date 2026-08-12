import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { ProjectGrid } from "@/components/project-grid";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getProjectList } from "@/lib/db/queries/projects";
import {
	getAvailableTeamsForUser,
	getOwnedTeamsForUser,
} from "@/lib/db/queries/teams";
import { createProjectHref } from "@/lib/project-slug";

export const metadata: Metadata = {
	title: "Projects",
	description: "A project list page and adding a new project.",
	openGraph: {
		title: "Projects | EverFlow",
		description: "A project list page and adding a new project.",
	},
};

interface ProjectsPageProps {
	searchParams: Promise<{ search?: string; page?: string }>;
}

const PAGE_SIZE = 6;

// Builds a project-list URL while retaining the active search query.
function projectPageHref(search: string, page: number) {
	const params = new URLSearchParams();

	if (search) params.set("search", search);
	if (page > 1) params.set("page", String(page));
	const suffix = params.toString();
	return suffix ? `/projects?${suffix}` : "/projects";
}

// Loads projects and team options available to the signed-in user.
export default async function ProjectsPage({
	searchParams,
}: ProjectsPageProps) {
	const [{ userId: clerkId }, rawSearchParams] = await Promise.all([
		auth(),
		searchParams,
	]);
	const search = rawSearchParams.search?.trim().slice(0, 100) ?? "";
	const requestedPage = Number.parseInt(rawSearchParams.page ?? "1", 10);
	const page =
		Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const applicationUser = clerkId ? await ensureApplicationUser(clerkId) : null;

	if (!applicationUser) {
		return (
			<section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="rounded-4xl border bg-card p-8 text-center">
					<h1 className="text-xl font-semibold">
						We couldn't load your workspace
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Refresh the page to try again. <br />
						If the problem continues, sign out and sign back in.
					</p>
				</div>
			</section>
		);
	}

	const [ownedTeams, accessibleTeams] = await Promise.all([
		getOwnedTeamsForUser(applicationUser.id),
		getAvailableTeamsForUser(applicationUser.id),
	]);
	const teamIds = accessibleTeams.map((team) => team.id);
	const { currentPage, projectRows, totalPages, totalProjects } =
		await getProjectList({
			applicationUserId: applicationUser.id,
			teamIds,
			query: search,
			requestedPage: page,
			pageSize: PAGE_SIZE,
		});
	const projectCards = projectRows.map((project) => ({
		...project,
		href: createProjectHref(project.id, project.name),
	}));

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col px-4 pb-4 sm:px-8 lg:px-10">
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<TooltipTrigger delay={400}>
					<Link
						href="/dashboard"
						aria-label="Back to dashboard"
						className="inline-flex items-center gap-1.5 text-sm font-semibold hover:text-muted-foreground"
					>
						<ArrowLeft className="size-3.5" aria-hidden="true" />
						<span>Projects</span>
					</Link>
					<Tooltip placement="bottom start">Back to dashboard</Tooltip>
				</TooltipTrigger>

				<div className="flex items-center gap-2.5">
					<form action="/projects">
						<InputGroup className="h-8 w-48 bg-muted/70 sm:w-56">
							<InputGroupAddon>
								<Search aria-hidden="true" />
							</InputGroupAddon>
							<InputGroupInput
								name="search"
								defaultValue={search}
								placeholder="Search projects"
								aria-label="Search projects"
							/>
						</InputGroup>
					</form>
					<CreateProjectModal teams={ownedTeams} />
				</div>
			</header>

			<div className="flex-1 py-5">
				<ProjectGrid
					initialData={{
						currentPage,
						projectRows: projectCards,
						totalPages,
						totalProjects,
					}}
					hasSearchQuery={Boolean(search)}
					search={search}
					page={currentPage}
					pageSize={PAGE_SIZE}
					teams={ownedTeams}
				/>
			</div>

			<footer className="flex items-center justify-between gap-4 border-t pt-3">
				<p className="text-xs text-muted-foreground">
					{totalProjects} {totalProjects === 1 ? "Project" : "Projects"}
				</p>
				<Pagination aria-label="Projects pagination" className="mx-0 w-auto">
					<PaginationContent className="gap-0 overflow-hidden rounded-lg border bg-background shadow-xs">
						<PaginationItem>
							<PaginationPrevious
								href={projectPageHref(search, Math.max(1, currentPage - 1))}
								isDisabled={currentPage === 1}
								className="h-7 rounded-none px-3! text-xs opacity-100 disabled:opacity-50 [&_span]:block [&_svg]:hidden"
							/>
						</PaginationItem>
						{totalPages > 1 && (
							<PaginationItem>
								<span className="px-3 text-sm text-muted-foreground">
									Page {currentPage} of {totalPages}
								</span>
							</PaginationItem>
						)}
						<PaginationItem>
							<PaginationNext
								href={projectPageHref(
									search,
									Math.min(totalPages, currentPage + 1),
								)}
								isDisabled={currentPage === totalPages}
								className="h-7 rounded-none border-l px-3! text-xs opacity-100 disabled:opacity-50 [&_span]:block [&_svg]:hidden"
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			</footer>
		</section>
	);
}
