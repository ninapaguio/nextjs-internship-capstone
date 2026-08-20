import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	getTaskActivities,
	isActiveTaskInProject,
} from "@/lib/db/queries/board";
import { getAccessibleProjectById } from "@/lib/db/queries/projects";
import { uuidSchema } from "@/lib/validations";

interface TaskActivityRouteContext {
	params: Promise<{ projectId: string; taskId: string }>;
}

// Returns task activity only after verifying access to the project and task.
export async function GET(
	_request: Request,
	{ params }: TaskActivityRouteContext,
) {
	const { userId: clerkId } = await auth();
	if (!clerkId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const routeParams = await params;
	const projectId = uuidSchema.safeParse(routeParams.projectId);
	const taskId = uuidSchema.safeParse(routeParams.taskId);
	if (!projectId.success || !taskId.success) {
		return NextResponse.json(
			{ message: "Invalid project or task" },
			{ status: 400 },
		);
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);
		if (!applicationUser) {
			return NextResponse.json(
				{ message: "Application user unavailable" },
				{ status: 503 },
			);
		}

		const project = await getAccessibleProjectById(
			projectId.data,
			applicationUser.id,
		);
		if (!project) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}
		if (!(await isActiveTaskInProject(projectId.data, taskId.data))) {
			return NextResponse.json({ message: "Task not found" }, { status: 404 });
		}

		const activity = await getTaskActivities(projectId.data, taskId.data);
		return NextResponse.json(
			{ activity },
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch {
		return NextResponse.json(
			{ message: "Task activity could not be loaded" },
			{ status: 500 },
		);
	}
}
