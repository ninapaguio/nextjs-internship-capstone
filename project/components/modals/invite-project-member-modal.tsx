"use client";

import { MailPlus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { inviteProjectMember } from "@/actions/project-invitations";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type {
	InviteProjectMemberActionState,
	InviteProjectMemberModalProps,
} from "@/types";

const initialState: InviteProjectMemberActionState = {
	status: "idle",
	message: "",
};

// Shows pending feedback while the Project invitation is created.
function InviteProjectMemberSubmit() {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Sending…" : "Send invitation"}
		</Button>
	);
}

// Sends one pending Project invitation while keeping the Project OWNER unchanged.
export function InviteProjectMemberModal({
	projectId,
	projectName,
}: InviteProjectMemberModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [state, formAction] = useActionState(inviteProjectMember, initialState);
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (state.status === "success") {
			formRef.current?.reset();
			setIsOpen(false);
		}
	}, [state.status]);

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button size="sm" variant="outline">
				<MailPlus data-icon="inline-start" /> Add member
			</Button>
			<Dialog className="sm:max-w-md">
				<DialogHeader className="pr-10">
					<DialogTitle>Add a project member</DialogTitle>
					<DialogDescription>
						Send an invitation to {projectName}. The invitee must join before
						they receive access; the first accepted member automatically turns
						this into a team project.
					</DialogDescription>
				</DialogHeader>
				<form ref={formRef} action={formAction} className="space-y-5">
					<input type="hidden" name="projectId" value={projectId} />
					<Field data-invalid={Boolean(state.fieldErrors?.email)}>
						<FieldLabel htmlFor="project-member-email">
							Email address
						</FieldLabel>
						<Input
							id="project-member-email"
							name="email"
							type="email"
							autoComplete="email"
							required
							aria-invalid={Boolean(state.fieldErrors?.email)}
						/>
						<FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
					</Field>
					{state.status === "error" ? (
						<p className="text-sm text-destructive" role="alert">
							{state.message}
						</p>
					) : null}
					<DialogFooter>
						<DialogClose variant="ghost">Cancel</DialogClose>
						<InviteProjectMemberSubmit />
					</DialogFooter>
				</form>
			</Dialog>
		</DialogTrigger>
	);
}
