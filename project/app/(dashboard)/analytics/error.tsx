"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AnalyticsErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function AnalyticsError({ error, reset }: AnalyticsErrorProps) {
	useEffect(() => {
		// Log structured error without leaking database connection details or secrets
		console.error("Analytics page error boundary caught error:", error.message);
	}, [error]);

	return (
		<div className="flex min-h-[60vh] items-center justify-center p-4">
			<Card className="max-w-md w-full border-border/80 shadow-md">
				<CardContent className="p-8 text-center space-y-4">
					<div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
						<AlertTriangle className="size-6" />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-foreground">
							Failed to load analytics
						</h2>
						<p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
							We encountered a problem while calculating metrics for your
							accessible projects. Please try refreshing or reloading the data.
						</p>
					</div>
					<div className="pt-2 flex justify-center">
						<Button onClick={() => reset()} className="gap-2">
							<RotateCcw className="size-4" />
							Try again
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
