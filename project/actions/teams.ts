"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { insertTeam } from "@/lib/db/mutations/teams";
import { createTeamSchema } from "@/lib/validations";

export interface CreateTeamActionState {
	status: "idle" | "error" | "success";
	message: string;
	fieldErrors?: Partial<Record<"name" | "description", string[]>>;
	team?: { id: string; name: string };
}

// Creates a team owned by the signed-in application user.
export async function createTeam(
	_previousState: CreateTeamActionState,
	formData: FormData,
): Promise<CreateTeamActionState> {
	const { userId: clerkId } = await auth();

	if (!clerkId) {
		return { status: "error", message: "Sign in to create a team." };
	}

	const parsed = createTeamSchema.safeParse({
		name: formData.get("name"),
		description: formData.get("description"),
	});

	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the highlighted fields and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	try {
		const applicationUser = await ensureApplicationUser(clerkId);

		if (!applicationUser) {
			return {
				status: "error",
				message: "Your account could not be prepared. Please try again.",
			};
		}

		const team = await insertTeam({
			...parsed.data,
			createdById: applicationUser.id,
		});

		if (!team) {
			return { status: "error", message: "The team could not be created." };
		}

		revalidatePath("/projects");
		revalidatePath("/team");

		return {
			status: "success",
			message: "Team created successfully.",
			team,
		};
	} catch {
		return {
			status: "error",
			message: "We could not create the team. Please try again.",
		};
	}
}
