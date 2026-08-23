import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_COLUMNS = [
	{ id: "col-backlog", taskIds: ["t1", "t2", "t3"] },
	{ id: "col-todo", taskIds: ["t1", "t2"] },
	{ id: "col-progress", taskIds: ["t1", "t2", "t3"] },
	{ id: "col-review", taskIds: ["t1", "t2"] },
	{ id: "col-done", taskIds: ["t1"] },
] as const;

// Renders the skeleton loading state mirroring the Kanban board page structure.
export default function ProjectBoardLoading() {
	return (
		<section
			className="flex min-h-[calc(100dvh-5rem)] flex-col"
			aria-label="Loading project board"
		>
			{/* Project Board Header Skeleton */}
			<header className="flex min-h-14 flex-col justify-center gap-3 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 items-center gap-3">
					<div className="inline-flex min-w-0 items-center gap-1.5">
						<Skeleton className="size-3.5 rounded-md shrink-0" />
						<Skeleton className="h-5 w-44 rounded-md" />
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Skeleton className="h-8 w-28 rounded-lg" />
					<Skeleton className="h-8 w-24 rounded-lg" />
				</div>
			</header>

			{/* Interactive Kanban Board Workspace Skeleton */}
			<div className="flex-1 py-5">
				{/* Top Board Toolbar */}
				<div className="mb-5 flex w-full items-center justify-end gap-2.5">
					<Skeleton className="h-9 min-w-0 flex-1 rounded-2xl sm:max-w-64" />
					<Skeleton className="size-8 rounded-xl shrink-0" />
					<Skeleton className="size-8 rounded-full shrink-0" />
				</div>

				{/* Kanban Columns Grid Skeleton */}
				<div className="scrollbar-thin grid grid-flow-col auto-cols-[minmax(18rem,1fr)] sm:auto-cols-[minmax(20rem,1fr)] lg:auto-cols-[minmax(21rem,1fr)] gap-4 overflow-x-auto overscroll-x-contain pb-4 w-full">
					{SKELETON_COLUMNS.map((column) => (
						<section
							key={column.id}
							className="group/column flex h-[clamp(28rem,calc(100dvh-17rem),46rem)] min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-muted/70 p-2.5 transition-colors dark:border-border dark:bg-muted/60"
						>
							{/* Column Header */}
							<header className="shrink-0 px-1.5 pt-1.5 pb-3">
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<Skeleton className="h-4.5 w-24 rounded-md" />
										<Skeleton className="h-5 w-6 rounded-full" />
									</div>
									<div className="flex items-center gap-1">
										<Skeleton className="size-7 rounded-xl" />
										<Skeleton className="size-7 rounded-xl" />
									</div>
								</div>
							</header>

							{/* Task Cards List */}
							<div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain pr-1 scrollbar-gutter-stable">
								{column.taskIds.map((taskId) => (
									<article
										key={`${column.id}-${taskId}`}
										className="relative isolate flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-3.5 text-left shadow-2xs"
									>
										{/* Task Top Meta */}
										<div className="flex items-start justify-between gap-3 pr-7">
											<div className="flex min-w-0 items-center gap-2">
												<Skeleton className="size-3.5 rounded-md" />
												<Skeleton className="h-3 w-16 rounded-md" />
											</div>
										</div>

										{/* Action More Button Top-Right */}
										<div className="absolute top-2 right-2 flex flex-col items-center gap-0.5">
											<Skeleton className="size-6 rounded-lg" />
										</div>

										{/* Task Title & Description */}
										<div className="mt-3 flex flex-col pr-5">
											<Skeleton className="h-4 w-4/5 rounded-md" />
											<Skeleton className="mt-1.5 h-3 w-full rounded-md" />
											<Skeleton className="mt-1 h-3 w-2/3 rounded-md" />
										</div>

										{/* Task Footer */}
										<div className="mt-4 flex w-full items-end justify-between gap-3 text-left">
											<div className="flex min-w-0 flex-wrap items-center gap-2">
												<Skeleton className="h-5 w-14 rounded-full" />
												<Skeleton className="h-3.5 w-8 rounded-md" />
											</div>
											<div className="flex -space-x-1.5">
												<Skeleton className="size-5 rounded-full ring-2 ring-card" />
												<Skeleton className="size-5 rounded-full ring-2 ring-card" />
											</div>
										</div>
									</article>
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</section>
	);
}
