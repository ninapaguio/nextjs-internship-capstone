import {
	AlertTriangle,
	CalendarClock,
	CheckSquare,
	FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummaryMetrics } from "@/types/dashboard";

interface DashboardSummaryProps {
	summary: DashboardSummaryMetrics;
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
	const cards = [
		{
			title: "Active Projects",
			value: summary.activeProjects,
			subtitle: "Accessible active projects",
			icon: FolderKanban,
			iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
			href: "/projects",
		},
		{
			title: "My Active Tasks",
			value: summary.myActiveTasks,
			subtitle: "Pending tasks assigned to you",
			icon: CheckSquare,
			iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
			href: "/projects",
		},
		{
			title: "My Overdue Tasks",
			value: summary.myOverdueTasks,
			subtitle: "Incomplete past due date",
			icon: AlertTriangle,
			iconBg:
				summary.myOverdueTasks > 0
					? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
					: "bg-muted text-muted-foreground",
			isOverdueHighlight: summary.myOverdueTasks > 0,
			href: "/calendar",
		},
		{
			title: "Tasks Due This Week",
			value: summary.dueThisWeek,
			subtitle: "Due in the next 7 days",
			icon: CalendarClock,
			iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
			href: "/calendar",
		},
	];

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
			{cards.map((card) => (
				<Link
					key={card.title}
					href={card.href}
					className="group block focus-visible:outline-none"
				>
					<Card
						className={cn(
							"transition-all duration-150 rounded-2xl sm:rounded-3xl hover:border-brand-primary/40 dark:hover:border-brand-cyan/40",
							card.isOverdueHighlight &&
								"border-rose-500/40 dark:border-rose-500/40",
						)}
					>
						<CardContent className="p-3.5 sm:p-5 flex flex-col justify-between h-full space-y-2 sm:space-y-3">
							<div className="flex items-center justify-between gap-1">
								<span className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">
									{card.title}
								</span>
								<div
									className={cn(
										"flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
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
				</Link>
			))}
		</div>
	);
}
