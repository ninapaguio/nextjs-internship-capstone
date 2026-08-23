"use client";

import Link from "next/link";
import {
	getTaskColorClass,
	PRIORITY_BADGES,
} from "@/components/calendar/task-styles";
import {
	DAYS_OF_WEEK,
	formatDateKey,
	getWeekDays,
	isSameDay,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { CalendarTaskItem } from "@/types";

interface WeekViewProps {
	currentDate: Date;
	tasksByDate: Map<string, CalendarTaskItem[]>;
	today: Date;
	highlightedTaskId?: string;
}

// lists all tasks and deadlines grouped under each day column
export function WeekView({
	currentDate,
	tasksByDate,
	today,
	highlightedTaskId,
}: WeekViewProps) {
	const weekDays = getWeekDays(currentDate);

	return (
		<div className="overflow-x-auto">
			<div className="min-w-175">
				<div className="grid grid-cols-7 divide-x divide-border border-b border-border bg-muted/30">
					{weekDays.map((day) => {
						const isToday = isSameDay(day, today);
						const dayTasks = tasksByDate.get(formatDateKey(day)) ?? [];

						return (
							<div
								key={day.toISOString()}
								aria-current={isToday ? "date" : undefined}
								className={cn(
									"flex flex-col items-center justify-center py-2.5 transition-colors",
									isToday && "bg-brand_teal-50/40 dark:bg-brand_teal-950/25",
								)}
							>
								<span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
									{DAYS_OF_WEEK[day.getDay()]}
								</span>
								<span
									className={cn(
										"my-1 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold leading-none",
										isToday
											? "bg-brand_navy-500 text-white dark:bg-brand_mint-500 dark:text-brand_navy-900 shadow-xs"
											: "text-foreground",
									)}
								>
									{day.getDate()}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
								</span>
							</div>
						);
					})}
				</div>

				{/* Week day columns content */}
				<div className="grid grid-cols-7 divide-x divide-border">
					{weekDays.map((day) => {
						const isToday = isSameDay(day, today);
						const dayTasks = tasksByDate.get(formatDateKey(day)) ?? [];

						return (
							<div
								key={day.toISOString()}
								className={cn(
									"flex min-h-105 flex-col p-2 transition-colors",
									isToday
										? "bg-brand_teal-50/15 dark:bg-brand_teal-950/10"
										: "bg-card",
								)}
							>
								{/* Day Tasks List */}
								<div className="flex-1 space-y-2 overflow-y-auto">
									{dayTasks.length === 0 ? (
										<div className="flex h-32 items-center justify-center text-center text-xs text-muted-foreground/60">
											No tasks due
										</div>
									) : (
										dayTasks.map((task) => {
											const colorClass = getTaskColorClass(task);

											const cardContent = (
												<div
													className={cn(
														"group relative rounded-lg border border-border/80 p-2.5 shadow-2xs transition-all hover:shadow-xs hover:border-foreground/20",
														colorClass,
														task.id === highlightedTaskId &&
															"ring-2 ring-brand_teal-500 ring-offset-1",
														task.isCompleted && "opacity-60",
													)}
												>
													{/* Task title with optional time */}
													<div
														className={cn(
															"text-xs font-semibold leading-snug line-clamp-2",
															task.isCompleted && "line-through",
														)}
													>
														{task.title}
													</div>

													{/* Project & Priority metadata */}
													<div className="mt-2 flex items-center justify-between gap-1 text-[10px]">
														<span className="truncate font-medium opacity-80">
															{task.projectName}
														</span>
														{task.priority && (
															<span
																className={cn(
																	"rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wide capitalize shrink-0",
																	PRIORITY_BADGES[task.priority],
																)}
															>
																{task.priority}
															</span>
														)}
													</div>
												</div>
											);

											if (task.href) {
												return (
													<Link
														key={task.id}
														href={task.href}
														data-calendar-task-id={task.id}
														className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
													>
														{cardContent}
													</Link>
												);
											}

											return <div key={task.id}>{cardContent}</div>;
										})
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
