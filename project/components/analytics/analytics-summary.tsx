import {
	AlertTriangle,
	CalendarCheck,
	CheckCircle2,
	FolderKanban,
	LayoutList,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
	AnalyticsDateRange,
	AnalyticsSummaryMetrics,
} from "@/types/analytics";

interface AnalyticsSummaryProps {
	summary: AnalyticsSummaryMetrics;
	range: AnalyticsDateRange;
}

export function AnalyticsSummary({ summary, range }: AnalyticsSummaryProps) {
	const rangeLabel =
		range === "today"
			? "today"
			: range === "7d"
				? "last 7 days"
				: range === "15d"
					? "last 15 days"
					: "last 30 days";

	const cards = [
		{
			title: "Accessible Projects",
			value: summary.totalProjects,
			subtitle: "Planning, active, and completed",
			icon: FolderKanban,
			iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
		},
		{
			title: "Total Active Tasks",
			value: summary.totalTasks,
			subtitle: "Tasks in active projects and columns",
			icon: LayoutList,
			iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
		},
		{
			title: "Completed Tasks",
			value: summary.completedTasks,
			subtitle: "Active tasks marked done",
			icon: CheckCircle2,
			iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		},
		{
			title: "Completion Rate",
			value: `${summary.completionRate}%`,
			subtitle: "Completed / total tasks",
			icon: TrendingUp,
			iconBg: "bg-brand-primary/10 text-brand-primary dark:text-brand-cyan",
		},
		{
			title: "Overdue Tasks",
			value: summary.overdueTasks,
			subtitle: "Incomplete past due date",
			icon: AlertTriangle,
			iconBg:
				summary.overdueTasks > 0
					? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
					: "bg-muted text-muted-foreground",
			isOverdueHighlight: summary.overdueTasks > 0,
		},
		{
			title: "Completed in Range",
			value: summary.completedInRange,
			subtitle: `Tasks completed ${rangeLabel}`,
			icon: CalendarCheck,
			iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
		},
	];

	return (
		<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
			{cards.map((card) => (
				<Card
					key={card.title}
					className={cn(
						"transition-all duration-150 rounded-2xl sm:rounded-3xl",
						card.isOverdueHighlight &&
							"border-rose-500/30 dark:border-rose-500/40",
					)}
				>
					<CardContent className="p-3.5 sm:p-4 lg:p-4.5 flex flex-col justify-between h-full space-y-2 sm:space-y-3">
						<div className="flex items-center justify-between gap-1">
							<span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">
								{card.title}
							</span>
							<div
								className={cn(
									"flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg",
									card.iconBg,
								)}
								aria-hidden="true"
							>
								<card.icon className="size-3.5 sm:size-4" />
							</div>
						</div>

						<div>
							<div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
								{card.value}
							</div>
							<p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 sm:mt-1 leading-snug line-clamp-1">
								{card.subtitle}
							</p>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
