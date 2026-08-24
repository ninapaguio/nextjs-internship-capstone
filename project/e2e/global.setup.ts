import { mkdir } from "node:fs/promises";
import path from "node:path";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

const authFile = path.join(process.cwd(), "playwright", ".clerk", "user.json");

setup.describe.configure({ mode: "serial" });

// Configures one Clerk testing token before authenticated browser setup runs.
setup("configure Clerk testing", async () => {
	await clerkSetup();
});

// Creates a reusable authenticated browser state for protected-flow tests.
setup("authenticate the E2E user", async ({ page }) => {
	const emailAddress = process.env.E2E_CLERK_USER_EMAIL;
	if (!emailAddress) {
		throw new Error(
			"E2E_CLERK_USER_EMAIL is required for authenticated Playwright tests.",
		);
	}

	await page.goto("/sign-in");
	await clerk.signIn({ page, emailAddress });
	await page.goto("/dashboard");

	await expect(page).toHaveURL(/\/dashboard(?:\/|\?|$)/);
	await expect(
		page.getByRole("heading", { level: 1, name: "Dashboard" }),
	).toBeVisible();

	await mkdir(path.dirname(authFile), { recursive: true });
	await page.context().storageState({ path: authFile });
});
