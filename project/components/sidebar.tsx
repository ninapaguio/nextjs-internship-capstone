"use client";

import { UserButton } from "@clerk/nextjs";
import {
	BarChart3,
	CalendarDays,
	FolderClosed,
	Gauge,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
	{ label: "Dashboard", href: "/dashboard", icon: Gauge },
	{ label: "Projects", href: "/projects", icon: FolderClosed },
	{ label: "Team", href: "/team", icon: Users },
	{ label: "Analytics", href: "/analytics", icon: BarChart3 },
	{ label: "Calendar", href: "/calendar", icon: CalendarDays },
];

type SidebarProps = {
	open: boolean;
	onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
	const pathname = usePathname();

	// Close the overlay drawer after navigation on small screen
	function handleNavigation() {
		if (window.matchMedia("(max-width: 1023px)").matches) onClose();
	}

	return (
		<>
			{open && (
				<button
					type="button"
					aria-label="Close navigation"
					className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs lg:hidden"
					onClick={onClose}
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 flex w-18 flex-col border-r bg-sidebar text-sidebar-foreground shadow-sm transition-transform duration-200 ease-out ${
					open ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="h-16 shrink-0" aria-hidden="true" />

				<nav aria-label="Dashboard navigation" className="px-1.5 py-2">
					<ul className="space-y-0.5">
						{navigation.map((item) => {
							const active =
								pathname === item.href ||
								(item.href !== "/dashboard" &&
									pathname.startsWith(`${item.href}/`));
							const Icon = item.icon;

							return (
								<li key={item.href}>
									<Link
										href={item.href}
										aria-current={active ? "page" : undefined}
										onClick={handleNavigation}
										className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-none transition-colors ${
											active
												? "bg-sidebar-accent text-sidebar-accent-foreground"
												: "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
										}`}
									>
										<Icon className="size-5" strokeWidth={1.8} />
										<span>{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="mt-auto space-y-0.5 px-1.5 pb-4">
					<div className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none text-sidebar-foreground/70">
						<ThemeToggle className="size-7 rounded-lg bg-transparent shadow-none hover:bg-sidebar-accent" />
						<span>Theme</span>
					</div>

					<Link
						href="/settings"
						onClick={handleNavigation}
						className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-none text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					>
						<Settings className="size-5" strokeWidth={1.8} />
						<span>Settings</span>
					</Link>

					<div className="flex justify-center pt-2">
						<UserButton
							appearance={{
								elements: {
									avatarBox: "size-8 ring-2 ring-violet-300",
								},
							}}
						/>
					</div>
				</div>
			</aside>
		</>
	);
}
