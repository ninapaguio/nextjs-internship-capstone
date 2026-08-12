import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getProjectList } from "@/lib/db/queries/projects";
import { getAvailableTeamsForUser } from "@/lib/db/queries/teams";
import { createProjectHref } from "@/lib/project-slug";
import { projectFilterSchema } from "@/lib/validations";

// Returns one authorized project page for React Query client-side refetching.
export async function GET(request: Request) {
	const { userId: clerkId } = await auth();

	if (!clerkId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const parsed = projectFilterSchema.safeParse({
		query: url.searchParams.get("search") ?? undefined,
		page: url.searchParams.get("page") ?? undefined,
		pageSize: url.searchParams.get("pageSize") ?? undefined,
	});

	if (!parsed.success) {
		return NextResponse.json(
			{ message: "Invalid project filters" },
			{ status: 400 },
		);
	}

	const applicationUser = await ensureApplicationUser(clerkId);

	if (!applicationUser) {
		return NextResponse.json(
			{ message: "Application user unavailable" },
			{ status: 503 },
		);
	}

	const accessibleTeams = await getAvailableTeamsForUser(applicationUser.id);
	const result = await getProjectList({
		applicationUserId: applicationUser.id,
		teamIds: accessibleTeams.map((team) => team.id),
		query: parsed.data.query ?? "",
		requestedPage: parsed.data.page,
		pageSize: parsed.data.pageSize,
	});
	const projectRows = result.projectRows.map((project) => ({
		...project,
		href: createProjectHref(project.id, project.name),
	}));

	return NextResponse.json(
		{ ...result, projectRows },
		{
			headers: { "Cache-Control": "private, no-store" },
		},
	);
}
