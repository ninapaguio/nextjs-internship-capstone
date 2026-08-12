"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
	className?: string;
}

// Toggles application themes
export function ThemeToggle({ className }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	// Avoid hydration mismatch: next-themes only knows the real theme client-side
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	const current = mounted ? theme : "light";

	return (
		<Button
			variant="secondary"
			size="icon-sm"
			onPress={() => setTheme(current === "light" ? "dark" : "light")}
			className={cn("rounded-xl", className)}
			aria-label="Toggle theme"
		>
			{mounted ? (
				current === "light" ? (
					<Moon size={20} />
				) : (
					<Sun size={20} />
				)
			) : (
				<div className="w-5 h-5" />
			)}
		</Button>
	);
}
