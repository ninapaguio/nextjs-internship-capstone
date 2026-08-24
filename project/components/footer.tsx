import Image from "next/image";

export function Footer() {
	return (
		<footer className="border-t border-border/70">
			<div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm lg:px-8">
				<div className="flex items-center justify-center gap-2 sm:justify-start">
					<Image
						src="/ef-logo.png"
						alt="EverFlow Logo"
						width={24}
						height={24}
						className="size-6 object-contain"
					/>
					<span className="font-semibold text-foreground">EverFlow</span>
				</div>
				<p className="text-center sm:text-left">
					© 2026 EverFlow. Work in flow.
				</p>
			</div>
		</footer>
	);
}
