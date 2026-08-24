import { BarChart3, Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

export function AnalyticsEmptyState() {
	return (
		<Empty className="surface-card min-h-96 border border-border">
			<EmptyMedia variant="icon">
				<BarChart3 className="size-6 text-brand-primary" />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle>No accessible projects found</EmptyTitle>
				<EmptyDescription>
					You aren't a member of any active projects yet. Join an existing
					project or create a new one to start viewing the analytics.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Link
					href="/projects"
					className={cn(buttonVariants({ variant: "default" }), "gap-1.5")}
				>
					<Plus className="size-4" />
					Go to Projects
				</Link>
			</EmptyContent>
		</Empty>
	);
}
