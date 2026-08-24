"use client";

import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Layers,
	UserX,
} from "lucide-react";
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
import type { AttentionNeededItem } from "@/types/analytics";

interface AttentionNeededProps {
	items: AttentionNeededItem[];
}

export function AttentionNeeded({ items }: AttentionNeededProps) {
	function getIcon(type: AttentionNeededItem["type"]) {
		switch (type) {
			case "overdue":
				return <AlertTriangle className="size-3.5 text-rose-500 shrink-0" />;
			case "unassigned":
				return <UserX className="size-3.5 text-amber-500 shrink-0" />;
			case "stalled":
				return <Clock className="size-3.5 text-amber-500 shrink-0" />;
			case "high_backlog":
				return <Layers className="size-3.5 text-blue-500 shrink-0" />;
			default:
				return (
					<AlertCircle className="size-3.5 text-muted-foreground shrink-0" />
				);
		}
	}

	function getSeverityBadge(severity: AttentionNeededItem["severity"]) {
		switch (severity) {
			case "high":
				return (
					<Badge
						variant="destructive"
						className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-4"
					>
						High
					</Badge>
				);
			case "medium":
				return (
					<Badge
						variant="secondary"
						className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 h-4 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
					>
						Medium
					</Badge>
				);
			case "low":
				return (
					<Badge
						variant="outline"
						className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0 h-4 text-muted-foreground"
					>
						Info
					</Badge>
				);
		}
	}

	return (
		<Card className="rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
					<CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
						Attention Needed
					</CardTitle>
					<span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
						{items.length === 0
							? "All items on track"
							: `${items.length} item${items.length === 1 ? "" : "s"} requiring review`}
					</span>
				</div>
				<CardDescription className="text-[11px] sm:text-xs">
					Actionable operational items identified across active projects in
					scope
				</CardDescription>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-0">
				{items.length === 0 ? (
					<div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 sm:p-4 text-sm text-emerald-800 dark:text-emerald-300">
						<CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
						<div>
							<p className="font-medium text-xs sm:text-sm">
								No urgent issues detected
							</p>
							<p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
								All tasks and projects in scope have assigned members, active
								progress, and no overdue deadlines.
							</p>
						</div>
					</div>
				) : (
					<Table
						aria-label="Attention needed items"
						containerClassName="rounded-xl border border-border"
					>
						<TableHeader>
							<TableHead
								isRowHeader
								className="px-3 sm:px-4 text-xs w-28 sm:w-32"
							>
								Severity
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs w-44 sm:w-56">
								Item
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs">
								Description
							</TableHead>
						</TableHeader>
						<TableBody>
							{items.map((item) => (
								<TableRow key={item.id} id={item.id}>
									<TableCell className="px-3 sm:px-4 py-3 align-middle">
										<div className="flex items-center gap-2">
											{getIcon(item.type)}
											{getSeverityBadge(item.severity)}
										</div>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-3 align-middle">
										<span className="text-xs sm:text-sm font-semibold text-foreground">
											{item.title}
										</span>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-3 text-xs text-muted-foreground leading-relaxed">
										{item.description}
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
