import { defineConfig, devices } from "@playwright/test";
import { config as loadEnvironment } from "dotenv";

loadEnvironment({ path: ".env.local", quiet: true });

const isCI = Boolean(process.env.CI);
const authenticatedState = "playwright/.clerk/user.json";

// Runs browser journeys against a locally managed Next.js development server.
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: !isCI,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 1 : undefined,
	reporter: isCI ? "github" : "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "clerk setup",
			testMatch: /global\.setup\.ts/,
		},
		{
			name: "public chromium",
			testMatch: /authentication\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "authenticated chromium",
			testMatch: /authenticated\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				storageState: authenticatedState,
			},
			dependencies: ["clerk setup"],
		},
	],
	webServer: {
		command: isCI
			? "corepack pnpm@10.10.0 build && corepack pnpm@10.10.0 start"
			: "corepack pnpm@10.10.0 dev",
		url: "http://localhost:3000",
		reuseExistingServer: !isCI,
		timeout: 180_000,
	},
});
