"use client";

import {
	CircleCheck,
	FolderKanban,
	Plus,
	Search,
	UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CreateTeamModal } from "@/components/modals/create-team-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import type { TeamListItem } from "@/types";

interface TeamOverviewProps {
	teams: TeamListItem[];
}

// Derives a compact two-letter fallback from a team name.
function teamInitials(name: string) {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase())
		.join("");
}

// Renders searchable team cards and coordinates the create-team dialog.
export function TeamOverview({ teams }: TeamOverviewProps) {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const handleTeamCreated = useCallback(() => router.refresh(), [router]);
	const normalizedSearch = search.trim().toLowerCase();
	const visibleTeams = useMemo(
		() =>
			teams.filter(
				(team) =>
					!normalizedSearch ||
					`${team.name} ${team.description ?? ""}`
						.toLowerCase()
						.includes(normalizedSearch),
			),
		[normalizedSearch, teams],
	);

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Organize people and the projects you work on together.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<InputGroup className="h-9 w-full bg-muted/70 sm:w-56">
						<InputGroupAddon>
							<Search aria-hidden="true" />
						</InputGroupAddon>
						<InputGroupInput
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search teams"
							aria-label="Search teams"
						/>
					</InputGroup>
					<Button onPress={() => setIsCreateOpen(true)}>
						<Plus data-icon="inline-start" /> New team
					</Button>
				</div>
			</div>

			{visibleTeams.length > 0 ? (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{visibleTeams.map((team) => (
						<Card
							key={team.id}
							className="min-h-36 gap-0 rounded-2xl border border-black/5 bg-white py-0 shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/8 dark:bg-zinc-900"
							size="sm"
						>
							<CardHeader className="flex flex-row items-center justify-between gap-3 rounded-t-2xl px-3.5 pt-3.5 pb-0">
								<div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-300">
									<CircleCheck className="size-4" aria-hidden="true" />
									<span>Active workspace</span>
								</div>
								<Badge
									variant="secondary"
									className="h-5 border-0 px-2 text-[10px]"
								>
									{team.isOwner ? "Owner" : "Member"}
								</Badge>
							</CardHeader>
							<CardContent className="flex flex-1 gap-3 px-3.5 pt-3">
								<Avatar size="sm" className="mt-0.5">
									<AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
										{teamInitials(team.name)}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<h2 className="line-clamp-2 text-sm font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
										{team.name}
									</h2>
									<p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
										{team.description ||
											"No team description has been added yet."}
									</p>
								</div>
							</CardContent>
							<CardFooter className="gap-2 rounded-b-2xl px-3.5 pt-5 pb-3.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
								<span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
									<UsersRound className="size-3.5" aria-hidden="true" />
									{team.memberCount}{" "}
									{team.memberCount === 1 ? "member" : "members"}
								</span>
								<span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
									<FolderKanban className="size-3.5" aria-hidden="true" />
									{team.projectCount}{" "}
									{team.projectCount === 1 ? "project" : "projects"}
								</span>
							</CardFooter>
						</Card>
					))}
				</div>
			) : (
				<div className="grid min-h-80 place-items-center rounded-4xl border border-dashed bg-muted/20 p-8 text-center">
					<div className="max-w-sm">
						<UsersRound
							className="mx-auto size-10 text-muted-foreground"
							aria-hidden="true"
						/>
						<h2 className="mt-4 font-semibold">
							{search ? "No matching teams" : "Create your first team"}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{search
								? "Try a different name or clear the search."
								: "Teams give shared projects and members one place to work together."}
						</p>
						{!search ? (
							<Button className="mt-4" onPress={() => setIsCreateOpen(true)}>
								<Plus data-icon="inline-start" /> Create team
							</Button>
						) : null}
					</div>
				</div>
			)}

			<CreateTeamModal
				isOpen={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				onCreated={handleTeamCreated}
			/>
		</>
	);
}
