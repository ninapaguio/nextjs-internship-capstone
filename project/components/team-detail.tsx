"use client";

import { ShieldCheck, UserRoundX, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
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

	useEffect(() => {
		if (state.status === "success" && state.redirectTo) {
			router.replace(state.redirectTo);
			router.refresh();
		}
	}, [router, state.redirectTo, state.status]);

	return (
		<form action={formAction}>
			<input type="hidden" name="teamId" value={teamId} />
			<input type="hidden" name="projectId" value={projectId} />
			<input type="hidden" name="userId" value={userId} />
			<TooltipTrigger delay={400}>
				<Button
					type="submit"
					variant="ghost"
					size="icon-sm"
					aria-label="Remove project member"
				>
					<UserRoundX />
				</Button>
				<Tooltip placement="top">Remove from project</Tooltip>
			</TooltipTrigger>
			{state.status === "error" ? (
				<span className="sr-only" role="alert">
					{state.message}
				</span>
			) : null}
		</form>
	);
}

// Renders a team list with project-specific access and assigned role labels
export function TeamDetail({ team }: TeamDetailProps) {
	return (
		<div className="space-y-5">
			<div className="grid gap-3 sm:grid-cols-2">
				<Card size="sm" className="shadow-sm">
					<CardContent className="flex items-center gap-3">
						<div className="rounded-xl bg-muted p-2 text-muted-foreground">
							<UsersRound className="size-5" aria-hidden="true" />
						</div>
						<div>
							<p className="text-xl font-semibold">{team.members.length}</p>
							<p className="text-xs text-muted-foreground">Active members</p>
						</div>
					</CardContent>
				</Card>
				<Card size="sm" className="shadow-sm">
					<CardContent className="flex items-center gap-3">
						<div className="rounded-xl bg-muted p-2 text-muted-foreground">
							<ShieldCheck className="size-5" aria-hidden="true" />
						</div>
						<div>
							<p className="text-xl font-semibold">{team.roles.length}</p>
							<p className="text-xs text-muted-foreground">Custom roles</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<section className="space-y-4" aria-labelledby="team-members-heading">
				<div>
					<h2 id="team-members-heading" className="text-lg font-semibold">
						Team members
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Members and their assigned roles in this team.
					</p>
				</div>
				<Table aria-label="Team members">
					<TableHeader className="bg-muted/40">
						<TableHead className="px-5" isRowHeader>
							Member
						</TableHead>
						<TableHead className="px-5">Assigned role</TableHead>
						<TableHead className="w-16 px-5 text-right">Actions</TableHead>
					</TableHeader>
					<TableBody>
						{team.members.map((member) => {
							const assignment = member.projects[0];
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
												<AvatarFallback>
													{memberInitials(member.name)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<p className="truncate font-semibold">{member.name}</p>
												<p className="truncate text-xs text-muted-foreground">
													{member.email}
												</p>
											</div>
										</div>
									</TableCell>
									<TableCell className="px-5 py-4">
										<Badge variant="secondary">
											{assignment?.assignedRoleName || "No role assigned"}
										</Badge>
									</TableCell>
									<TableCell className="px-5 py-4 text-right">
										{team.isOwner && member.projectRole === "member" ? (
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
			</section>
		</div>
	);
}
