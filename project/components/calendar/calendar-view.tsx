"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { DEADLINE_TYPE_CONFIG } from "@/lib/task-styles";
import { WeekView } from "@/components/calendar/week-view";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { buildTaskMap, parseDateString } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type {
	CalendarData,
	CalendarTaskCreationOptions,
	CalendarView,
} from "@/types";

interface CalendarViewProps {
	calendarData: CalendarData;
	today: string;
	initialDate?: string;
	initialView?: CalendarView;
	highlightedTaskId?: string;
	taskCreationOptions: CalendarTaskCreationOptions;
}

// Interactive calendar workspace supporting Month and Week views for project schedules.
export function CalendarViewComponent({
	calendarData,
	today,
	initialDate,
	initialView = "month",
	highlightedTaskId,
	taskCreationOptions,
}: CalendarViewProps) {
	const todayDate = useMemo(() => parseDateString(today), [today]);
	const [currentDate, setCurrentDate] = useState(() =>
		initialDate ? parseDateString(initialDate) : todayDate,
	);
	const [view, setView] = useState<CalendarView>(initialView);

	// Builds lookup map from date string to tasks for the month/week views
	const tasksByDate = useMemo(
		() => buildTaskMap(calendarData.tasks),
		[calendarData.tasks],
	);

	// Synchronizes navigation state when task creation updates the calendar URL.
	useEffect(() => {
		if (initialDate) setCurrentDate(parseDateString(initialDate));
		setView(initialView);
	}, [initialDate, initialView]);

	// Brings the newly created task into view after the target month is rendered.
	useEffect(() => {
		if (!highlightedTaskId) return;
		requestAnimationFrame(() => {
			document
				.querySelector(`[data-calendar-task-id="${highlightedTaskId}"]`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		});
	}, [highlightedTaskId]);

	// Navigates backward by one month or week
	function goToPrevious() {
		setCurrentDate((prev) => {
			if (view === "month") {
				return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
			}
			return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7);
		});
	}

	// Navigates forward by one month or week
	function goToNext() {
		setCurrentDate((prev) => {
			if (view === "month") {
				return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
			}
			return new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7);
		});
	}

	// Resets current date to today
	function goToToday() {
		setCurrentDate(todayDate);
	}

	return (
		<div className="min-w-0 space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Calendar
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					View project deadlines and team schedules
				</p>
			</div>

			{/* Calendar container */}
			<div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
				<CalendarHeader
					currentDate={currentDate}
					view={view}
					onPrevious={goToPrevious}
					onNext={goToNext}
					onToday={goToToday}
					onViewChange={setView}
					taskCreationOptions={taskCreationOptions}
				/>

				{/* Active view */}
				{view === "month" && (
					<MonthView
						currentDate={currentDate}
						tasksByDate={tasksByDate}
						today={todayDate}
						highlightedTaskId={highlightedTaskId}
					/>
				)}
				{view === "week" && (
					<WeekView
						currentDate={currentDate}
						tasksByDate={tasksByDate}
						today={todayDate}
						highlightedTaskId={highlightedTaskId}
					/>
				)}
			</div>

			{/* Upcoming Deadlines table */}
			<div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-base font-semibold text-foreground sm:text-lg">
						Upcoming Deadlines
					</h2>
					<Badge variant="secondary" className="text-xs font-medium">
						{calendarData.upcomingDeadlines.length}{" "}
						{calendarData.upcomingDeadlines.length === 1
							? "deadline"
							: "deadlines"}
					</Badge>
				</div>

				<Table
					aria-label="Upcoming deadlines"
					containerClassName={cn(
						"rounded-xl border border-border",
						calendarData.upcomingDeadlines.length > 10 &&
						"max-h-130 scrollbar-thin",
					)}
				>
					<TableHeader>
						<TableHead isRowHeader>Task / Milestone</TableHead>
						<TableHead>Project</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Due Date</TableHead>
						<TableHead>Assignee</TableHead>
					</TableHeader>
					<TableBody>
						{calendarData.upcomingDeadlines.length === 0 ? (
							<TableRow>
								<TableCell
									className="text-center text-muted-foreground py-8"
									colSpan={5}
								>
									No upcoming deadlines found for your projects.
								</TableCell>
							</TableRow>
						) : (
							calendarData.upcomingDeadlines.map((deadline) => (
								<TableRow key={deadline.id}>
									<TableCell className="font-medium text-foreground">
										{deadline.href ? (
											<Link
												href={deadline.href}
												className="hover:underline hover:text-brand_teal-600 dark:hover:text-brand_mint-400 transition-colors"
											>
												{deadline.title}
											</Link>
										) : (
											deadline.title
										)}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{deadline.projectHref ? (
											<Link
												href={deadline.projectHref}
												className="hover:underline hover:text-brand_teal-600 dark:hover:text-brand_mint-400 transition-colors"
											>
												{deadline.project}
											</Link>
										) : (
											deadline.project
										)}
									</TableCell>
									<TableCell>
										<span
											className={cn(
												"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold tracking-wide capitalize shrink-0",
												DEADLINE_TYPE_CONFIG[deadline.type]?.className ??
												"bg-muted text-muted-foreground",
											)}
										>
											{DEADLINE_TYPE_CONFIG[deadline.type]?.label ??
												deadline.type}
										</span>
									</TableCell>
									<TableCell className="text-muted-foreground text-xs sm:text-sm">
										{deadline.date}
									</TableCell>
									<TableCell className="text-muted-foreground text-xs sm:text-sm">
										{deadline.assignee}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
