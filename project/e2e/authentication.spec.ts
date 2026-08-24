import { expect, test } from "@playwright/test";

test.describe("authentication boundaries", () => {
	// Confirms the root route sends a visitor to the custom Clerk sign-in page.
	test("redirects the public root to sign in", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
		await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
		await expect(
			page.getByRole("link", { name: /^Create an account$/ }),
		).toBeVisible();
	});

	// Confirms visitors can reach the custom Clerk sign-up entry point.
	test("shows the public sign-up page", async ({ page }) => {
		await page.goto("/sign-up");

		await expect(
			page.getByRole("heading", { name: "Create an account" }),
		).toBeVisible();
		await expect(page.getByRole("link", { name: /^Sign in$/ })).toBeVisible();
	});

	// Confirms Clerk redirects a signed-out visitor away from protected dashboard content.
	test("redirects a signed-out visitor to sign in", async ({ page }) => {
		await page.goto("/dashboard");

		await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
	});
});
