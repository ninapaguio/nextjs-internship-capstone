import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_TEAM_IDS = [
	"team-1",
	"team-2",
	"team-3",
	"team-4",
	"team-5",
	"team-6",
] as const;

// Renders the skeleton loading state mirroring the team list page structure.
export default function TeamListLoading() {
	return (
		<section
			className="flex min-h-[calc(100dvh-5rem)] flex-col"
			aria-label="Loading teams"
		>
			{/* Team List Header Skeleton */}
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-8 w-24 rounded-xl sm:h-9 sm:w-28" />
				<Skeleton className="h-8.5 w-48 rounded-xl sm:w-56" />
			</header>

			{/* Team Cards Grid Skeleton */}
			<div className="flex-1 py-5">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{SKELETON_TEAM_IDS.map((id) => (
						<div key={id} className="group relative rounded-2xl outline-none">
							<Card
								size="sm"
								className="relative z-20 h-full gap-0 rounded-2xl bg-card py-0 shadow-2xs ring-1 ring-border"
							>
								<CardHeader className="gap-3 px-4 pt-4 pb-3">
									<div className="flex items-center justify-between gap-3">
										<div className="flex min-w-0 items-center gap-2.5 flex-1">
											<Skeleton className="size-8 rounded-full shrink-0" />
											<CardTitle className="line-clamp-1 text-sm font-semibold tracking-tight flex-1">
												<Skeleton className="h-4 w-32 rounded-md" />
											</CardTitle>
										</div>
										<Skeleton className="h-5 w-16 rounded-full shrink-0" />
									</div>
								</CardHeader>

								<CardContent className="px-4 pb-4">
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<div className="flex items-center gap-1.5">
											<Skeleton className="size-3.5 rounded-md" />
											<Skeleton className="h-3.5 w-16 rounded-md" />
										</div>
										<Skeleton className="h-3 w-16 rounded-md" />
									</div>
								</CardContent>
							</Card>
						</div>
					))}
				</div>
			</div>

			{/* Footer Skeleton */}
			<footer className="flex items-center justify-between gap-4 border-t pt-3">
				<Skeleton className="h-4 w-16 rounded-md" />
			</footer>
		</section>
	);
}
