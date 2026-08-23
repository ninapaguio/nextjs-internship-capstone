"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { CreateCalendarTaskModal } from "@/components/calendar/create-calendar-task-modal";
import { Button } from "@/components/ui/button";
import { formatMonthYear, formatWeekRange, getWeekDays } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import type { CalendarTaskCreationOptions, CalendarView } from "@/types";

interface CalendarHeaderProps {
	currentDate: Date;
	view: CalendarView;
	onPrevious: () => void;
	onNext: () => void;
	onToday: () => void;
	onViewChange: (view: CalendarView) => void;
	taskCreationOptions: CalendarTaskCreationOptions;
}

const VIEWS: CalendarView[] = ["month", "week"];

/** Returns the formatted title string based on the active calendar view */
function getTitle(view: CalendarView, currentDate: Date): string {
	if (view === "month") {
		return formatMonthYear(currentDate);
	}
	return formatWeekRange(getWeekDays(currentDate));
}

/** Calendar toolbar with Today button, navigation arrows, title, and view toggle (Month/Week) */
export function CalendarHeader({
	currentDate,
	view,
	onPrevious,
	onNext,
	onToday,
	onViewChange,
	taskCreationOptions,
}: CalendarHeaderProps) {
	return (
		<div className="flex flex-col gap-3 border-b border-border bg-card/60 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex min-w-0 items-center gap-2 sm:gap-3">
				{/* navigation buttons */}
				<Button
					variant="outline"
					size="sm"
					onPress={onToday}
					className="rounded-lg text-sm font-medium hover:border-brand_teal-500/50"
				>
					Today
				</Button>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onPress={onPrevious}
						aria-label="Previous"
						className="rounded-lg hover:bg-accent"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onPress={onNext}
						aria-label="Next"
						className="rounded-lg hover:bg-accent"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>

				{/* Dynamic title based on active view */}
				<h2 className="min-w-0 truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
					{getTitle(view, currentDate)}
				</h2>
			</div>

			<div className="flex items-center justify-between gap-2 lg:justify-end">
				{/* View toggle: Month / Week */}
				<div className="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 gap-1">
					{VIEWS.map((v) => {
						const isSelected = v === view;
						return (
							<Button
								key={v}
								variant="ghost"
								size="xs"
								aria-pressed={isSelected}
								onPress={() => onViewChange(v)}
								className={cn(
									"h-6 px-3 text-xs font-medium capitalize rounded-md transition-all",
									isSelected
										? "bg-brand_navy-500 text-white shadow-xs hover:bg-brand_navy-600 hover:text-white dark:bg-brand_teal-600 dark:hover:bg-brand_teal-700 dark:text-white"
										: "text-muted-foreground hover:text-foreground hover:bg-background/60",
								)}
							>
								{v}
							</Button>
						);
					})}
				</div>
				<CreateCalendarTaskModal options={taskCreationOptions} />
			</div>
		</div>
	);
}
