"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
	AccessibleProjectOption,
	AnalyticsDateRange,
	AnalyticsFilterState,
} from "@/types/analytics";

interface AnalyticsFiltersProps {
	accessibleProjects: AccessibleProjectOption[];
	currentFilter: AnalyticsFilterState;
}

const DATE_RANGES: Array<{
	id: AnalyticsDateRange;
	label: string;
	shortLabel: string;
}> = [
	{ id: "today", label: "Today", shortLabel: "Today" },
	{ id: "7d", label: "Last 7 days", shortLabel: "7 days" },
	{ id: "15d", label: "Last 15 days", shortLabel: "15 days" },
	{ id: "30d", label: "Last 30 days", shortLabel: "30 days" },
];

export function AnalyticsFilters({
	accessibleProjects,
	currentFilter,
}: AnalyticsFiltersProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	// Updates URL query parameters while preserving unaffected parameters.
	function updateFilter(key: "project" | "range", value: string) {
		const params = new URLSearchParams(searchParams.toString());
		if (key === "project" && value === "all") {
			params.delete("project");
		} else {
			params.set(key, value);
		}

		startTransition(() => {
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		});
	}

	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-2 shadow-xs">
			{/* Project Filter */}
			<div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
				<span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
					Project:
				</span>
				<Select
					aria-label="Filter analytics by project"
					value={currentFilter.project}
					isDisabled={isPending || accessibleProjects.length === 0}
					onChange={(value) => {
						if (value !== null) updateFilter("project", String(value));
					}}
					className="min-w-0 flex-1 sm:w-64 sm:flex-initial"
				>
					<SelectTrigger className="bg-muted/40 hover:bg-muted/70">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem id="all">All accessible projects</SelectItem>
						{accessibleProjects.map((project) => (
							<SelectItem key={project.id} id={project.id}>
								{project.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Date Range Filter */}
			<div className="flex items-center gap-1 w-full sm:w-auto rounded-lg border border-border bg-muted/60 p-1 shrink-0">
				<span className="sr-only">Select date range</span>
				{DATE_RANGES.map((range) => {
					const isSelected = currentFilter.range === range.id;
					return (
						<button
							key={range.id}
							type="button"
							disabled={isPending}
							onClick={() => updateFilter("range", range.id)}
							aria-pressed={isSelected}
							className={cn(
								"flex-1 sm:flex-initial rounded-md px-2.5 sm:px-3 py-1.5 text-xs font-medium text-center transition-all",
								isSelected
									? "bg-card text-foreground shadow-2xs font-semibold"
									: "text-muted-foreground hover:text-foreground",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
								"disabled:cursor-not-allowed disabled:opacity-50",
							)}
						>
							<span className="sm:hidden">{range.shortLabel}</span>
							<span className="hidden sm:inline">{range.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
