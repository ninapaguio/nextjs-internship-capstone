"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppearanceSettingsCard() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Avoid hydration mismatch by waiting for client mount
	useEffect(() => {
		setMounted(true);
	}, []);

	const currentTheme = mounted ? theme : "light";

	const themes = [
		{
			id: "light",
			name: "Light Mode",
			description:
				"Bright and high-contrast workspace for well-lit environments.",
			icon: Sun,
			preview: (
				<div className="w-full h-24 rounded-lg bg-slate-50 border border-slate-200 p-2 flex gap-2 overflow-hidden select-none">
					<div className="w-8 h-full bg-slate-200/80 rounded flex flex-col gap-1 p-1">
						<div className="w-full h-1.5 bg-slate-300 rounded-xs" />
						<div className="w-full h-1.5 bg-slate-300 rounded-xs" />
						<div className="w-full h-1.5 bg-slate-300 rounded-xs" />
					</div>
					<div className="flex-1 flex flex-col gap-1.5">
						<div className="w-full h-2.5 bg-white border border-slate-200/80 rounded px-1 flex items-center justify-between">
							<div className="w-8 h-1 bg-slate-300 rounded-xs" />
							<div className="w-3 h-1 bg-teal-500 rounded-xs" />
						</div>
						<div className="grid grid-cols-2 gap-1 flex-1">
							<div className="bg-white border border-slate-200/80 rounded p-1 flex flex-col gap-1">
								<div className="w-6 h-1 bg-slate-300 rounded-xs" />
								<div className="w-10 h-1 bg-slate-200 rounded-xs" />
							</div>
							<div className="bg-white border border-slate-200/80 rounded p-1 flex flex-col gap-1">
								<div className="w-6 h-1 bg-slate-300 rounded-xs" />
								<div className="w-10 h-1 bg-slate-200 rounded-xs" />
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			id: "dark",
			name: "Dark Mode",
			description: "Deep charcoal surfaces engineered for reduced eye fatigue.",
			icon: Moon,
			preview: (
				<div className="w-full h-24 rounded-lg bg-[#121214] border border-[#2A2A32] p-2 flex gap-2 overflow-hidden select-none">
					<div className="w-8 h-full bg-[#1A1A1E] rounded flex flex-col gap-1 p-1 border border-[#2A2A32]/60">
						<div className="w-full h-1.5 bg-zinc-700 rounded-xs" />
						<div className="w-full h-1.5 bg-zinc-700 rounded-xs" />
						<div className="w-full h-1.5 bg-zinc-700 rounded-xs" />
					</div>
					<div className="flex-1 flex flex-col gap-1.5">
						<div className="w-full h-2.5 bg-[#1A1A1E] border border-[#2A2A32] rounded px-1 flex items-center justify-between">
							<div className="w-8 h-1 bg-zinc-600 rounded-xs" />
							<div className="w-3 h-1 bg-teal-400 rounded-xs" />
						</div>
						<div className="grid grid-cols-2 gap-1 flex-1">
							<div className="bg-[#1A1A1E] border border-[#2A2A32] rounded p-1 flex flex-col gap-1">
								<div className="w-6 h-1 bg-zinc-600 rounded-xs" />
								<div className="w-10 h-1 bg-zinc-700 rounded-xs" />
							</div>
							<div className="bg-[#1A1A1E] border border-[#2A2A32] rounded p-1 flex flex-col gap-1">
								<div className="w-6 h-1 bg-zinc-600 rounded-xs" />
								<div className="w-10 h-1 bg-zinc-700 rounded-xs" />
							</div>
						</div>
					</div>
				</div>
			),
		},
	];

	return (
		<Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
			<CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<CardTitle className="text-base sm:text-lg font-semibold text-foreground">
							Appearance & Theme
						</CardTitle>
						<CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
							Customize your visual workspace display theme.
						</CardDescription>
					</div>
					<Badge
						variant="secondary"
						className="w-fit text-[10px] sm:text-xs font-medium border-border/60 capitalize"
					>
						{currentTheme} Active
					</Badge>
				</div>
			</CardHeader>

			<CardContent className="p-4 sm:p-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{themes.map((item) => {
						const Icon = item.icon;
						const isSelected = currentTheme === item.id;

						return (
							<button
								type="button"
								key={item.id}
								onClick={() => setTheme(item.id)}
								aria-pressed={isSelected}
								className={cn(
									"group relative flex flex-col text-left p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
									isSelected
										? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/20"
										: "border-border bg-muted/20 hover:bg-muted/35 hover:border-border/80",
								)}
							>
								{/* Visual Mini Mockup */}
								<div className="w-full mb-3 rounded-lg overflow-hidden transition-transform duration-200 group-hover:scale-[1.01]">
									{item.preview}
								</div>

								{/* Header & Radio indicator */}
								<div className="flex items-center justify-between w-full mb-1">
									<div className="flex items-center gap-2">
										<Icon className="size-4 text-brand-primary dark:text-brand-cyan" />
										<span className="text-xs sm:text-sm font-semibold text-foreground">
											{item.name}
										</span>
									</div>

									{isSelected ? (
										<div className="size-5 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-xs">
											<Check className="size-3 stroke-3" />
										</div>
									) : (
										<div className="size-5 rounded-full border border-border group-hover:border-foreground/40" />
									)}
								</div>

								<p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
									{item.description}
								</p>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
