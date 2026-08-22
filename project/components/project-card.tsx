import {
	CheckCircle2,
	Clock3,
	MoreHorizontal,
	Pencil,
	Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Progress,
	ProgressIndicator,
	ProgressTrack,
} from "@/components/ui/progress";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProjectCardData } from "@/types";

interface ProjectCardProps {
	project: ProjectCardData;
	onEdit: (project: ProjectCardData) => void;
}

const statusLabels: Record<ProjectCardData["status"], string> = {
	inactive: "Planned",
	active: "In progress",
	completed: "Completed",
	archived: "Archived",
};

// Formats project deadline
function formatProjectDeadline(date: string | null) {
	if (!date) return "No due date";

	const MILISECONDS_DAY = 86_400_000;
	const now = new Date();
	const today = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
	);
	const deadline = new Date(`${date}T00:00:00Z`).getTime();
	const days = Math.ceil((deadline - today) / MILISECONDS_DAY);

	if (days < 0) return `${Math.abs(days)}d overdue`;
	if (days === 0) return "Due today";
	return `${days} days left`;
}

// Displays project accessible link to its board.
export function ProjectCard({ project, onEdit }: ProjectCardProps) {
	return (
		<div className="group relative rounded-2xl outline-none focus-within:ring-3 focus-within:ring-ring/40">
			<Link href={project.href} className="absolute inset-0 z-10 rounded-2xl">
				<span className="sr-only">Open {project.name}</span>
			</Link>
			<Card
				size="sm"
				className="pointer-events-none relative z-20 h-full gap-0 rounded-2xl bg-card py-0 shadow-2xs ring-1 ring-border transition-all duration-200 group-hover:-translate-y-1 group-hover:border-brand_teal-500/40 group-hover:shadow-md dark:group-hover:ring-brand_teal-500/30"
			>
				<CardHeader className="gap-3 px-4 pt-4 pb-3">
					<div className="relative flex items-center justify-between gap-3 pointer-events-none">
						<CardTitle className="line-clamp-1 text-sm font-semibold tracking-tight transition-colors group-hover:text-brand_teal-600 dark:group-hover:text-brand_mint-400">
							{project.name}
						</CardTitle>
						<div className="relative z-20 flex items-center gap-1 pointer-events-auto">
							<span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
								<Clock3 className="size-3" aria-hidden="true" />
								{formatProjectDeadline(project.endDate)}
							</span>
							{project.accessRole !== "member" ? (
								<DropdownMenuTrigger>
									<TooltipTrigger delay={400}>
										<Button
											size="icon-xs"
											variant="ghost"
											aria-label={`Actions for ${project.name}`}
											className="rounded-lg hover:bg-accent"
										>
											<MoreHorizontal />
										</Button>
										<Tooltip>Project actions</Tooltip>
									</TooltipTrigger>
									<DropdownMenu placement="bottom end">
										<DropdownMenuItem onAction={() => onEdit(project)}>
											<Pencil />
											Edit project
										</DropdownMenuItem>
									</DropdownMenu>
								</DropdownMenuTrigger>
							) : null}
						</div>
					</div>
					<div className="space-y-2">
						<CardDescription className="line-clamp-2 min-h-9 text-xs leading-4.5 text-muted-foreground">
							{project.description || "No description added yet."}
						</CardDescription>
						<div className="flex items-center gap-1.5">
							<Badge
								variant={
									project.status === "completed" ? "default" : "secondary"
								}
								className={cn(
									"h-5 px-2 text-[10px] font-medium border-border/50 capitalize",
									project.status === "completed" &&
										"bg-brand_teal-500 text-white dark:bg-brand_mint-500 dark:text-brand_navy-950 font-semibold",
								)}
							>
								{statusLabels[project.status]}
							</Badge>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 px-4 pb-4">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<Users
								className="size-3.5 text-brand_teal-600 dark:text-brand_mint-400"
								aria-hidden="true"
							/>
							{project.totalMembers}{" "}
							{project.totalMembers === 1 ? "member" : "members"}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<CheckCircle2
								className="size-3.5 text-brand_teal-600 dark:text-brand_mint-400"
								aria-hidden="true"
							/>
							{project.totalTasks} {project.totalTasks === 1 ? "task" : "tasks"}
						</span>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs">
							<span className="text-[11px] font-medium text-muted-foreground">
								Progress
							</span>
							<span className="font-semibold text-foreground tabular-nums">
								{project.progressPercentage}%
							</span>
						</div>
						<Progress
							value={project.progressPercentage}
							aria-label={`${project.name} progress`}
						>
							<ProgressTrack className="h-2 bg-muted/80 rounded-full overflow-hidden">
								<ProgressIndicator className="bg-linear-to-r from-brand_teal-500 to-brand_mint-500 transition-all duration-300" />
							</ProgressTrack>
						</Progress>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/*
Features to implement:
- Hover effects
- Click to navigate to project board
- Responsive design
- Loading states
- Error states
*/
