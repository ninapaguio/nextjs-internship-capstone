import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
	return (
		<div className="w-full space-y-6">
			<div className="border-b border-border pb-4 space-y-2">
				<Skeleton className="h-8 w-36 rounded-lg" />
				<Skeleton className="h-4 w-72 rounded-md" />
			</div>

			<div className="flex flex-col md:flex-row items-start gap-6 lg:gap-8 w-full">
				{/* Sidebar */}
				<div className="w-full md:w-60 lg:w-64 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
					<Skeleton className="h-12 w-full rounded-xl" />
				</div>

				{/* Content Pane */}
				<div className="flex-1 w-full min-w-0">
					<Card className="rounded-2xl border-border bg-card shadow-xs">
						<CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
							<div className="flex items-center justify-between">
								<Skeleton className="h-6 w-44 rounded-md" />
								<Skeleton className="h-5 w-24 rounded-full" />
							</div>
						</CardHeader>
						<CardContent className="p-4 sm:p-6 space-y-6">
							<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
								<Skeleton className="size-16 rounded-full" />
								<div className="space-y-2 flex-1">
									<Skeleton className="h-5 w-40 rounded-md" />
									<Skeleton className="h-4 w-56 rounded-md" />
								</div>
								<Skeleton className="h-8 w-28 rounded-lg" />
							</div>
							<Skeleton className="h-40 w-full rounded-xl" />
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
