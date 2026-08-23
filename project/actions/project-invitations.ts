"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import {
	acceptProjectInvitation,
	cancelProjectInvitation,
	createProjectInvitation,
	declineProjectInvitation,
	linkProjectInvitationToClerk,
	revokeProjectInvitation,
} from "@/lib/db/mutations/project-members";
import {
	getProjectInvitationAccess,
	isProjectMemberByEmail,
} from "@/lib/db/queries/project-members";
import { createProjectHref } from "@/lib/project-slug";
import { publishProjectBoardUpdate } from "@/lib/realtime/pusher-server";
import {
	projectInvitationCancellationSchema,
	projectInvitationDecisionSchema,
	projectInvitationSchema,
} from "@/lib/validations";
import type {
	CancelProjectInvitationActionState,
	InviteProjectMemberActionState,
	ProjectInvitationDecisionActionState,
} from "@/types";

const PROJECT_INVITATION_EXPIRY_DAYS = 7;

// Creates URL for the invitee to join the Project after signing in or signing up with Clerk.
function projectInvitationRedirectUrl(invitationId: string) {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (!appUrl) return null;

	try {
		const invitationUrl = new URL("/accept-invitation", appUrl);
		invitationUrl.searchParams.set("invitation", invitationId);
		return invitationUrl.toString();
	} catch {
		return null;
	}
}

// Sends a pending Clerk email invitation without granting Project access yet.
export async function inviteProjectMember(
	_previousState: InviteProjectMemberActionState,
	formData: FormData,
): Promise<InviteProjectMemberActionState> {
	const parsed = projectInvitationSchema.safeParse({
		projectId: formData.get("projectId"),
		email: formData.get("email"),
	});
	if (!parsed.success) {
		return {
			status: "error",
			message: "Enter a valid email address.",
			fieldErrors: parsed.error.flatten().fieldErrors,
		};
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const project = await getProjectInvitationAccess(
		parsed.data.projectId,
		applicationUser.id,
	);
	if (!project) {
		return {
			status: "error",
			message: "Only the project owner or a manager can add members.",
		};
	}

	if (await isProjectMemberByEmail(project.id, parsed.data.email)) {
		return {
			status: "error",
			message: "This user is already a project member.",
		};
	}

	const expiresAt = new Date(
		Date.now() + PROJECT_INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
	);
	const invitation = await createProjectInvitation({
		projectId: project.id,
		email: parsed.data.email,
		invitedById: applicationUser.id,
		expiresAt,
	});
	if (!invitation) {
		return {
			status: "error",
			message: "A pending invitation already exists for this email.",
		};
	}
	const redirectUrl = projectInvitationRedirectUrl(invitation.id);
	if (!redirectUrl) {
		await revokeProjectInvitation(invitation.id);
		return {
			status: "error",
			message: "Configure NEXT_PUBLIC_APP_URL before sending invitations.",
		};
	}

	try {
		const client = await clerkClient();
		const clerkInvitation = await client.invitations.createInvitation({
			emailAddress: parsed.data.email,
			redirectUrl,
			expiresInDays: PROJECT_INVITATION_EXPIRY_DAYS,
			ignoreExisting: true,
		});
		try {
			await linkProjectInvitationToClerk(invitation.id, clerkInvitation.id);
		} catch (error) {
			// The invitation remains valid through its Clerk metadata even if this diagnostic identifier could not be stored locally.
			console.error("project_invitation_link_failed", {
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
		const projectHref = createProjectHref(project.id, project.name);
		revalidatePath(projectHref);
		revalidatePath("/team", "layout");
		return {
			status: "success",
			message: "Invitation sent. Access begins after the invitee joins.",
		};
	} catch {
		await revokeProjectInvitation(invitation.id);
		return {
			status: "error",
			message: "Clerk could not send the invitation. Try again shortly.",
		};
	}
}

// Adds the invited account as a member only after it explicitly joins the Project.
export async function joinProjectInvitation(
	_previousState: ProjectInvitationDecisionActionState,
	formData: FormData,
): Promise<ProjectInvitationDecisionActionState> {
	const parsed = projectInvitationDecisionSchema.safeParse({
		invitationId: formData.get("invitationId"),
	});
	if (!parsed.success) {
		return { status: "error", message: "This invitation is invalid." };
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to join." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const membership = await acceptProjectInvitation(
		parsed.data.invitationId,
		applicationUser.id,
	);
	if (!membership) {
		return {
			status: "error",
			message:
				"This invitation is unavailable, expired, or for another account.",
		};
	}

	const projectHref = createProjectHref(
		membership.projectId,
		membership.projectName,
	);
	await publishProjectBoardUpdate(membership.projectId);
	revalidatePath("/projects");
	revalidatePath("/team", "layout");
	revalidatePath(projectHref);

	// Navigate before the accepted invitation page re-renders as unavailable.
	redirect(projectHref);
}

// Declines a pending Project invitation without granting any Project access.
export async function declineProjectInvitationAction(
	_previousState: ProjectInvitationDecisionActionState,
	formData: FormData,
): Promise<ProjectInvitationDecisionActionState> {
	const parsed = projectInvitationDecisionSchema.safeParse({
		invitationId: formData.get("invitationId"),
	});
	if (!parsed.success) {
		return { status: "error", message: "This invitation is invalid." };
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to decline." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const invitation = await declineProjectInvitation(
		parsed.data.invitationId,
		applicationUser.id,
	);
	if (!invitation) {
		return {
			status: "error",
			message: "This invitation is unavailable or for another account.",
		};
	}

	if (invitation.clerkInvitationId) {
		try {
			const client = await clerkClient();
			await client.invitations.revokeInvitation(invitation.clerkInvitationId);
		} catch (error) {
			console.error("clerk_project_invitation_revoke_failed", {
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	revalidatePath("/projects");
	revalidatePath("/team", "layout");

	redirect("/projects");
}

// Cancels a pending invitation for a Project owned by the signed-in user.
export async function cancelProjectInvitationAction(
	_previousState: CancelProjectInvitationActionState,
	formData: FormData,
): Promise<CancelProjectInvitationActionState> {
	const parsed = projectInvitationCancellationSchema.safeParse({
		invitationId: formData.get("invitationId"),
	});
	if (!parsed.success) {
		return { status: "error", message: "This invitation is invalid." };
	}

	const { userId: clerkId } = await auth();
	if (!clerkId) return { status: "error", message: "Sign in to continue." };
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) {
		return { status: "error", message: "Your account could not be loaded." };
	}

	const invitation = await cancelProjectInvitation(
		parsed.data.invitationId,
		applicationUser.id,
	);
	if (!invitation) {
		return {
			status: "error",
			message: "This invitation is no longer pending or cannot be canceled.",
		};
	}

	let clerkRevokeFailed = false;
	if (invitation.clerkInvitationId) {
		try {
			const client = await clerkClient();
			await client.invitations.revokeInvitation(invitation.clerkInvitationId);
		} catch (error) {
			clerkRevokeFailed = true;
			console.error("clerk_project_invitation_cancel_failed", {
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	const projectHref = createProjectHref(
		invitation.projectId,
		invitation.projectName,
	);
	revalidatePath(projectHref);
	revalidatePath("/team", "layout");
	return {
		status: "success",
		message: clerkRevokeFailed
			? "Invitation canceled in EverFlow. Its email link can no longer grant project access."
			: "Invitation canceled.",
	};
}
