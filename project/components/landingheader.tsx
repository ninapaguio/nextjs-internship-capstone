"use client";

import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

// Gives landing-page visitors navigation that matches their current Clerk session.
export function LandingHeader() {
	return (
		<header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl transition-all">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
				<Link
					href="/"
					className="group flex items-center gap-2 transition-transform duration-200 hover:opacity-90 sm:gap-2.5"
					aria-label="EverFlow home"
				>
					<Image
						src="/ef-logo.png"
						alt="EverFlow Logo"
						width={36}
						height={36}
						className="size-8 object-contain transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3 sm:size-10"
						priority
					/>
					<span className="text-lg font-black tracking-tight transition-colors group-hover:text-brand-primary sm:text-xl">
						EverFlow
					</span>
				</Link>

				<nav
					className="flex items-center gap-1.5 sm:gap-2"
					aria-label="Primary navigation"
				>
					<ThemeToggle className="bg-transparent shadow-none hover:bg-muted" />
					<Show when="signed-out">
						<Link
							href="/sign-in"
							className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground sm:text-sm"
						>
							Sign in
						</Link>
						<Link
							href="/sign-up"
							className="group inline-flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-md sm:px-4 sm:py-2 sm:text-sm"
						>
							<span>Get started</span>
							<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 sm:size-4" />
						</Link>
					</Show>
					<Show when="signed-in">
						<Link
							href="/dashboard"
							className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground sm:text-sm"
						>
							Dashboard
						</Link>
						<UserButton />
					</Show>
				</nav>
			</div>
		</header>
	);
}
