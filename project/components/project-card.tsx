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
import type { ProjectCardData } from "@/types";

interface ProjectCardProps {
	project: ProjectCardData;
	onEdit: (project: ProjectCardData) => void;
}

const statusLabels: Record<ProjectCardData["status"], string> = {
	inactive: "Not Active",
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
		<div className="group relative rounded-2xl outline-none focus-within:ring-3 focus-within:ring-ring/30">
			<Link href={project.href} className="absolute inset-0 z-10 rounded-2xl">
				<span className="sr-only">Open {project.name}</span>
			</Link>
			<Card
				size="sm"
				className="pointer-events-none relative z-20 h-full gap-0 rounded-2xl bg-muted/55 py-0 shadow-none ring-1 ring-border transition duration-200 group-hover:-translate-y-0.5 group-hover:bg-muted/75 group-hover:shadow-md"
			>
				<CardHeader className="gap-3 px-4 pt-4 pb-3">
					<div className="relative flex items-center justify-between gap-3 pointer-events-none">
						<CardTitle className="line-clamp-1 text-sm font-semibold transition-colors group-hover:text-primary">
							{project.name}
						</CardTitle>
						<div className="relative z-20 flex items-center gap-1 pointer-events-auto">
							<span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
								<Clock3 className="size-3" aria-hidden="true" />
								{formatProjectDeadline(project.endDate)}
							</span>
							{project.accessRole === "owner" ? (
								<DropdownMenuTrigger>
									<TooltipTrigger delay={400}>
										<Button
											size="icon-xs"
											variant="ghost"
											aria-label={`Actions for ${project.name}`}
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
						<CardDescription className="line-clamp-2 min-h-9 text-xs leading-4.5">
							{project.description || "No description added yet."}
						</CardDescription>
						<div className="flex items-center gap-1.5">
							<Badge
								variant="outline"
								className="h-5 px-2 text-[10px] font-normal"
							>
								{statusLabels[project.status]}
							</Badge>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-3 px-4 pb-4">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1.5">
							<Users className="size-3.5" aria-hidden="true" />
							{project.totalMembers}{" "}
							{project.totalMembers === 1 ? "member" : "members"}
						</span>
						<span className="inline-flex items-center gap-1.5">
							<CheckCircle2 className="size-3.5" aria-hidden="true" />
							{project.totalTasks} {project.totalTasks === 1 ? "task" : "tasks"}
						</span>
					</div>

					<div className="space-y-1.5">
						<div className="flex items-center justify-end text-xs">
							<span className="font-medium tabular-nums">
								{project.progressPercentage}%
							</span>
						</div>
						<Progress
							value={project.progressPercentage}
							aria-label={`${project.name} progress`}
						>
							<ProgressTrack className="h-1.5 bg-background/80">
								<ProgressIndicator className="bg-emerald-500" />
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
