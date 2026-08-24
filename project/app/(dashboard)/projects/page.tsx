import { auth } from "@clerk/nextjs/server";
import { Search } from "lucide-react";
import type { Metadata } from "next";
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
import { createProjectHref } from "@/lib/project-slug";
import type { ProjectsPageProps } from "@/types";

export const metadata: Metadata = {
	title: "Projects",
	description: "A project list page and adding a new project.",
	openGraph: {
		title: "Projects | EverFlow",
		description: "A project list page and adding a new project.",
	},
};

const PAGE_SIZE = 6;

// Builds a project-list url while retaining the active search query.
function projectPageHref(search: string, page: number) {
	const params = new URLSearchParams();

	if (search) params.set("search", search);
	if (page > 1) params.set("page", String(page));
	const suffix = params.toString();
	return suffix ? `/projects?${suffix}` : "/projects";
}

// Loads solo and team projects available through project membership.
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
			<section className="mx-auto max-w-7xl py-8">
				<div className="rounded-2xl sm:rounded-4xl border bg-card p-6 sm:p-8 text-center">
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

	const { currentPage, projectRows, totalPages, totalProjects } =
		await getProjectList({
			applicationUserId: applicationUser.id,
			query: search,
			requestedPage: page,
			pageSize: PAGE_SIZE,
		});
	const projectCards = projectRows.map((project) => ({
		...project,
		href: createProjectHref(project.id, project.name),
	}));

	return (
		<section className="flex min-h-[calc(100dvh-5rem)] flex-col px-1 sm:px-0">
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<TooltipTrigger delay={400}>
					<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
						Projects
					</h1>
					<Tooltip placement="bottom start">Back to dashboard</Tooltip>
				</TooltipTrigger>

				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
					<form action="/projects" className="w-full sm:w-auto">
						<InputGroup className="h-9 w-full sm:w-56 bg-card border-border shadow-2xs">
							<InputGroupAddon>
								<Search
									aria-hidden="true"
									className="text-muted-foreground size-4"
								/>
							</InputGroupAddon>
							<InputGroupInput
								name="search"
								defaultValue={search}
								placeholder="Search projects…"
								aria-label="Search projects"
							/>
						</InputGroup>
					</form>
					<div className="w-full sm:w-auto">
						<CreateProjectModal />
					</div>
				</div>
			</header>

			<div className="flex-1 py-4 sm:py-5">
				<ProjectGrid
					applicationUserId={applicationUser.id}
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
				/>
			</div>

			<footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-3 pb-2">
				<p className="text-xs text-muted-foreground order-2 sm:order-1">
					{totalProjects} {totalProjects === 1 ? "Project" : "Projects"}
				</p>
				<Pagination
					aria-label="Projects pagination"
					className="mx-0 w-full sm:w-auto flex justify-center order-1 sm:order-2"
				>
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
