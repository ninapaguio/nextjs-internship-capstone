"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
} from "lucide-react";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DashboardTaskItem } from "@/types/dashboard";

interface DashboardMyTasksProps {
	tasks: DashboardTaskItem[];
}

export function DashboardMyTasks({ tasks }: DashboardMyTasksProps) {
	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<CardTitle className="text-sm sm:text-base font-semibold">
							My Active Tasks
						</CardTitle>
						<CardDescription className="text-[11px] sm:text-xs">
							Pending tasks assigned to you across active projects
						</CardDescription>
					</div>
					<Link
						href="/calendar"
						className="text-xs font-medium text-brand-primary dark:text-brand-cyan hover:underline flex items-center gap-1 shrink-0"
					>
						View calendar <ChevronRight className="size-3.5" />
					</Link>
				</div>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{tasks.length === 0 ? (
					<div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4">
						<CheckCircle2 className="size-8 text-emerald-500 mb-2" />
						<p className="text-xs sm:text-sm font-medium text-foreground">
							No active tasks assigned to you
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							You are all caught up! When tasks are assigned to you in active
							projects, they will appear here.
						</p>
					</div>
				) : (
					<Table
						aria-label="My active tasks"
						containerClassName="rounded-xl border border-border max-h-48 sm:max-h-52 scrollbar-thin"
					>
						<TableHeader>
							<TableHead isRowHeader className="px-3 sm:px-4 text-xs">
								Task
							</TableHead>
							<TableHead className="px-2.5 sm:px-3 text-xs w-24">
								Priority
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs text-right w-28 sm:w-32">
								Due Date
							</TableHead>
						</TableHeader>
						<TableBody>
							{tasks.map((task) => (
								<TableRow key={task.id} id={task.id}>
									<TableCell className="px-3 sm:px-4 py-2.5">
										<div className="min-w-0 space-y-0.5">
											<Link
												href={task.href}
												className="text-xs sm:text-sm font-medium text-foreground hover:text-brand-primary transition-colors line-clamp-1"
											>
												{task.title}
											</Link>
											<div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
												<span className="truncate max-w-32 sm:max-w-44">
													{task.projectName}
												</span>
												<span>•</span>
												<span className="truncate">{task.columnName}</span>
											</div>
										</div>
									</TableCell>

									<TableCell className="px-2.5 sm:px-3 py-2.5 align-middle">
										<span
											className={cn(
												"inline-block text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md",
												task.priorityKey === "high" && "priority-badge-high",
												task.priorityKey === "medium" &&
													"priority-badge-medium",
												task.priorityKey === "low" && "priority-badge-low",
											)}
										>
											{task.priorityLabel}
										</span>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-2.5 text-right align-middle">
										{task.dueDate ? (
											<Badge
												variant={
													task.isOverdue
														? "destructive"
														: task.isDueToday
															? "secondary"
															: "outline"
												}
												className={cn(
													"text-[9px] sm:text-[10px] px-1.5 py-0.5 h-4.5 inline-flex items-center gap-1 font-medium",
													task.isDueToday &&
														"bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
												)}
											>
												{task.isOverdue ? (
													<AlertTriangle className="size-2.5" />
												) : task.isDueToday ? (
													<Clock className="size-2.5" />
												) : (
													<Calendar className="size-2.5 text-muted-foreground" />
												)}
												<span>
													{task.isOverdue
														? "Overdue"
														: task.isDueToday
															? "Today"
															: task.dueDate}
												</span>
											</Badge>
										) : (
											<span className="text-[11px] text-muted-foreground">
												—
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
