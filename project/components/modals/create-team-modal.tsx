"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { type CreateTeamActionState, createTeam } from "@/actions/teams";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialCreateTeamState: CreateTeamActionState = {
	status: "idle",
	message: "",
};

interface CreateTeamModalProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onCreated: (team: { id: string; name: string }) => void;
}

// Shows pending feedback while a team is being created.
function CreateTeamSubmit() {
	const { pending } = useFormStatus();

	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Creating…" : "Create team"}
		</Button>
	);
}

// Renders the standalone create-team dialog and connects it to its Server Action.
export function CreateTeamModal({
	isOpen,
	onOpenChange,
	onCreated,
}: CreateTeamModalProps) {
	const [state, formAction] = useActionState(
		createTeam,
		initialCreateTeamState,
	);
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (state.status === "success" && state.team) {
			formRef.current?.reset();
			onCreated(state.team);
			onOpenChange(false);
		}
	}, [onCreated, onOpenChange, state.status, state.team]);

	return (
		<Dialog
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
		>
			<DialogHeader className="pr-10">
				<DialogTitle className="text-xl">Create a new team</DialogTitle>
				<DialogDescription>
					Create a workspace for projects shared with your team members.
				</DialogDescription>
			</DialogHeader>

			<form ref={formRef} action={formAction} className="space-y-6">
				<FieldGroup className="gap-5">
					<Field data-invalid={Boolean(state.fieldErrors?.name)}>
						<FieldLabel htmlFor="team-name">Team name</FieldLabel>
						<Input
							id="team-name"
							name="name"
							placeholder="e.g. Product team"
							maxLength={120}
							required
							aria-invalid={Boolean(state.fieldErrors?.name)}
						/>
						<FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
					</Field>

					<Field data-invalid={Boolean(state.fieldErrors?.description)}>
						<FieldLabel htmlFor="team-description">
							Description{" "}
							<span className="text-muted-foreground">(optional)</span>
						</FieldLabel>
						<Textarea
							id="team-description"
							name="description"
							placeholder="What does your team work on?"
							maxLength={2000}
							className="min-h-24"
							aria-invalid={Boolean(state.fieldErrors?.description)}
						/>
						<FieldError>{state.fieldErrors?.description?.[0]}</FieldError>
					</Field>
				</FieldGroup>

				{state.status === "error" && (
					<p
						className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
						role="alert"
					>
						{state.message}
					</p>
				)}

				<DialogFooter className="border-t pt-5">
					<DialogClose variant="ghost">Cancel</DialogClose>
					<CreateTeamSubmit />
				</DialogFooter>
			</form>
		</Dialog>
	);
}
