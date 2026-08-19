import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import { uuidSchema } from "@/lib/validations";
import type { AcceptInvitationPageProps } from "@/types";

export const metadata: Metadata = {
	title: "Accept project invitation | EverFlow",
	description: "Create your account to join an EverFlow project.",
	openGraph: {
		title: "Accept project invitation | EverFlow",
		description: "Create your account to join an EverFlow project.",
	},
};

// Hosts Clerk's application-invitation flow before the invitee decides to join.
export default async function AcceptInvitationPage({
	searchParams,
}: AcceptInvitationPageProps) {
	const { invitation } = await searchParams;
	const parsedInvitationId = uuidSchema.safeParse(invitation);
	const destination = parsedInvitationId.success
		? `/project-invitations/${parsedInvitationId.data}`
		: "/projects";

	return (
		<main className="grid min-h-screen place-items-center bg-background px-4 py-12">
			<SignUp
				path="/accept-invitation"
				routing="path"
				signInUrl="/sign-in"
				forceRedirectUrl={destination}
			/>
		</main>
	);
}
