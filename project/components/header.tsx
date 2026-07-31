"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";

type HeaderProps = {
	onOpenNavigation: () => void;
};

export function Header({ onOpenNavigation }: HeaderProps) {
	return (
		<header className="fixed inset-x-0 top-0 z-30 h-20 border-b border-black/10 bg-white lg:left-20">
			<div className="flex h-full items-center justify-between px-5 sm:px-7 lg:px-9">
				<div className="flex items-center gap-3">
					<button
						type="button"
						aria-label="Open navigation"
						className="rounded-md p-2 text-black hover:bg-black/10 lg:hidden"
						onClick={onOpenNavigation}
					>
						<Menu size={22} />
					</button>
					<Link
						href="/dashboard"
						className="text-xl font-bold tracking-tight text-black sm:text-2xl"
					>
						EverFlow
					</Link>
				</div>

				<button
					type="button"
					aria-label="View notifications"
					className="rounded-full p-2.5 text-black transition-colors hover:bg-black/10"
				>
					<Bell size={21} strokeWidth={1.8} />
				</button>
			</div>
		</header>
	);
}
