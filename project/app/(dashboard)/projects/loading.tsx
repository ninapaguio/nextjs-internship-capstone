import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_PROJECT_IDS = [
	"proj-1",
	"proj-2",
	"proj-3",
	"proj-4",
	"proj-5",
	"proj-6",
] as const;

// Renders the skeleton loading state mirroring the projects page structure.
export default function ProjectsLoading() {
	return (
		<section
			className="flex min-h-[calc(100dvh-5rem)] flex-col"
			aria-label="Loading projects"
		>
			{/* Projects Header Skeleton */}
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<Skeleton className="h-8 w-32 rounded-xl sm:h-9 sm:w-36" />

				<div className="flex items-center gap-2.5">
					<Skeleton className="h-8.5 w-48 rounded-xl sm:w-56" />
					<Skeleton className="h-8 w-28 rounded-lg" />
				</div>
			</header>

			{/* Project Cards Grid Skeleton */}
			<div className="flex-1 py-5">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{SKELETON_PROJECT_IDS.map((id) => (
						<div key={id} className="group relative rounded-2xl outline-none">
							<Card
								size="sm"
								className="relative z-20 h-full gap-0 rounded-2xl bg-card py-0 shadow-2xs ring-1 ring-border"
							>
								<CardHeader className="gap-3 px-4 pt-4 pb-3">
									<div className="flex items-center justify-between gap-3">
										<CardTitle className="line-clamp-1 text-sm font-semibold tracking-tight flex-1">
											<Skeleton className="h-4.5 w-3/4 rounded-md" />
										</CardTitle>
										<div className="flex items-center gap-1.5 shrink-0">
											<Skeleton className="size-3 rounded-full" />
											<Skeleton className="h-3.5 w-16 rounded-md" />
										</div>
									</div>
									<div className="space-y-2">
										<CardDescription className="line-clamp-2 min-h-9 text-xs leading-4.5 space-y-1.5">
											<Skeleton className="h-3 w-full rounded-md" />
											<Skeleton className="h-3 w-4/5 rounded-md" />
										</CardDescription>
										<div className="flex items-center gap-1.5">
											<Skeleton className="h-5 w-20 rounded-full" />
										</div>
									</div>
								</CardHeader>

								<CardContent className="space-y-3 px-4 pb-4">
									<div className="flex items-center justify-between text-xs">
										<div className="flex items-center gap-1.5">
											<Skeleton className="size-3.5 rounded-md" />
											<Skeleton className="h-3.5 w-16 rounded-md" />
										</div>
										<div className="flex items-center gap-1.5">
											<Skeleton className="size-3.5 rounded-md" />
											<Skeleton className="h-3.5 w-14 rounded-md" />
										</div>
									</div>

									<div className="space-y-1.5">
										<div className="flex items-center justify-between text-xs">
											<Skeleton className="h-3 w-14 rounded-md" />
											<Skeleton className="h-3 w-8 rounded-md" />
										</div>
										<Skeleton className="h-2 w-full rounded-full" />
									</div>
								</CardContent>
							</Card>
						</div>
					))}
				</div>
			</div>

			{/* Pagination Footer Skeleton */}
			<footer className="flex items-center justify-between gap-4 border-t pt-3">
				<Skeleton className="h-4 w-20 rounded-md" />
				<div className="flex items-center rounded-lg border bg-background shadow-xs overflow-hidden">
					<Skeleton className="h-7 w-16 rounded-none" />
					<Skeleton className="h-7 w-28 border-x rounded-none" />
					<Skeleton className="h-7 w-16 rounded-none" />
				</div>
			</footer>
		</section>
	);
}
