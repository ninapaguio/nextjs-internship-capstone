"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Avoid hydration mismatch: next-themes only knows the real theme client-side
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "light";

  return (
    <button
      onClick={() => setTheme(current === "light" ? "dark" : "light")}
      className="p-2 rounded-lg bg-platinum-500 dark:bg-paynes_gray-500 text-outer_space-500 dark:text-platinum-500 hover:bg-french_gray-500 dark:hover:bg-paynes_gray-400 transition-colors border border-french_gray-300 dark:border-paynes_gray-400"
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
    </button>
  );
}
