"use client";

import { ShieldCheck, UserRoundX, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { removeProjectMember } from "@/actions/project-members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { useActionToast } from "@/hooks/use-action-toast";
import { useSharedViewRefresh } from "@/hooks/use-shared-view-refresh";
import type { ProjectMemberActionState, TeamDetailData } from "@/types";

interface TeamDetailProps {
	team: TeamDetailData;
}

interface RemoveProjectMemberFormProps {
	teamId: string;
	projectId: string;
	userId: string;
}

const initialState: ProjectMemberActionState = {
	status: "idle",
	message: "",
};

// Shows pending feedback while a project member is removed.
function RemoveProjectMemberSubmit() {
	const { pending } = useFormStatus();
	return (
		<TooltipTrigger delay={400}>
			<Button
				type="submit"
				variant="ghost"
				size="icon-sm"
				isDisabled={pending}
				aria-label="Remove project member"
			>
				<UserRoundX />
			</Button>
			<Tooltip placement="top">
				{pending ? "Removing member" : "Remove from project"}
			</Tooltip>
		</TooltipTrigger>
	);
}

// Returns compact initials when a synchronized Clerk profile has no image.
function memberInitials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part.charAt(0).toUpperCase())
		.join("");
}

// Removes a Project member while leaving the required owner untouched.
function RemoveProjectMemberForm({
	teamId,
	projectId,
	userId,
}: RemoveProjectMemberFormProps) {
	const [state, formAction] = useActionState(removeProjectMember, initialState);
	const router = useRouter();
	useActionToast(state, { successMessage: "Project member removed." });

	useEffect(() => {
		if (state.status === "success" && state.redirectTo) {
			router.replace(state.redirectTo);
			router.refresh();
		}
	}, [router, state.redirectTo, state.status]);

	return (
		<form action={formAction} className="flex flex-col items-end">
			<input type="hidden" name="teamId" value={teamId} />
			<input type="hidden" name="projectId" value={projectId} />
			<input type="hidden" name="userId" value={userId} />
			<RemoveProjectMemberSubmit />
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

// Renders a team list with project-specific access and assigned role labels
export function TeamDetail({ team }: TeamDetailProps) {
	useSharedViewRefresh();
	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2">
				<Card
					size="sm"
					className="rounded-2xl border border-border bg-card shadow-2xs"
				>
					<CardContent className="flex items-center gap-3.5 p-4">
						<div className="rounded-xl bg-brand_teal-500/10 p-2.5 text-brand_teal-600 dark:bg-brand_teal-500/20 dark:text-brand_mint-400">
							<UsersRound className="size-5" aria-hidden="true" />
						</div>
						<div>
							<p className="text-2xl font-bold tracking-tight text-foreground">
								{team.members.length}
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								Active members
							</p>
						</div>
					</CardContent>
				</Card>
				<Card
					size="sm"
					className="rounded-2xl border border-border bg-card shadow-2xs"
				>
					<CardContent className="flex items-center gap-3.5 p-4">
						<div className="rounded-xl bg-brand_navy-500/10 p-2.5 text-brand_navy-600 dark:bg-brand_mint-500/20 dark:text-brand_mint-300">
							<ShieldCheck className="size-5" aria-hidden="true" />
						</div>
						<div>
							<p className="text-2xl font-bold tracking-tight text-foreground">
								{team.roles.length}
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								Custom roles
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<section className="space-y-4" aria-labelledby="team-members-heading">
				<div>
					<h2
						id="team-members-heading"
						className="text-lg font-semibold tracking-tight text-foreground"
					>
						Team members
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Members and their assigned roles in this team.
					</p>
				</div>
				<div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
					<Table aria-label="Team members">
						<TableHeader className="bg-muted/50">
							<TableHead className="px-5" isRowHeader>
								Member
							</TableHead>
							<TableHead className="px-5">Assigned role</TableHead>
							<TableHead className="w-16 px-5 text-right">Actions</TableHead>
						</TableHeader>
						<TableBody>
							{team.members.map((member) => {
								return (
									<TableRow key={member.id} id={member.id}>
										<TableCell className="px-5 py-4">
											<div className="flex min-w-56 items-center gap-3">
												<Avatar className="size-10">
													{member.imageUrl ? (
														<AvatarImage
															src={member.imageUrl}
															alt={member.name}
														/>
													) : null}
													<AvatarFallback className="bg-brand_navy-500/10 text-brand_navy-700 dark:bg-brand_mint-500/15 dark:text-brand_mint-300 font-semibold text-xs">
														{memberInitials(member.name)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="truncate font-semibold text-foreground text-sm">
														{member.name}
													</p>
													<p className="truncate text-xs text-muted-foreground">
														{member.email}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell className="px-5 py-4">
											<Badge
												variant="secondary"
												className="border-border/60 font-medium"
											>
												{member.assignedRoleName || "No role assigned"}
											</Badge>
										</TableCell>
										<TableCell className="px-5 py-4 text-right">
											{(team.isOwner && member.projectRole !== "owner") ||
											(!team.isOwner &&
												team.canManage &&
												member.projectRole === "member") ? (
												<RemoveProjectMemberForm
													teamId={team.id}
													projectId={team.projectId}
													userId={member.id}
												/>
											) : (
												<span
													className="inline-block size-8"
													aria-hidden="true"
												/>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			</section>
		</div>
	);
}
