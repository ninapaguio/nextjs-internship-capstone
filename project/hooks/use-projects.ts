"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	ProjectCardData,
	ProjectListData,
	ProjectMutationResult,
	ProjectMutationVariables,
	ProjectOptimisticAction,
	UseProjectsOptions,
} from "@/types";

// Creates the stable cache key for one searched and paginated project result.
function projectQueryKey(
	applicationUserId: string,
	search: string,
	page: number,
	pageSize: number,
) {
	return ["projects", applicationUserId, { search, page, pageSize }] as const;
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
	applicationUserId,
	initialData,
	search,
	page,
	pageSize,
}: UseProjectsOptions) {
	const queryClient = useQueryClient();
	const queryKey = projectQueryKey(applicationUserId, search, page, pageSize);
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
