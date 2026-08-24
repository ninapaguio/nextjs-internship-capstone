import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths()],
	css: {
		postcss: { plugins: [] },
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest.setup.ts"],
		include: ["**/*.{test,spec}.{ts,tsx}"],
		exclude: ["e2e/**", "node_modules/**", ".next/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: [
				"actions/**/*.{ts,tsx}",
				"components/**/*.{ts,tsx}",
				"hooks/**/*.{ts,tsx}",
				"lib/**/*.{ts,tsx}",
				"stores/**/*.{ts,tsx}",
			],
			exclude: ["**/*.d.ts", "**/*.{test,spec}.{ts,tsx}", "**/index.ts"],
		},
	},
});
