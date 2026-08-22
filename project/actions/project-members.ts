"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	removeProjectMember as removeProjectMemberMutation,
	updateProjectMemberAssignment,
} from "@/lib/db/mutations/project-members";
import {
	getProjectManagementAccessRole,
	isTeamRole,
} from "@/lib/db/queries/project-members";
import {
	removeProjectMemberSchema,
	updateProjectMemberSchema,
} from "@/lib/validations";
import type { ProjectMemberActionState } from "@/types";

// Removes an allowed member while preserving the Project's required owner.
export async function removeProjectMember(
	_previousState: ProjectMemberActionState,
	formData: FormData,
): Promise<ProjectMemberActionState> {
	const parsed = removeProjectMemberSchema.safeParse({
		teamId: formData.get("teamId"),
		projectId: formData.get("projectId"),
		userId: formData.get("userId"),
	});
	if (!parsed.success) {
		return { status: "error", message: "The project member is invalid." };
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const removed = await removeProjectMemberMutation(
		parsed.data.projectId,
		parsed.data.userId,
		applicationUser.id,
	);
	if (!removed) {
		return {
			status: "error",
			message:
				"You cannot remove this member. Managers may remove members, while only the owner may remove managers.",
		};
	}

	revalidatePath(`/team/${parsed.data.teamId}`);
	revalidatePath("/team");
	revalidatePath("/projects");
	revalidatePath("/projects/[slug]", "page");

	// Leave the archived Team detail route immediately when the Project becomes solo or 1 member.
	if (removed.memberCount === 1) redirect("/team");

	return {
		status: "success",
		message: "Project member removed.",
		redirectTo: `/team/${parsed.data.teamId}`,
	};
}

// Updates a member's assigned Team role after validating management access.
export async function updateProjectMember(
	_previousState: ProjectMemberActionState,
	formData: FormData,
): Promise<ProjectMemberActionState> {
	const parsed = updateProjectMemberSchema.safeParse({
		teamId: formData.get("teamId"),
		projectId: formData.get("projectId"),
		userId: formData.get("userId"),
		accessRole: formData.get("accessRole"),
		assignedRoleId: formData.get("assignedRoleId"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Review the project role and try again.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const managementRole = await getProjectManagementAccessRole(
		parsed.data.projectId,
		parsed.data.teamId,
		applicationUser.id,
	);
	if (!managementRole) {
		return {
			status: "error",
			message: "Only the project owner or a manager can change assigned roles.",
		};
	}

	if (
		parsed.data.assignedRoleId &&
		!(await isTeamRole(parsed.data.teamId, parsed.data.assignedRoleId))
	) {
		return {
			status: "error",
			message: "Select a role defined for this team.",
		};
	}

	const member = await updateProjectMemberAssignment(
		parsed.data.projectId,
		parsed.data.userId,
		{
			accessRole:
				managementRole === "owner" ? parsed.data.accessRole : undefined,
			assignedRoleId: parsed.data.assignedRoleId,
		},
	);
	if (!member) {
		return { status: "error", message: "The project member was not found." };
	}

	revalidatePath(`/team/${parsed.data.teamId}`);
	revalidatePath("/team");
	revalidatePath("/projects");
	revalidatePath("/projects/[slug]", "page");
	return { status: "success", message: "Project role updated." };
}
