"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

const SKELETON_MEMBER_IDS = [
	"member-1",
	"member-2",
	"member-3",
	"member-4",
] as const;

// Renders the skeleton loading state mirroring the team details page structure.
export default function TeamDetailLoading() {
	return (
		<section
			className="flex min-h-[calc(100dvh-5rem)] flex-col"
			aria-label="Loading team details"
		>
			{/* Team Detail Header Skeleton */}
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<div className="inline-flex min-w-0 items-center gap-1.5">
						<Skeleton className="size-3.5 rounded-md shrink-0" />
						<Skeleton className="h-5 w-36 rounded-md" />
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Skeleton className="h-8 w-24 rounded-lg" />
					<Skeleton className="h-8 w-28 rounded-lg" />
					<Skeleton className="h-8 w-24 rounded-lg" />
				</div>
			</header>

			{/* Team Detail Content Skeleton */}
			<div className="flex-1 py-5 space-y-6">
				{/* Metrics Stat Cards Skeleton */}
				<div className="grid gap-4 sm:grid-cols-2">
					<Card
						size="sm"
						className="rounded-2xl border border-border bg-card shadow-2xs"
					>
						<CardContent className="flex items-center gap-3.5 p-4">
							<Skeleton className="size-10 rounded-xl shrink-0" />
							<div className="space-y-1.5">
								<Skeleton className="h-6 w-10 rounded-md" />
								<Skeleton className="h-3.5 w-24 rounded-md" />
							</div>
						</CardContent>
					</Card>
					<Card
						size="sm"
						className="rounded-2xl border border-border bg-card shadow-2xs"
					>
						<CardContent className="flex items-center gap-3.5 p-4">
							<Skeleton className="size-10 rounded-xl shrink-0" />
							<div className="space-y-1.5">
								<Skeleton className="h-6 w-10 rounded-md" />
								<Skeleton className="h-3.5 w-24 rounded-md" />
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Team Members Section Skeleton */}
				<section className="space-y-4" aria-label="Loading team members">
					<div>
						<Skeleton className="h-5 w-32 rounded-md" />
						<Skeleton className="mt-1 h-3.5 w-56 rounded-md" />
					</div>

					{/* Members Table Card Skeleton */}
					<div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
						<Table aria-label="Loading team members table">
							<TableHeader className="bg-muted/50">
								<TableHead className="px-5" isRowHeader>
									<Skeleton className="h-4 w-20 rounded-md" />
								</TableHead>
								<TableHead className="px-5">
									<Skeleton className="h-4 w-28 rounded-md" />
								</TableHead>
								<TableHead className="w-16 px-5 text-right">
									<div className="flex justify-end">
										<Skeleton className="h-4 w-14 rounded-md" />
									</div>
								</TableHead>
							</TableHeader>
							<TableBody>
								{SKELETON_MEMBER_IDS.map((id) => (
									<TableRow key={id}>
										<TableCell className="px-5 py-4">
											<div className="flex min-w-56 items-center gap-3">
												<Skeleton className="size-10 rounded-full shrink-0" />
												<div className="space-y-1.5 min-w-0 flex-1">
													<Skeleton className="h-4 w-32 rounded-md" />
													<Skeleton className="h-3 w-44 rounded-md" />
												</div>
											</div>
										</TableCell>
										<TableCell className="px-5 py-4">
											<Skeleton className="h-5 w-24 rounded-full" />
										</TableCell>
										<TableCell className="px-5 py-4 text-right">
											<div className="flex justify-end">
												<Skeleton className="size-8 rounded-lg shrink-0" />
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</section>
			</div>
		</section>
	);
}
