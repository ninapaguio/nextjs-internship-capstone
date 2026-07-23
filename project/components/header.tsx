"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
	return (
		<header className="border-b border-french_gray-300 dark:border-paynes_gray-400 bg-white/80 dark:bg-outer_space-500/80 backdrop-blur-sm">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center">
						<Link href="/" className="text-2xl font-bold text-blue_munsell-500">
							TaskFlow
						</Link>
					</div>

					<nav className="hidden md:flex space-x-8">
						<Link
							href="#features"
							className="text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors"
						>
							Features
						</Link>
						<Link
							href="#pricing"
							className="text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors"
						>
							Pricing
						</Link>
						<Link
							href="#about"
							className="text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors"
						>
							About
						</Link>
					</nav>

					<div className="flex items-center space-x-4">
						<ThemeToggle />

						<Link
							href="/dashboard"
							className="px-4 py-2 bg-blue_munsell-500 text-white rounded-lg hover:bg-blue_munsell-600 transition-colors"
						>
							Get Started
						</Link>
					</div>
				</div>
			</div>
		</header>
	);
}
