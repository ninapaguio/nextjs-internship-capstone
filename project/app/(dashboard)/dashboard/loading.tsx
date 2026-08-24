import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
	return (
		<div className="space-y-4 sm:space-y-6">
			<div className="border-b border-border pb-4">
				<Skeleton className="h-8 w-44 rounded-lg" />
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-1.5">
					<Skeleton className="h-4 w-48 rounded-md" />
					<Skeleton className="h-4 w-40 rounded-md" />
				</div>
			</div>

			{/* Summary Metric Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
				<Skeleton className="h-28 rounded-2xl sm:rounded-3xl" />
				<Skeleton className="h-28 rounded-2xl sm:rounded-3xl" />
				<Skeleton className="h-28 rounded-2xl sm:rounded-3xl" />
				<Skeleton className="h-28 rounded-2xl sm:rounded-3xl" />
			</div>

			{/* My Tasks & Project Progress Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
				<Card className="rounded-2xl sm:rounded-3xl">
					<CardHeader className="p-4 sm:p-6 pb-2">
						<Skeleton className="h-5 w-32 rounded-md" />
						<Skeleton className="h-3 w-48 rounded-md" />
					</CardHeader>
					<CardContent className="p-4 sm:p-6 pt-1 space-y-2.5">
						<Skeleton className="h-14 rounded-xl w-full" />
						<Skeleton className="h-14 rounded-xl w-full" />
						<Skeleton className="h-14 rounded-xl w-full" />
					</CardContent>
				</Card>

				<Card className="rounded-2xl sm:rounded-3xl">
					<CardHeader className="p-4 sm:p-6 pb-2">
						<Skeleton className="h-5 w-32 rounded-md" />
						<Skeleton className="h-3 w-48 rounded-md" />
					</CardHeader>
					<CardContent className="p-4 sm:p-6 pt-1 space-y-2.5">
						<Skeleton className="h-14 rounded-xl w-full" />
						<Skeleton className="h-14 rounded-xl w-full" />
						<Skeleton className="h-14 rounded-xl w-full" />
					</CardContent>
				</Card>
			</div>

			{/* Recent Activity */}
			<Card className="rounded-2xl sm:rounded-3xl">
				<CardHeader className="p-4 sm:p-6 pb-2">
					<Skeleton className="h-5 w-36 rounded-md" />
					<Skeleton className="h-3 w-48 rounded-md" />
				</CardHeader>
				<CardContent className="p-4 sm:p-6 pt-1 space-y-2.5">
					<Skeleton className="h-12 rounded-xl w-full" />
					<Skeleton className="h-12 rounded-xl w-full" />
				</CardContent>
			</Card>
		</div>
	);
}
