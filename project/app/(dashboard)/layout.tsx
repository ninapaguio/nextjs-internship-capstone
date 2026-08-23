import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import type React from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { getPusherPublicConfig } from "@/lib/realtime/pusher-server";

export default async function ProtectedDashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await auth.protect();
	const { userId: clerkId } = await auth();
	if (!clerkId) notFound();
	const applicationUser = await ensureApplicationUser(clerkId);
	if (!applicationUser) notFound();

	return (
		<DashboardShell
			applicationUserId={applicationUser.id}
			realtimeConfig={getPusherPublicConfig()}
		>
			{children}
		</DashboardShell>
	);
}
