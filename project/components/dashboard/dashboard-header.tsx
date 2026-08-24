interface DashboardHeaderProps {
	userDisplayName?: string | null;
}

export function DashboardHeader({ userDisplayName }: DashboardHeaderProps) {
	const greeting = userDisplayName
		? `Welcome back, ${userDisplayName}!`
		: "Welcome back!";

	const todayFormatted = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	return (
		<div className="border-b border-border pb-4">
			<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
				Dashboard
			</h1>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mt-1 text-xs sm:text-sm">
				<p className="text-muted-foreground">{greeting}</p>
				<p className="font-medium text-foreground sm:text-right">
					{todayFormatted}
				</p>
			</div>
		</div>
	);
}
