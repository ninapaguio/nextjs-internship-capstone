"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function DashboardError({ reset }: DashboardErrorProps) {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 space-y-4">
			<div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
				<AlertTriangle className="size-6" />
			</div>

			<div className="space-y-1 max-w-md">
				<h2 className="text-xl font-bold tracking-tight text-foreground">
					Unable to load dashboard
				</h2>
				<p className="text-sm text-muted-foreground">
					An error occurred while fetching your workspace data. Please try
					again.
				</p>
			</div>

			<Button onClick={() => reset()} className="mt-2">
				<RefreshCw className="mr-2 size-4" /> Try again
			</Button>
		</div>
	);
}
