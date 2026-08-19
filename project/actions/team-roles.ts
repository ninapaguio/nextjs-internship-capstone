"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { insertTeamRole, renameTeamRole } from "@/lib/db/mutations/team-roles";
import { canManageTeamRoles } from "@/lib/db/queries/project-members";
import { teamRoleSchema, updateTeamRoleSchema } from "@/lib/validations";
import type { TeamRoleActionState } from "@/types";

// Renames a team-scoped role after checking Project owner access.
export async function updateTeamRole(
	_previousState: TeamRoleActionState,
	formData: FormData,
): Promise<TeamRoleActionState> {
	const parsed = updateTeamRoleSchema.safeParse({
		teamId: formData.get("teamId"),
		roleId: formData.get("roleId"),
		name: formData.get("name"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid role name.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	if (!(await canManageTeamRoles(parsed.data.teamId, applicationUser.id))) {
		return {
			status: "error",
			message: "Only the project owner can edit team roles.",
		};
	}

	const role = await renameTeamRole(parsed.data);
	if (!role) {
		return {
			status: "error",
			message: "That role was not found or its name is already in use.",
		};
	}

	revalidatePath(`/team/${parsed.data.teamId}`);
	return { status: "success", message: "Role updated." };
}

// Creates a team-scoped role after checking Project owner access.
export async function createTeamRole(
	_previousState: TeamRoleActionState,
	formData: FormData,
): Promise<TeamRoleActionState> {
	const parsed = teamRoleSchema.safeParse({
		teamId: formData.get("teamId"),
		name: formData.get("name"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid role name.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	if (!(await canManageTeamRoles(parsed.data.teamId, applicationUser.id))) {
		return {
			status: "error",
			message: "Only the project owner can create team roles.",
		};
	}

	const role = await insertTeamRole({
		...parsed.data,
		createdById: applicationUser.id,
	});
	if (!role) {
		return {
			status: "error",
			message: "That role already exists for this team.",
		};
	}

	revalidatePath(`/team/${parsed.data.teamId}`);
	return { status: "success", message: "Role created." };
}
