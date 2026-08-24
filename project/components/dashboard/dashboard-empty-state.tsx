import { FolderKanban } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export function DashboardEmptyState() {
	return (
		<Empty className="rounded-3xl border border-dashed border-border bg-card/50 p-8 sm:p-12">
			<EmptyMedia variant="icon">
				<FolderKanban className="size-6 text-brand-primary" />
			</EmptyMedia>
			<EmptyHeader>
				<EmptyTitle className="text-lg sm:text-xl">
					No accessible projects yet
				</EmptyTitle>
				<EmptyDescription className="max-w-md text-xs sm:text-sm">
					Create a project from the Projects page, or ask a team owner or
					manager to invite you to an existing workspace.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
