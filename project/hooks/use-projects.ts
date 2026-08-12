// TODO: Task 4.1 - Implement project CRUD operations
// TODO: Task 4.2 - Create project listing and dashboard interface

/*
TODO: Implementation Notes for Interns:

Custom hook for project data management:
- Fetch projects list
- Create new project
- Update project
- Delete project
- Search/filter projects
- Pagination

Features:
- React Query/SWR for caching
- Optimistic updates
- Error handling
- Loading states
- Infinite scrolling (optional)

Example structure:
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useProjects() {
  const queryClient = useQueryClient()
  
  const {
	data: projects,
	isLoading,
	error
  } = useQuery({
	queryKey: ['projects'],
	queryFn: () => queries.projects.getAll()
  })
  
  const createProject = useMutation({
	mutationFn: queries.projects.create,
	onSuccess: () => {
	  queryClient.invalidateQueries({ queryKey: ['projects'] })
	}
  })
  
  return {
	projects,
	isLoading,
	error,
	createProject: createProject.mutate,
	isCreating: createProject.isPending
  }
}

Dependencies to install:
- @tanstack/react-query (recommended)
- OR swr (alternative)
*/

// Placeholder to prevent import errors
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectCardData } from "@/components/project-card";

type ProjectOptimisticAction =
	| { type: "add"; project: ProjectCardData }
	| {
		type: "update";
		projectId: ProjectCardData["id"];
		changes: Partial<ProjectCardData>;
	}
	| { type: "remove"; projectId: ProjectCardData["id"] };

export interface ProjectMutationResult {
	status: "success" | "error";
	message: string;
}

export interface ProjectListData {
	currentPage: number;
	projectRows: ProjectCardData[];
	totalPages: number;
	totalProjects: number;
}

interface UseProjectsOptions {
	initialData: ProjectListData;
	search: string;
	page: number;
	pageSize: number;
}

interface ProjectMutationVariables {
	action: ProjectOptimisticAction;
	mutation: () => Promise<ProjectMutationResult>;
}

// Creates the stable cache key for one searched and paginated project result.
function projectQueryKey(search: string, page: number, pageSize: number) {
	return ["projects", { search, page, pageSize }] as const;
}

// Fetches one authorized project page from the application API.
async function fetchProjects(search: string, page: number, pageSize: number) {
	const params = new URLSearchParams({
		page: String(page),
		pageSize: String(pageSize),
	});

	if (search) params.set("search", search);

	const response = await fetch(`/api/projects?${params.toString()}`);

	if (!response.ok) {
		throw new Error("Projects could not be loaded.");
	}

	return (await response.json()) as ProjectListData;
}

// Applies temporary project-list changes while the authoritative server mutation runs.
function reduceProjects(
	projects: ProjectCardData[],
	action: ProjectOptimisticAction,
) {
	switch (action.type) {
		case "add":
			return [action.project, ...projects];
		case "update":
			return projects.map((project) =>
				project.id === action.projectId
					? { ...project, ...action.changes }
					: project,
			);
		case "remove":
			return projects.filter((project) => project.id !== action.projectId);
	}
}

// Manages cached project fetching and optimistic Server Action mutations.
export function useProjects({
	initialData,
	search,
	page,
	pageSize,
}: UseProjectsOptions) {
	const queryClient = useQueryClient();
	const queryKey = projectQueryKey(search, page, pageSize);
	const projectsQuery = useQuery({
		queryKey,
		queryFn: () => fetchProjects(search, page, pageSize),
		initialData,
	});
	const projectMutation = useMutation({
		mutationFn: async ({ mutation }: ProjectMutationVariables) => {
			const result = await mutation();

			if (result.status === "error") throw new Error(result.message);
			return result;
		},
		onMutate: async ({ action }) => {
			await queryClient.cancelQueries({ queryKey });
			const previousData = queryClient.getQueryData<ProjectListData>(queryKey);

			queryClient.setQueryData<ProjectListData>(queryKey, (currentData) =>
				currentData
					? {
						...currentData,
						projectRows: reduceProjects(currentData.projectRows, action),
					}
					: currentData,
			);

			return { previousData };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData);
			}
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	// Runs a Server Action with an immediate cache update and automatic rollback.
	function runMutation(variables: ProjectMutationVariables) {
		projectMutation.mutate(variables);
	}

	// project functions with optimistic updates and automatic cache invalidation until the server action completes
	function addProject(
		project: ProjectCardData,
		mutation: () => Promise<ProjectMutationResult>,
	) {
		runMutation({ action: { type: "add", project }, mutation });
	}

	// Applies temporary changes to one project until its Server Action finishes
	function updateProject(
		projectId: ProjectCardData["id"],
		changes: Partial<ProjectCardData>,
		mutation: () => Promise<ProjectMutationResult>,
	) {
		runMutation({
			action: { type: "update", projectId, changes },
			mutation,
		});
	}

	// Removes a project temporarily until its Server Action finishes
	function removeProject(
		projectId: ProjectCardData["id"],
		mutation: () => Promise<ProjectMutationResult>,
	) {
		runMutation({ action: { type: "remove", projectId }, mutation });
	}

	return {
		projects: projectsQuery.data.projectRows,
		currentPage: projectsQuery.data.currentPage,
		totalPages: projectsQuery.data.totalPages,
		totalProjects: projectsQuery.data.totalProjects,
		error:
			projectMutation.error?.message ?? projectsQuery.error?.message ?? null,
		isLoading: projectsQuery.isLoading,
		isFetching: projectsQuery.isFetching,
		isPending: projectMutation.isPending,
		refetch: projectsQuery.refetch,
		addProject,
		updateProject,
		removeProject,
	};
}
