"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import {
	declineProjectInvitationAction,
	joinProjectInvitation,
} from "@/actions/project-invitations";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";
import type {
	ProjectInvitationDecisionActionState,
	ProjectInvitationDecisionProps,
} from "@/types";

const initialState: ProjectInvitationDecisionActionState = {
	status: "idle",
	message: "",
};

// Shows pending text for either invitation decision while its Server Action runs.
function InvitationDecisionSubmit({ action }: { action: "join" | "decline" }) {
	const { pending } = useFormStatus();
	const isJoin = action === "join";
	return (
		<Button
			type="submit"
			variant={isJoin ? "default" : "outline"}
			isDisabled={pending}
		>
			{isJoin ? (
				<Check data-icon="inline-start" />
			) : (
				<X data-icon="inline-start" />
			)}
			{pending ? "Saving…" : isJoin ? "Join project" : "Decline"}
		</Button>
	);
}

// Lets the invitee explicitly accept or decline access before membership is created.
export function ProjectInvitationDecision({
	invitation,
}: ProjectInvitationDecisionProps) {
	const router = useRouter();
	const [joinState, joinAction] = useActionState(
		joinProjectInvitation,
		initialState,
	);
	const [declineState, declineAction] = useActionState(
		declineProjectInvitationAction,
		initialState,
	);
	const state = joinState.status !== "idle" ? joinState : declineState;
	useActionToast(state);

	useEffect(() => {
		if (state.status === "success" && state.redirectTo) {
			router.replace(state.redirectTo);
			router.refresh();
		}
	}, [router, state.redirectTo, state.status]);

	return (
		<section className="w-full rounded-2xl border bg-card p-7 shadow-sm">
			<p className="text-sm font-medium text-muted-foreground">
				Project invitation
			</p>
			<h1 className="mt-2 text-2xl font-semibold tracking-tight">
				Join <strong>{invitation.projectName}</strong>?
			</h1>
			<p className="mt-3 text-sm leading-6 text-muted-foreground">
				{invitation.projectDescription ||
					"You have been invited to collaborate on this project."}
			</p>
			<p className="mt-4 text-xs text-muted-foreground">
				This invitation expires {invitation.expiresAt.toLocaleDateString()}.
			</p>

			<div className="mt-7 flex flex-wrap gap-3">
				<form action={joinAction}>
					<input type="hidden" name="invitationId" value={invitation.id} />
					<InvitationDecisionSubmit action="join" />
				</form>
				<form action={declineAction}>
					<input type="hidden" name="invitationId" value={invitation.id} />
					<InvitationDecisionSubmit action="decline" />
				</form>
			</div>
			{state.status === "error" ? (
				<p className="mt-4 text-sm text-destructive" role="alert">
					{state.message}
				</p>
			) : null}
		</section>
	);
}
