"use client";

import type React from "react";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { useUIStore } from "@/stores/ui-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
	const navigationOpen = useUIStore((state) => state.sidebarOpen);
	const openNavigation = useUIStore((state) => state.openSidebar);
	const closeNavigation = useUIStore((state) => state.closeSidebar);

	return (
		<div className="min-h-screen">
			<Sidebar open={navigationOpen} onClose={closeNavigation} />

			<Header onOpenNavigation={openNavigation} />

			<main className="min-h-screen pt-17.5 lg:pl-20">{children}</main>
		</div>
	);
}
