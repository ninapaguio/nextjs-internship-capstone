"use client";

import { Clock3, Mail, MailX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelProjectInvitationAction } from "@/actions/project-invitations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";
import type {
	CancelProjectInvitationActionState,
	InvitationStateOption,
	ProjectInvitationManagementStatus,
	ProjectInvitationsManagerProps,
} from "@/types";

const initialState: CancelProjectInvitationActionState = {
	status: "idle",
	message: "",
};

const invitationStates: InvitationStateOption[] = [
	{ id: "pending", label: "Pending" },
	{ id: "declined", label: "Declined" },
	{ id: "expired", label: "Expired" },
];

// Formats an invitation timestamp for the current user's locale.
function formatInvitationDate(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

// Displays pending feedback while an invitation cancellation is submitted.
function CancelInvitationSubmit() {
	const { pending } = useFormStatus();
	return (
		<TooltipTrigger delay={400}>
			<Button
				type="submit"
				variant="ghost"
				size="icon-sm"
				isDisabled={pending}
				aria-label="Cancel invitation"
			>
				<X />
			</Button>
			<Tooltip placement="top">Cancel invitation</Tooltip>
		</TooltipTrigger>
	);
}

// Cancels one pending invitation and refreshes its owner-facing list.
function CancelInvitationForm({ invitationId }: { invitationId: string }) {
	const router = useRouter();
	const [state, formAction] = useActionState(
		cancelProjectInvitationAction,
		initialState,
	);
	useActionToast(state, { successMessage: "Invitation canceled." });

	useEffect(() => {
		if (state.status === "success") router.refresh();
	}, [router, state.status]);

	return (
		<form action={formAction} className="flex flex-col items-end">
			<input type="hidden" name="invitationId" value={invitationId} />
			<CancelInvitationSubmit />
			{state.status === "error" ? (
				<span
					className="mt-1 max-w-48 text-right text-xs text-destructive"
					role="alert"
				>
					{state.message}
				</span>
			) : null}
		</form>
	);
}

// Returns the empty-state copy and icon for an invitation category.
function invitationEmptyState(status: ProjectInvitationManagementStatus) {
	if (status === "pending") {
		return {
			icon: Clock3,
			title: "No pending invitations",
		};
	}
	if (status === "declined") {
		return {
			icon: MailX,
			title: "No declined invitations",
		};
	}
	return {
		icon: Mail,
		title: "No expired invitations",
	};
}

// Project owner review pending, declined, expired invitations, and cancel pending invitations.
export function ProjectInvitationsManager({
	invitations,
}: ProjectInvitationsManagerProps) {
	const [selectedState, setSelectedState] =
		useState<ProjectInvitationManagementStatus>("pending");
	const visibleInvitations = invitations.filter(
		(invitation) => invitation.status === selectedState,
	);
	const pendingCount = invitations.filter(
		(invitation) => invitation.status === "pending",
	).length;
	const emptyState = invitationEmptyState(selectedState);
	const EmptyIcon = emptyState.icon;

	return (
		<DialogTrigger>
			<Button size="sm">
				<Mail data-icon="inline-start" /> Invitations
				{pendingCount > 0 ? (
					<Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-brand_mint-500 text-brand_navy-950 font-bold dark:bg-brand_navy-900 dark:text-brand_mint-300">
						{pendingCount}
					</Badge>
				) : null}
			</Button>
			<Dialog className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
				<DialogHeader className="pr-10">
					<DialogTitle>Manage invitations</DialogTitle>
					<DialogDescription>
						Only pending invitations can be canceled.
					</DialogDescription>
				</DialogHeader>
				<fieldset className="grid grid-cols-3 rounded-2xl bg-muted/60 p-1 border border-border/40">
					<legend className="sr-only">Invitation status</legend>
					{invitationStates.map((state) => {
						const count = invitations.filter(
							(invitation) => invitation.status === state.id,
						).length;
						return (
							<Button
								key={state.id}
								type="button"
								variant="ghost"
								size="sm"
								aria-pressed={selectedState === state.id}
								onPress={() => setSelectedState(state.id)}
								className={cn(
									"rounded-xl font-medium transition-all",
									selectedState === state.id &&
										"bg-card text-foreground shadow-xs hover:bg-card font-semibold",
								)}
							>
								{state.label}
								<span className="text-muted-foreground text-xs">{count}</span>
							</Button>
						);
					})}
				</fieldset>
				<div className="max-h-[50dvh] space-y-2 overflow-y-auto pr-1">
					{visibleInvitations.length > 0 ? (
						visibleInvitations.map((invitation) => (
							<div
								key={invitation.id}
								className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-2xs"
							>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<p className="truncate font-semibold text-sm text-foreground">
											{invitation.email}
										</p>
										<Badge
											variant="secondary"
											className="capitalize text-[10px]"
										>
											{invitation.status}
										</Badge>
									</div>
									<p className="mt-1 text-xs text-muted-foreground">
										Sent {formatInvitationDate(invitation.createdAt)} · expires{" "}
										{formatInvitationDate(invitation.expiresAt)}
									</p>
								</div>
								{invitation.status === "pending" ? (
									<CancelInvitationForm invitationId={invitation.id} />
								) : null}
							</div>
						))
					) : (
						<Empty className="min-h-64 border">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<EmptyIcon />
								</EmptyMedia>
								<EmptyTitle>{emptyState.title}</EmptyTitle>
							</EmptyHeader>
						</Empty>
					)}
				</div>
			</Dialog>
		</DialogTrigger>
	);
}
