"use client";

import type React from "react";
import { Header } from "@/components/navigation";
import { Sidebar } from "@/components/sidebar";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";
import { useUIStore } from "@/stores/ui-store";

interface DashboardShellProps {
	children: React.ReactNode;
	applicationUserId: string;
	realtimeConfig: ProjectRealtimeConfig | null;
}

// Renders the shared dashboard around protected pages.
export function DashboardShell({
	children,
	applicationUserId,
	realtimeConfig,
}: DashboardShellProps) {
	const openNavigation = useUIStore((state) => state.sidebarOpen);
	const toggleNavigation = useUIStore((state) => state.toggleSidebar);
	const closeNavigation = useUIStore((state) => state.closeSidebar);

	return (
		<div className="min-h-screen bg-background">
			<Sidebar open={openNavigation} onClose={closeNavigation} />

			<Header
				sidebarOpen={openNavigation}
				onToggleNavigation={toggleNavigation}
				applicationUserId={applicationUserId}
				realtimeConfig={realtimeConfig}
			/>

			<main
				className={`min-h-screen pt-20 transition-[padding] duration-200 ease-out ${openNavigation ? "lg:pl-18" : "lg:pl-0"}`}
			>
				<div className="min-h-[calc(100dvh-5rem)] px-4 pb-4 sm:px-8 lg:px-10">
					{children}
				</div>
			</main>
		</div>
	);
}
