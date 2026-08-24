import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-8 w-44 rounded-lg" />
					<Skeleton className="h-4 w-72 rounded-lg" />
				</div>
				<div className="flex items-center gap-3">
					<Skeleton className="h-9 w-44 rounded-lg" />
					<Skeleton className="h-9 w-56 rounded-lg" />
				</div>
			</div>

			{/* Summary Metric Cards Skeleton */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
				{[
					"metric-1",
					"metric-2",
					"metric-3",
					"metric-4",
					"metric-5",
					"metric-6",
				].map((metricKey) => (
					<div
						key={metricKey}
						className="rounded-3xl border border-border bg-card p-5 space-y-3"
					>
						<div className="flex items-center justify-between">
							<Skeleton className="h-4 w-20 rounded-md" />
							<Skeleton className="size-8 rounded-lg" />
						</div>
						<Skeleton className="h-7 w-16 rounded-md" />
						<Skeleton className="h-3 w-28 rounded-md" />
					</div>
				))}
			</div>

			{/* Attention Needed Skeleton */}
			<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
				<div className="space-y-1">
					<Skeleton className="h-5 w-36 rounded-md" />
					<Skeleton className="h-3 w-64 rounded-md" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Skeleton className="h-20 rounded-xl" />
					<Skeleton className="h-20 rounded-xl" />
				</div>
			</div>

			{/* Charts Grid Skeleton */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
					<div className="space-y-1">
						<Skeleton className="h-5 w-44 rounded-md" />
						<Skeleton className="h-3 w-64 rounded-md" />
					</div>
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
				<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
					<div className="space-y-1">
						<Skeleton className="h-5 w-44 rounded-md" />
						<Skeleton className="h-3 w-64 rounded-md" />
					</div>
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</div>

			{/* Progress Grid Skeleton */}
			<div className="rounded-3xl border border-border bg-card p-5 space-y-4">
				<div className="space-y-1">
					<Skeleton className="h-5 w-36 rounded-md" />
					<Skeleton className="h-3 w-64 rounded-md" />
				</div>
				<div className="space-y-3">
					<Skeleton className="h-16 w-full rounded-xl" />
					<Skeleton className="h-16 w-full rounded-xl" />
				</div>
			</div>
		</div>
	);
}
