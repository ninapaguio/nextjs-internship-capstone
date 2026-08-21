import { Calendar, MoreHorizontal, Settings, Users } from "lucide-react";

// Renders the project workspace header showing summary metrics and project details.
export function ProjectHeader({ projectId }: { projectId: string }) {
	return (
		<div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<div className="flex items-center space-x-3 mb-2">
						<div className="w-3 h-3 bg-brand_teal-500 rounded-full shadow-xs" />
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Website Redesign
						</h1>
					</div>

					<p className="text-muted-foreground mb-4 text-sm">
						Complete overhaul of company website with modern design and improved
						user experience
					</p>

					<div className="flex items-center space-x-6 text-sm text-muted-foreground">
						<div className="flex items-center">
							<Users size={16} className="mr-2 text-brand_teal-600 dark:text-brand_mint-400" />5 members
						</div>
						<div className="flex items-center">
							<Calendar size={16} className="mr-2 text-brand_teal-600 dark:text-brand_mint-400" />
							Due Feb 15, 2024
						</div>
						<div className="flex items-center">
							<div className="w-2 h-2 bg-brand_mint-500 rounded-full mr-2 shadow-xs" />
							75% complete
						</div>
					</div>
				</div>

				<div className="flex items-center space-x-2">
					<button type="button" aria-label="Settings" className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors">
						<Settings size={20} />
					</button>
					<button type="button" aria-label="More options" className="p-2 hover:bg-accent rounded-xl text-muted-foreground hover:text-foreground transition-colors">
						<MoreHorizontal size={20} />
					</button>
				</div>
			</div>
		</div>
	);
}
