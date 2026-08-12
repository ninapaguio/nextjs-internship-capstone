"use client";

import { FolderKanban } from "lucide-react";
import { useState } from "react";
import type { ProjectCardData } from "@/components/project-card";
import { ProjectCard } from "@/components/project-card";
import { ProjectDetailsPanel } from "@/components/projects/project-details-panel";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import type { ProjectListData } from "@/hooks/use-projects";
import { useProjects } from "@/hooks/use-projects";

interface ProjectGridProps {
	initialData: ProjectListData;
	hasSearchQuery: boolean;
	search: string;
	page: number;
	pageSize: number;
	teams: Array<{ id: string; name: string }>;
}

// Renders the optimistic project collection received from the server page.
export function ProjectGrid({
	initialData,
	hasSearchQuery,
	search,
	page,
	pageSize,
	teams,
}: ProjectGridProps) {
	const [selectedProject, setSelectedProject] =
		useState<ProjectCardData | null>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const {
		projects,
		error,
		isFetching,
		isPending,
		updateProject,
		removeProject,
	} = useProjects({
		initialData,
		search,
		page,
		pageSize,
	});
	const isUpdating = isFetching || isPending;

	// Opens the shared project details panel for the selected card.
	function openProjectPanel(project: ProjectCardData) {
		setSelectedProject(project);
		setIsPanelOpen(true);
	}

	if (projects.length === 0) {
		return (
			<>
				{error && (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				)}
				<Empty className="h-full min-h-80 border-0" aria-busy={isUpdating}>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<FolderKanban />
						</EmptyMedia>
						<EmptyTitle>
							{hasSearchQuery ? "No matching projects" : "No projects yet"}
						</EmptyTitle>
						<EmptyDescription>
							{hasSearchQuery
								? "Try a different search term or clear the search."
								: "Create your first project to have Kanban boards."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</>
		);
	}

	return (
		<>
			<div aria-live="polite" className="sr-only">
				{isUpdating ? "Updating projects" : "Projects are up to date"}
			</div>
			{error && (
				<p className="mb-4 text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
			<div
				className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
				aria-busy={isUpdating}
			>
				{projects.map((project) => (
					<ProjectCard
						key={project.id}
						project={project}
						onEdit={openProjectPanel}
					/>
				))}
			</div>
			<ProjectDetailsPanel
				project={selectedProject}
				teams={teams}
				isOpen={isPanelOpen}
				onOpenChange={setIsPanelOpen}
				onUpdate={updateProject}
				onRemove={removeProject}
			/>
		</>
	);
}
