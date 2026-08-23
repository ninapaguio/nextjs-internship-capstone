import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getAccessibleProjectBoardVersion } from "@/lib/db/queries/projects";
import { uuidSchema } from "@/lib/validations";

interface BoardVersionRouteContext {
	params: Promise<{ projectId: string }>;
}

// Returns one small board revision only to a current Project member.
export async function GET(
	_request: Request,
	{ params }: BoardVersionRouteContext,
) {
	const { userId: clerkId } = await auth();
	if (!clerkId) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const routeParams = await params;
	const projectId = uuidSchema.safeParse(routeParams.projectId);
	if (!projectId.success) {
		return NextResponse.json({ message: "Invalid project" }, { status: 400 });
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);
		if (!applicationUser) {
			return NextResponse.json(
				{ message: "Application user unavailable" },
				{ status: 503 },
			);
		}

		const project = await getAccessibleProjectBoardVersion(
			projectId.data,
			applicationUser.id,
		);
		if (!project) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}

		return NextResponse.json(
			{ boardVersion: project.boardVersion },
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch {
		return NextResponse.json(
			{ message: "Board version could not be loaded" },
			{ status: 500 },
		);
	}
}
