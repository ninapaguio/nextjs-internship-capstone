import { ArrowLeft, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "404 - Page Not Found",
	description: "The requested page could not be found.",
};

// Renders the HTTP 404 Not Found page.
export default function NotFoundPage() {
	return (
		<div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center p-6 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center space-y-6">
				<div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted/30 text-muted-foreground shadow-xs">
					<Compass className="size-8 text-brand-primary dark:text-brand-cyan" />
				</div>

				<div className="space-y-2">
					<span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
						404 Not Found
					</span>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Page Not Found
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
						The page or resource you are looking for might have been moved,
						deleted, or does not exist.
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
						href="/"
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"font-medium",
						)}
					>
						Visit Homepage
					</Link>
				</div>
			</div>
		</div>
	);
}
