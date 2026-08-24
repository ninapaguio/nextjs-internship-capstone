import { ArrowLeft, ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "403 - Access Forbidden",
	description: "You do not have permission to access this resource.",
};

// Renders the HTTP 403 Forbidden page 
export default function ForbiddenPage() {
	return (
		<div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center p-6 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center space-y-6">
				<div className="flex size-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs">
					<ShieldAlert className="size-8" />
				</div>

				<div className="space-y-2">
					<span className="text-xs font-bold tracking-widest text-amber-600 dark:text-amber-400 uppercase">
						403 Forbidden
					</span>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Access Denied
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
						You do not have permission to view or modify this resource. If you
						believe this is an error, please contact the project owner or
						workspace manager.
					</p>
				</div>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
					<Link
						href="/dashboard"
						className={cn(
							buttonVariants({ variant: "default", size: "default" }),
							"font-medium",
						)}
					>
						<ArrowLeft className="mr-2 size-4" />
						Back to Dashboard
					</Link>
					<Link
						href="/projects"
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"font-medium",
						)}
					>
						View Accessible Projects
					</Link>
				</div>
			</div>
		</div>
	);
}
