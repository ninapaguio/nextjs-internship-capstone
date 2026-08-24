import { ArrowLeft, Lock, LogIn } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "401 - Unauthorized",
	description: "Authentication is required to access this resource.",
};

// Renders the HTTP 401 Unauthorized page
export default function UnauthorizedPage() {
	return (
		<div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center p-6 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center space-y-6">
				<div className="flex size-16 items-center justify-center rounded-2xl border border-brand-primary/30 bg-brand-primary/10 text-brand-primary dark:text-brand-cyan shadow-xs">
					<Lock className="size-8" />
				</div>

				<div className="space-y-2">
					<span className="text-xs font-bold tracking-widest text-brand-primary dark:text-brand-cyan uppercase">
						401 Unauthorized
					</span>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Authentication Required
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
						Please sign in to your EverFlow account to access this page or
						resource.
					</p>
				</div>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
					<Link
						href="/sign-in"
						className={cn(
							buttonVariants({ variant: "default", size: "default" }),
							"font-medium",
						)}
					>
						<LogIn className="mr-2 size-4" />
						Sign In to EverFlow
					</Link>
					<Link
						href="/"
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"font-medium",
						)}
					>
						<ArrowLeft className="mr-2 size-4" />
						Return to Home
					</Link>
				</div>
			</div>
		</div>
	);
}
