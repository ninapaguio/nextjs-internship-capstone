"use client";

import { AlertTriangle, CheckCircle, Info } from "lucide-react";
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
	Progress,
	ProgressIndicator,
	ProgressTrack,
} from "@/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
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
					<Table
						aria-label="Project progress table"
						containerClassName={cn(
							"rounded-xl border border-border",
							projects.length > 5 && "max-h-105 sm:max-h-115 scrollbar-thin",
						)}
					>
						<TableHeader>
							<TableHead isRowHeader className="px-3 sm:px-4 text-xs">
								Project
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs min-w-36 sm:min-w-48">
								Progress
							</TableHead>
							<TableHead className="px-2.5 sm:px-3 text-xs w-28">
								Tasks
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs text-right w-24">
								Status
							</TableHead>
						</TableHeader>
						<TableBody>
							{projects.map((project) => {
								const isComplete =
									project.totalTasks > 0 &&
									project.completedTasks === project.totalTasks;

								return (
									<TableRow key={project.projectId} id={project.projectId}>
										<TableCell className="px-3 sm:px-4 py-3">
											<Link
												href={project.href}
												className="text-xs sm:text-sm font-medium text-foreground hover:text-brand-primary transition-colors line-clamp-1 block"
											>
												{project.projectName}
											</Link>
										</TableCell>

										<TableCell className="px-3 sm:px-4 py-3 align-middle">
											<div className="space-y-1">
												<div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground">
													<span className="font-semibold text-foreground tabular-nums">
														{project.progressPercentage}%
													</span>
													<span>
														{project.completedTasks}/{project.totalTasks}
													</span>
												</div>
												<Progress
													value={project.progressPercentage}
													minValue={0}
													maxValue={100}
													aria-label={`${project.projectName} progress: ${project.progressPercentage}%`}
													className="w-full"
												>
													<ProgressTrack className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
														<ProgressIndicator
															className={cn(
																"h-full transition-all duration-300 rounded-full",
																isComplete
																	? "bg-emerald-500"
																	: project.overdueTasks > 0
																		? "bg-linear-to-r from-amber-500 to-rose-500"
																		: "bg-linear-to-r from-brand-primary to-brand-cyan",
															)}
														/>
													</ProgressTrack>
												</Progress>
											</div>
										</TableCell>

										<TableCell className="px-2.5 sm:px-3 py-3 align-middle text-xs text-muted-foreground">
											<span>
												{project.incompleteTasks}{" "}
												<span className="text-[10px]">remaining</span>
											</span>
										</TableCell>

										<TableCell className="px-3 sm:px-4 py-3 text-right align-middle">
											{project.overdueTasks > 0 ? (
												<Badge
													variant="destructive"
													className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 inline-flex items-center gap-1 font-semibold"
												>
													<AlertTriangle className="size-2.5" />
													<span>{project.overdueTasks} overdue</span>
												</Badge>
											) : isComplete ? (
												<Badge
													variant="secondary"
													className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 inline-flex items-center"
												>
													<CheckCircle className="size-2.5 mr-1" />
													<span>Done</span>
												</Badge>
											) : (
												<span className="text-[11px] text-muted-foreground">
													On track
												</span>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
