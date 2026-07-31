import { auth } from "@clerk/nextjs/server";
import type React from "react";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function ProtectedDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await auth.protect();

	return <DashboardShell>{children}</DashboardShell>;
}
