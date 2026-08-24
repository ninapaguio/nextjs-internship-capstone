import { AlertTriangle, CheckCircle, Info } from "lucide-react";
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
	Progress,
	ProgressIndicator,
	ProgressTrack,
} from "@/components/ui/progress";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { createProjectHref } from "@/lib/project-slug";
import { cn } from "@/lib/utils";
import type { ProjectProgressItem } from "@/types/analytics";

interface ProjectProgressChartProps {
	projects: ProjectProgressItem[];
}

export function ProjectProgressChart({ projects }: ProjectProgressChartProps) {
	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
					<CardTitle className="flex items-center gap-1.5 text-sm font-semibold sm:text-base">
						<span>Project Progress</span>
						<TooltipTrigger delay={400}>
							<Button
								type="button"
								size="icon-sm"
								variant="ghost"
								aria-label="How project priority is calculated"
								className="size-6 rounded-full text-muted-foreground"
							>
								<Info className="size-3.5" />
							</Button>
							<Tooltip
								placement="bottom start"
								className="max-w-72 items-start"
							>
								Projects are ranked by most overdue tasks, then lowest
								completion rate, then most incomplete tasks, and finally by
								name. The first 10 are shown.
							</Tooltip>
						</TooltipTrigger>
					</CardTitle>
				</div>
				<CardDescription className="text-[11px] sm:text-xs">
					Up to 10 active projects prioritized by overdue work and lowest
					progress
				</CardDescription>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{projects.length === 0 ? (
					<div className="flex h-56 sm:h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4 sm:p-6">
						<p className="text-xs sm:text-sm font-medium text-muted-foreground">
							No projects with active tasks found
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							Projects will appear here once tasks are added.
						</p>
					</div>
				) : (
					<div className="space-y-3 sm:space-y-4 max-h-105 sm:max-h-115 overflow-y-auto pr-1 sm:pr-1.5 scrollbar-thin">
						{projects.map((project) => {
							const href = createProjectHref(
								project.projectId,
								project.projectName,
							);
							return (
								<div
									key={project.projectId}
									className="group rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 transition-colors hover:border-border hover:bg-accent/10"
								>
									<div className="flex items-center justify-between gap-2 mb-2">
										<a
											href={href}
											className="text-sm font-medium text-foreground hover:text-brand-primary transition-colors line-clamp-1 flex-1"
										>
											{project.projectName}
										</a>
										<div className="flex items-center gap-2 shrink-0">
											{project.overdueTasks > 0 && (
												<Badge
													variant="destructive"
													className="text-[10px] px-1.5 py-0 h-4 flex items-center gap-1 font-semibold"
												>
													<AlertTriangle className="size-3" />
													{project.overdueTasks} overdue
												</Badge>
											)}
											{project.totalTasks > 0 &&
												project.completedTasks === project.totalTasks && (
													<Badge
														variant="secondary"
														className="text-[10px] px-1.5 py-0 h-4 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400"
													>
														<CheckCircle className="size-3 mr-1" />
														Complete
													</Badge>
												)}
											<span className="text-xs font-semibold text-foreground tabular-nums">
												{project.progressPercentage}%
											</span>
										</div>
									</div>

									<Progress
										value={project.progressPercentage}
										minValue={0}
										maxValue={100}
										aria-label={`${project.projectName} progress: ${project.progressPercentage}%`}
										className="w-full"
									>
										<ProgressTrack className="h-2.5 w-full bg-muted/80 rounded-full overflow-hidden">
											<ProgressIndicator
												className={cn(
													"h-full transition-all duration-300 rounded-full",
													project.completedTasks === project.totalTasks &&
														project.totalTasks > 0
														? "bg-emerald-500"
														: project.overdueTasks > 0
															? "bg-linear-to-r from-amber-500 to-rose-500"
															: "bg-linear-to-r from-brand-primary to-brand-cyan",
												)}
											/>
										</ProgressTrack>
									</Progress>

									<div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2">
										<span>
											{project.completedTasks} of {project.totalTasks} active
											tasks completed
										</span>
										<span>{project.incompleteTasks} remaining</span>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
