"use client";

import { Pencil, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateProjectMember } from "@/actions/project-members";
import { createTeamRole, updateTeamRole } from "@/actions/team-roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import type {
	ProjectMemberActionState,
	TeamDetailMember,
	TeamRoleActionState,
	TeamRoleOption,
} from "@/types";

interface TeamRoleManagerProps {
	teamId: string;
	projectId: string;
	members: TeamDetailMember[];
	roles: TeamRoleOption[];
}

interface RenameRoleFormProps {
	teamId: string;
	role: TeamRoleOption;
}

interface MemberRoleAssignmentProps {
	teamId: string;
	projectId: string;
	member: TeamDetailMember;
	roles: TeamRoleOption[];
}

const initialMemberState: ProjectMemberActionState = {
	status: "idle",
	message: "",
};

const initialRoleState: TeamRoleActionState = {
	status: "idle",
	message: "",
};

// Returns compact initials when a synchronized Clerk profile has no image.
function memberInitials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

// Renders a reusable pending-aware submit button for role forms.
function RoleSubmit({ label }: { label: string }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" size="sm" isDisabled={pending}>
			{pending ? "Saving…" : label}
		</Button>
	);
}

// project owner define reusable roles for the generated team.
function CreateRoleForm({ teamId }: { teamId: string }) {
	const router = useRouter();
	const formRef = useRef<HTMLFormElement>(null);
	const [state, formAction] = useActionState(createTeamRole, initialRoleState);

	useEffect(() => {
		if (state.status === "success") {
			formRef.current?.reset();
			router.refresh();
		}
	}, [router, state.status]);

	return (
		<form
			ref={formRef}
			action={formAction}
			className="flex flex-col gap-2 sm:flex-row"
		>
			<input type="hidden" name="teamId" value={teamId} />
			<label htmlFor="new-team-role" className="sr-only">
				New role name
			</label>
			<Input
				id="new-team-role"
				name="name"
				placeholder="e.g. Backend Developer"
				maxLength={80}
				aria-invalid={Boolean(state.fieldErrors?.name)}
			/>
			<RoleSubmit label="Add role" />
			{state.status === "error" ? (
				<p className="text-xs text-destructive sm:self-center" role="alert">
					{state.message}
				</p>
			) : null}
		</form>
	);
}

// Renames one user-defined Team role without changing member access permissions.
function RenameRoleForm({ teamId, role }: RenameRoleFormProps) {
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [state, formAction] = useActionState(updateTeamRole, initialRoleState);

	useEffect(() => {
		if (state.status === "success") {
			setIsEditing(false);
			router.refresh();
		}
	}, [router, state.status]);

	if (!isEditing) {
		return (
			<div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2">
				<span className="font-medium">{role.name}</span>
				<TooltipTrigger delay={400}>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={`Rename ${role.name}`}
						onPress={() => setIsEditing(true)}
					>
						<Pencil />
					</Button>
					<Tooltip placement="top">Rename role</Tooltip>
				</TooltipTrigger>
			</div>
		);
	}

	return (
		<form action={formAction} className="space-y-2 rounded-xl border p-3">
			<input type="hidden" name="teamId" value={teamId} />
			<input type="hidden" name="roleId" value={role.id} />
			<label htmlFor={`role-${role.id}`} className="text-xs font-medium">
				Role name
			</label>
			<Input
				id={`role-${role.id}`}
				name="name"
				defaultValue={role.name}
				maxLength={80}
				autoFocus
			/>
			{state.status === "error" ? (
				<p className="text-xs text-destructive" role="alert">
					{state.message}
				</p>
			) : null}
			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onPress={() => setIsEditing(false)}
				>
					Cancel
				</Button>
				<RoleSubmit label="Save role" />
			</div>
		</form>
	);
}

// Lets the Project owner assign a reusable team role.
function MemberRoleAssignment({
	teamId,
	projectId,
	member,
	roles,
}: MemberRoleAssignmentProps) {
	const router = useRouter();
	const assignment = member.projects[0];
	const [roleId, setRoleId] = useState(assignment?.assignedRoleId ?? "none");
	const [state, formAction] = useActionState(
		updateProjectMember,
		initialMemberState,
	);

	useEffect(() => {
		if (state.status === "success") router.refresh();
	}, [router, state.status]);

	return (
		<form
			action={formAction}
			className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-center"
		>
			<input type="hidden" name="teamId" value={teamId} />
			<input type="hidden" name="projectId" value={projectId} />
			<input type="hidden" name="userId" value={member.id} />
			<input
				type="hidden"
				name="assignedRoleId"
				value={roleId === "none" ? "" : roleId}
			/>
			<div className="flex min-w-0 items-center gap-3">
				<Avatar className="size-9">
					{member.imageUrl ? (
						<AvatarImage src={member.imageUrl} alt={member.name} />
					) : null}
					<AvatarFallback>{memberInitials(member.name)}</AvatarFallback>
				</Avatar>
				<div className="min-w-0">
					<p className="truncate font-medium">{member.name}</p>
				</div>
			</div>
			<Select
				aria-label={`Role for ${member.name}`}
				value={roleId}
				onChange={(value) => setRoleId(String(value))}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem id="none">No custom role</SelectItem>
					{roles.map((role) => (
						<SelectItem key={role.id} id={role.id}>
							{role.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<RoleSubmit label="Save" />
			{state.status === "error" ? (
				<p className="text-xs text-destructive sm:col-span-3" role="alert">
					{state.message}
				</p>
			) : null}
		</form>
	);
}

// Provides one dedicated owner view for custom roles and member assignments.
export function TeamRoleManager({
	teamId,
	projectId,
	members,
	roles,
}: TeamRoleManagerProps) {
	return (
		<DialogTrigger>
			<Button size="sm" variant="outline">
				<ShieldCheck data-icon="inline-start" /> Roles & permissions
			</Button>
			<Dialog className="max-h-[90dvh] overflow-hidden sm:max-w-3xl">
				<DialogHeader className="pr-10">
					<DialogTitle>Manage team roles</DialogTitle>
				</DialogHeader>
				<div className="max-h-[68dvh] space-y-6 overflow-y-auto pr-1">
					<section className="space-y-3" aria-labelledby="custom-roles-heading">
						<div>
							<h3 id="custom-roles-heading" className="font-semibold">
								Custom roles
							</h3>
							<p className="text-xs text-muted-foreground">
								Create assigned roles for team members.
							</p>
						</div>
						<CreateRoleForm teamId={teamId} />
						{roles.length > 0 ? (
							<div className="grid gap-2 sm:grid-cols-2">
								{roles.map((role) => (
									<RenameRoleForm key={role.id} teamId={teamId} role={role} />
								))}
							</div>
						) : (
							<p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
								No roles have been created yet.
							</p>
						)}
					</section>
					<section className="space-y-3" aria-labelledby="member-roles-heading">
						<div>
							<h3 id="member-roles-heading" className="font-semibold">
								Member assignments
							</h3>
							<p className="text-xs text-muted-foreground">
								Assign one role to each team member.
							</p>
						</div>
						<div className="space-y-2">
							{members.map((member) => (
								<MemberRoleAssignment
									key={member.id}
									teamId={teamId}
									projectId={projectId}
									member={member}
									roles={roles}
								/>
							))}
						</div>
					</section>
				</div>
			</Dialog>
		</DialogTrigger>
	);
}
