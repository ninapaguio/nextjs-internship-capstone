import { expect, test } from "@playwright/test";

test.describe("authenticated navigation", () => {
	// Confirms the saved Clerk session opens protected dashboard content directly.
	test("lets a signed-in user open the dashboard", async ({ page }) => {
		await page.goto("/dashboard");

		await expect(page).toHaveURL(/\/dashboard(?:\/|\?|$)/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Dashboard" }),
		).toBeVisible();
	});

	// Confirms the root route recognizes the session and chooses the protected home.
	test("redirects a signed-in user from root to the dashboard", async ({
		page,
	}) => {
		await page.goto("/");

		await expect(page).toHaveURL(/\/dashboard(?:\/|\?|$)/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Dashboard" }),
		).toBeVisible();
	});

	// Confirms the same session can navigate to another protected application route.
	test("lets a signed-in user open projects", async ({ page }) => {
		await page.goto("/projects");

		await expect(page).toHaveURL(/\/projects(?:\/|\?|$)/);
		await expect(
			page.getByRole("heading", { level: 1, name: "Projects" }),
		).toBeVisible();
	});
});
