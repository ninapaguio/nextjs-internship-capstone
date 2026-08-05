"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";
import {
	BarChart3,
	CalendarDays,
	FolderClosed,
	Gauge,
	LogOut,
	Settings,
	Users,
	X,
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

	return (
		<>
			{open && (
				<button
					type="button"
					aria-label="Close navigation"
					className="fixed inset-0 z-40 bg-black/45 lg:hidden"
					onClick={onClose}
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-black/10 bg-white transition-transform duration-200 lg:w-20 lg:translate-x-0 ${
					open ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-18 items-center justify-between border-b border-black/10 px-5 lg:hidden">
					<span className="text-xl font-bold tracking-tight text-black">
						EverFlow
					</span>
					<button
						type="button"
						aria-label="Close navigation"
						className="rounded-md p-2 text-black hover:bg-black/10"
						onClick={onClose}
					>
						<X size={20} />
					</button>
				</div>

				<nav aria-label="Dashboard navigation" className="px-3 pt-3 lg:px-2">
					<ul className="space-y-1">
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
										onClick={onClose}
										className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:text-[10px] ${
											active
												? "bg-white text-black shadow-sm"
												: "text-black/75 hover:bg-white/70 hover:text-black"
										}`}
									>
										<Icon size={20} strokeWidth={1.8} />
										<span>{item.label}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="mt-auto space-y-1 px-3 pb-5 lg:px-2">
					<div className="flex min-h-14 items-center gap-3 px-3 lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1">
						<ThemeToggle />
						<span className="text-sm font-medium text-black/75 lg:text-[10px]">
							Theme
						</span>
					</div>

					<Link
						href="/settings"
						onClick={onClose}
						className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-sm font-medium text-black/75 transition-colors hover:bg-white/70 hover:text-black lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:text-[10px]"
					>
						<Settings size={20} strokeWidth={1.8} />
						<span>Settings</span>
					</Link>

					<SignOutButton redirectUrl="/">
						<button
							type="button"
							className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-black/75 transition-colors hover:bg-white/70 hover:text-black lg:flex-col lg:justify-center lg:gap-0.5 lg:px-1 lg:text-[10px]"
						>
							<LogOut size={20} strokeWidth={1.8} />
							<span>Sign Out</span>
						</button>
					</SignOutButton>

					<div className="flex justify-start px-3 pt-2 lg:justify-center lg:px-0">
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
