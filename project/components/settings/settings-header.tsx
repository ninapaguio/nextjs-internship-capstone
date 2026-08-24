interface SettingsHeaderProps {
	title?: string;
	description?: string;
}

// Renders the standard header for the settings workspace page.
export function SettingsHeader({
	title = "Settings",
	description = "Manage your EverFlow profile, account security, and appearance.",
}: SettingsHeaderProps) {
	return (
		<div className="border-b border-border pb-4">
			<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
				{title}
			</h1>
			<p className="text-xs sm:text-sm text-muted-foreground mt-1">
				{description}
			</p>
		</div>
	);
}
