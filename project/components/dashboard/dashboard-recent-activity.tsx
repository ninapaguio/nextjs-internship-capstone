"use client";

import { Clock } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { DashboardActivityItem } from "@/types/dashboard";

interface DashboardRecentActivityProps {
	activities: DashboardActivityItem[];
}

export function DashboardRecentActivity({
	activities,
}: DashboardRecentActivityProps) {
	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
					Recent Activity
				</CardTitle>
				<CardDescription className="text-[11px] sm:text-xs">
					Latest updates across your accessible active projects
				</CardDescription>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{activities.length === 0 ? (
					<div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4">
						<Clock className="size-8 text-muted-foreground/60 mb-2" />
						<p className="text-xs sm:text-sm font-medium text-foreground">
							No recent activity recorded
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							When team members create, move, or complete tasks, updates will
							appear here.
						</p>
					</div>
				) : (
					<Table
						aria-label="Recent activity"
						containerClassName="rounded-xl border border-border max-h-48 sm:max-h-52 scrollbar-thin"
					>
						<TableHeader>
							<TableHead
								isRowHeader
								className="px-3 sm:px-4 text-xs w-36 sm:w-44"
							>
								Member
							</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs">Activity</TableHead>
							<TableHead className="px-3 sm:px-4 text-xs text-right w-20 sm:w-24">
								Time
							</TableHead>
						</TableHeader>
						<TableBody>
							{activities.map((item) => (
								<TableRow key={item.id} id={item.id}>
									<TableCell className="px-3 sm:px-4 py-2.5">
										<div className="flex items-center gap-2">
											<Avatar size="sm" className="size-6 shrink-0">
												{item.actorAvatarUrl && (
													<AvatarImage
														src={item.actorAvatarUrl}
														alt={item.actorName}
													/>
												)}
												<AvatarFallback className="text-[10px]">
													{item.actorName.charAt(0).toUpperCase() || "U"}
												</AvatarFallback>
											</Avatar>
											<span className="text-xs font-semibold text-foreground truncate">
												{item.actorName}
											</span>
										</div>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-2.5">
										<div className="min-w-0 space-y-0.5">
											<p className="text-xs text-muted-foreground leading-snug">
												{item.description}
											</p>
											<div className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
												<Link
													href={item.href}
													className="font-medium text-foreground hover:text-brand-primary transition-colors truncate max-w-36 sm:max-w-xs"
												>
													{item.taskTitle}
												</Link>
												<span className="text-muted-foreground/60">•</span>
												<span className="text-muted-foreground/80 truncate max-w-28 sm:max-w-36">
													{item.projectName}
												</span>
											</div>
										</div>
									</TableCell>

									<TableCell className="px-3 sm:px-4 py-2.5 text-right align-middle">
										<span className="text-[10px] text-muted-foreground/80 whitespace-nowrap">
											{item.relativeTime}
										</span>
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
