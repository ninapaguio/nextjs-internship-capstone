import { AlertTriangle, ChevronRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { DashboardProjectItem } from "@/types/dashboard";

interface DashboardActiveProjectsProps {
	projects: DashboardProjectItem[];
}

export function DashboardActiveProjects({
	projects,
}: DashboardActiveProjectsProps) {
	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle className="text-sm sm:text-base font-semibold">
							Project Progress
						</CardTitle>
						<CardDescription className="text-[11px] sm:text-xs">
							Active projects ordered by overdue work and progress
						</CardDescription>
					</div>
					<Link
						href="/projects"
						className="text-xs font-medium text-brand-primary dark:text-brand-cyan hover:underline flex items-center gap-1 shrink-0"
					>
						View all <ChevronRight className="size-3.5" />
					</Link>
				</div>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{projects.length === 0 ? (
					<div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4">
						<FolderKanban className="size-8 text-muted-foreground/60 mb-2" />
						<p className="text-xs sm:text-sm font-medium text-foreground">
							No active projects found
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							Projects in planning or completed status will appear on the
							projects page.
						</p>
					</div>
				) : (
					<Table
						aria-label="Project progress"
						containerClassName="rounded-xl border border-border max-h-48 sm:max-h-52 scrollbar-thin"
					>
						<TableHeader>
							<TableHead isRowHeader className="px-3 sm:px-4 text-xs">
								Project
							</TableHead>
							<TableHead className="px-2.5 sm:px-3 text-xs w-20">
								Role
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs min-w-32 sm:min-w-40">
								Progress
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs text-right w-24">
								Overdue
							</TableHead>
						</TableHeader>
						<TableBody>
							{projects.map((project) => (
								<TableRow key={project.id} id={project.id}>
									<TableCell className="px-3 sm:px-4 py-2.5">
										<Link
											href={project.href}
											className="text-xs sm:text-sm font-medium text-foreground hover:text-brand-primary transition-colors line-clamp-1 block"
										>
											{project.name}
										</Link>
									</TableCell>

									<TableCell className="px-2.5 sm:px-3 py-2.5 align-middle">
										<Badge
											variant="secondary"
											className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 font-normal capitalize"
										>
											{project.accessRole}
										</Badge>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-2.5 align-middle">
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
												aria-label={`${project.name} progress: ${project.progressPercentage}%`}
												className="w-full"
											>
												<ProgressTrack className="h-1.5 w-full bg-muted/80 rounded-full overflow-hidden">
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
										</div>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-2.5 text-right align-middle">
										{project.overdueTasks > 0 ? (
											<Badge
												variant="destructive"
												className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 inline-flex items-center gap-1 font-semibold"
											>
												<AlertTriangle className="size-2.5" />
												<span>{project.overdueTasks}</span>
											</Badge>
										) : (
											<span className="text-[11px] text-muted-foreground">
												0
											</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
