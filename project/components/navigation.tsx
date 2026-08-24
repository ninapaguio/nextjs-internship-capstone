"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NotificationPanel } from "@/components/notification-panel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectRealtimeConfig } from "@/lib/realtime/project-board";

interface HeaderProps {
	sidebarOpen: boolean;
	onToggleNavigation: () => void;
	applicationUserId: string;
	realtimeConfig: ProjectRealtimeConfig | null;
}

// Displays global actions and the single control for opening or closing navigation.
export function Header({
	sidebarOpen,
	onToggleNavigation,
	applicationUserId,
	realtimeConfig,
}: HeaderProps) {
	return (
		<header className="pointer-events-none fixed inset-x-0 top-0 z-60 flex h-16 items-center justify-between pr-4 sm:pr-6">
			<div
				className={`pointer-events-auto flex h-11 w-62 items-center bg-muted/95 pr-3 backdrop-blur transition-[margin,border-radius,box-shadow] duration-200 
					${
						sidebarOpen
							? "rounded-r-full"
							: "ml-4 rounded-full border shadow-lg shadow-black/5"
					}`}
			>
				<Link href="/dashboard" className="flex min-w-0 flex-1 items-center">
					<span className="flex w-18 shrink-0 items-center justify-center">
						<Image
							src="/ef-logo.png"
							alt=""
							width={40}
							height={40}
							className="size-10 object-contain"
							priority
						/>
					</span>
					<span className="truncate text-lg font-semibold tracking-tight">
						EverFlow
					</span>
				</Link>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
						onPress={onToggleNavigation}
						className="rounded-lg"
					>
						{sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
					</Button>
					<Tooltip placement="bottom">
						{sidebarOpen ? "Close sidebar" : "Open sidebar"}
					</Tooltip>
				</TooltipTrigger>
			</div>

			<NotificationPanel
				applicationUserId={applicationUserId}
				realtimeConfig={realtimeConfig}
			/>
		</header>
	);
}
