"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
	getTaskColorClass,
	PRIORITY_BADGES,
} from "@/components/calendar/task-styles";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DAYS_OF_WEEK,
	formatDateKey,
	getCalendarDays,
	isSameDay,
	MAX_VISIBLE_TASKS,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { CalendarTaskItem } from "@/types";

interface MonthViewProps {
	currentDate: Date;
	tasksByDate: Map<string, CalendarTaskItem[]>;
	today: Date;
	highlightedTaskId?: string;
}

export function MonthView({
	currentDate,
	tasksByDate,
	today,
	highlightedTaskId,
}: MonthViewProps) {
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	/** Builds the fixed seven-day rows displayed by the month grid */
	const weeks = useMemo(() => {
		const calendarDays = getCalendarDays(year, month);
		const rows: Date[][] = [];
		for (let index = 0; index < calendarDays.length; index += 7) {
			rows.push(calendarDays.slice(index, index + 7));
		}
		return rows;
	}, [year, month]);

	return (
		<div className="overflow-x-auto">
			<div className="min-w-175">
				{/* Day-of-week header row */}
				<div className="grid grid-cols-7 border-b border-border bg-muted/30">
					{DAYS_OF_WEEK.map((day) => (
						<div
							key={day}
							className="py-2.5 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
						>
							{day}
						</div>
					))}
				</div>

				{/* Calendar grid: one row per week */}
				<div className="divide-y divide-border">
					{weeks.map((week) => (
						<div
							key={week[0].toISOString()}
							className="grid grid-cols-7 divide-x divide-border"
						>
							{week.map((day) => {
								const isCurrentMonth = day.getMonth() === month;
								const isToday = isSameDay(day, today);
								const dayTasks = tasksByDate.get(formatDateKey(day)) ?? [];
								const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
								const hiddenCount = dayTasks.length - MAX_VISIBLE_TASKS;

								return (
									<div
										key={day.toISOString()}
										aria-current={isToday ? "date" : undefined}
										className={cn(
											"min-h-24 sm:min-h-28 p-1.5 transition-colors",
											isCurrentMonth ? "bg-card" : "bg-muted/40",
										)}
									>
										{/* Day number */}
										<div className="flex items-start justify-start mb-1">
											<span
												className={cn(
													"inline-flex items-center justify-center text-xs font-medium leading-none",
													isToday
														? "size-6 rounded-full bg-brand_navy-500 text-white dark:bg-brand_mint-500 dark:text-brand_navy-900 shadow-xs font-semibold"
														: isCurrentMonth
															? "text-foreground"
															: "text-muted-foreground/60",
												)}
											>
												{day.getDate()}
											</span>
										</div>

										{/* Task bars */}
										<div className="space-y-1">
											{visibleTasks.map((task) => {
												const colorClass = getTaskColorClass(task);

												if (task.href) {
													return (
														<Link
															key={task.id}
															href={task.href}
															data-calendar-task-id={task.id}
															className="block rounded focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
														>
															<span
																className={cn(
																	"block truncate rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium leading-tight shadow-2xs transition-opacity hover:opacity-90",
																	colorClass,
																	task.id === highlightedTaskId &&
																		"ring-2 ring-brand_teal-500 ring-offset-1",
																	task.isCompleted && "line-through opacity-70",
																)}
																title={
																	task.type === "task"
																		? `${task.title} (${task.projectName})`
																		: task.title
																}
															>
																{task.title}
															</span>
														</Link>
													);
												}

												return (
													<div key={task.id}>
														<span
															className={cn(
																"block truncate rounded px-1.5 py-0.5 text-[10px] sm:text-xs font-medium leading-tight shadow-2xs",
																colorClass,
																task.isCompleted && "line-through opacity-70",
															)}
															title={
																task.type === "task"
																	? `${task.title} (${task.projectName})`
																	: task.title
															}
														>
															{task.title}
														</span>
													</div>
												);
											})}

											{/* Overflow indicator with accessible complete task dialog */}
											{hiddenCount > 0 && (
												<DialogTrigger>
													<Button
														variant="ghost"
														size="xs"
														className="h-5 px-1 text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-brand_teal-600 dark:hover:text-brand_mint-400 hover:bg-transparent"
														aria-label={`View ${dayTasks.length} tasks for ${day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
													>
														+ {hiddenCount} more
													</Button>
													<Dialog className="max-h-[85vh] overflow-y-auto sm:max-w-md">
														<DialogHeader>
															<DialogTitle>
																Tasks on{" "}
																{day.toLocaleDateString("en-US", {
																	month: "long",
																	day: "numeric",
																	year: "numeric",
																})}
															</DialogTitle>
															<DialogDescription>
																{dayTasks.length}{" "}
																{dayTasks.length === 1 ? "task" : "tasks"}{" "}
																scheduled for this day
															</DialogDescription>
														</DialogHeader>
														<div className="space-y-2 py-2">
															{dayTasks.map((task) => {
																const colorClass = getTaskColorClass(task);
																const content = (
																	<div
																		className={cn(
																			"rounded-lg border border-border/80 p-2.5 shadow-2xs transition-all hover:shadow-xs",
																			colorClass,
																			task.isCompleted &&
																				"opacity-70 line-through",
																		)}
																	>
																		<div className="flex items-center justify-between gap-2">
																			<span className="text-xs font-semibold leading-snug">
																				{task.title}
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
																		<p className="mt-1 text-[11px] text-muted-foreground">
																			{task.projectName}
																		</p>
																	</div>
																);

																if (task.href) {
																	return (
																		<Link
																			key={task.id}
																			href={task.href}
																			className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
																		>
																			{content}
																		</Link>
																	);
																}

																return <div key={task.id}>{content}</div>;
															})}
														</div>
													</Dialog>
												</DialogTrigger>
											)}
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
