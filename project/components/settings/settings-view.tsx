"use client";

import { Palette, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { AppearanceSettingsCard } from "@/components/settings/appearance-settings-card";
import {
	ProfileSettingsCard,
	type SettingsProfile,
} from "@/components/settings/profile-settings-card";
import { SecuritySettingsCard } from "@/components/settings/security-settings-card";
import { SettingsHeader } from "@/components/settings/settings-header";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "appearance";

interface SettingsViewProps {
	profile: SettingsProfile;
}

const SETTINGS_TABS = [
	{
		id: "profile" as const,
		label: "Personal Profile",
		description: "Name, email & identity",
		icon: User,
	},
	{
		id: "security" as const,
		label: "Account & Security",
		description: "Password, MFA & sessions",
		icon: ShieldCheck,
	},
	{
		id: "appearance" as const,
		label: "Appearance & Theme",
		description: "Light and dark mode",
		icon: Palette,
	},
];

export function SettingsView({ profile }: SettingsViewProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

	return (
		<div className="w-full space-y-6">
			<SettingsHeader />

			<div className="flex flex-col md:flex-row items-start gap-6 lg:gap-8 w-full">
				{/* Settings Sidebar Nav */}
				<nav
					aria-label="Settings navigation"
					className="w-full md:w-60 lg:w-64 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0"
				>
					{SETTINGS_TABS.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;

						return (
							<button
								type="button"
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								aria-pressed={isActive}
								className={cn(
									"flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer shrink-0 md:shrink select-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
									isActive
										? "bg-card border border-border shadow-xs text-foreground font-semibold"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent",
								)}
							>
								<div
									className={cn(
										"size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
										isActive
											? "bg-brand-primary text-white"
											: "bg-muted text-muted-foreground",
									)}
								>
									<Icon className="size-4" />
								</div>

								<div className="hidden sm:block min-w-0">
									<p className="text-xs sm:text-sm font-medium leading-tight truncate">
										{tab.label}
									</p>
									<p className="text-[10px] text-muted-foreground leading-tight hidden lg:block truncate mt-0.5">
										{tab.description}
									</p>
								</div>

								{/* Mobile text fallback */}
								<span className="text-xs sm:hidden font-medium">
									{tab.label}
								</span>
							</button>
						);
					})}
				</nav>

				{/* Active Settings Content Pane */}
				<section
					className="flex-1 w-full min-w-0"
					aria-label={`${SETTINGS_TABS.find((tab) => tab.id === activeTab)?.label} settings`}
				>
					{activeTab === "profile" && <ProfileSettingsCard profile={profile} />}
					{activeTab === "security" && <SecuritySettingsCard />}
					{activeTab === "appearance" && <AppearanceSettingsCard />}
				</section>
			</div>
		</div>
	);
}
