"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorPageProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function RootErrorPage({ error, reset }: ErrorPageProps) {
	useEffect(() => {
		console.error("root_application_error", {
			message: error.message,
			digest: error.digest,
		});
	}, [error]);

	return (
		<div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center p-6 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center space-y-6">
				<div className="space-y-2">
					<span className="text-xs font-bold tracking-widest text-destructive uppercase">
						500 Application Error
					</span>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
						Something Went Wrong
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
						An unexpected error occurred while processing your request. Our team
						has been notified.
					</p>
					{error.digest ? (
						<p className="text-[11px] font-mono text-muted-foreground/60">
							Error Digest: {error.digest}
						</p>
					) : null}
				</div>

				<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
					<Button onClick={() => reset()} className="font-medium">
						<RefreshCw className="mr-2 size-4" />
						Try Again
					</Button>
					<Link
						href="/dashboard"
						className={cn(
							buttonVariants({ variant: "outline", size: "default" }),
							"font-medium",
						)}
					>
						<ArrowLeft className="mr-2 size-4" />
						Back to Dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}
