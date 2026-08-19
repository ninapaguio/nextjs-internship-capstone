import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { ProjectInvitationDecision } from "@/components/project-invitation-decision";
import { LinkButton } from "@/components/ui/button";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getPendingProjectInvitationForUser } from "@/lib/db/queries/project-members";
import { uuidSchema } from "@/lib/validations";
import type { ProjectInvitationPageProps } from "@/types";

export const metadata: Metadata = {
	title: "Project invitation | EverFlow",
	description: "Choose whether to join an invited EverFlow project.",
	openGraph: {
		title: "Project invitation | EverFlow",
		description: "Choose whether to join an invited EverFlow project.",
	},
};

// Displays a pending Project invitation only to the account that received it.
export default async function ProjectInvitationPage({
	params,
}: ProjectInvitationPageProps) {
	const { invitationId } = await params;
	const parsedInvitationId = uuidSchema.safeParse(invitationId);
	const { userId: clerkId } = await auth();

	if (!parsedInvitationId.success || !clerkId) {
		return <UnavailableInvitation />;
	}

	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) return <UnavailableInvitation />;

	const invitation = await getPendingProjectInvitationForUser(
		parsedInvitationId.data,
		applicationUser.id,
	);
	if (!invitation) return <UnavailableInvitation />;

	return (
		<main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-xl items-center px-4 py-10">
			<ProjectInvitationDecision invitation={invitation} />
		</main>
	);
}

// Explains why a Project invitation can no longer be accepted.
function UnavailableInvitation() {
	return (
		<main className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-xl items-center px-4 py-10">
			<section className="w-full rounded-2xl border bg-card p-7 text-center shadow-sm">
				<h1 className="text-xl font-semibold">Invitation unavailable</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					It may have expired, been declined or canceled, or belong to a
					different account.
				</p>
				<LinkButton href="/projects" className="mt-5">
					Go to projects
				</LinkButton>
			</section>
		</main>
	);
}
