import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/components/settings/settings-view";

const openUserProfile = vi.fn();
const signOut = vi.fn();
const setTheme = vi.fn();

vi.mock("@clerk/nextjs", () => ({
	useClerk: () => ({ openUserProfile, signOut }),
}));

vi.mock("next-themes", () => ({
	useTheme: () => ({ theme: "light", setTheme }),
}));

const profile = {
	firstName: "Nina",
	lastName: "Paguio",
	email: "nina@example.com",
	username: null,
	imageUrl: "",
};

describe("SettingsView", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows profile data without unsupported account claims", () => {
		render(<SettingsView profile={profile} />);

		expect(screen.getAllByText("Nina Paguio")).not.toHaveLength(0);
		expect(screen.queryByText("Verified Member")).not.toBeInTheDocument();
		expect(screen.queryByText("Username")).not.toBeInTheDocument();
	});

	it("exposes and updates the selected settings section", async () => {
		const user = userEvent.setup();
		render(<SettingsView profile={profile} />);

		const securityButton = screen.getByRole("button", {
			name: /Account & Security/,
		});
		expect(
			screen.getByRole("button", { name: /Personal Profile/ }),
		).toHaveAttribute("aria-pressed", "true");

		await user.click(securityButton);

		expect(securityButton).toHaveAttribute("aria-pressed", "true");
		expect(
			screen.getByText("Email or username with password, and Google"),
		).toBeInTheDocument();
		expect(screen.getAllByText("Managed in Clerk")).toHaveLength(1);
		expect(
			screen.queryByText("Two-Factor Authentication"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Active Device Sessions"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Connected Accounts")).not.toBeInTheDocument();
	});

	it("delegates theme changes to the existing theme provider", async () => {
		const user = userEvent.setup();
		render(<SettingsView profile={profile} />);

		await user.click(
			screen.getByRole("button", { name: /Appearance & Theme/ }),
		);
		const darkThemeButton = screen.getByRole("button", { name: /Dark Mode/ });

		expect(screen.getByRole("button", { name: /Light Mode/ })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(darkThemeButton).toHaveAttribute("aria-pressed", "false");

		await user.click(darkThemeButton);
		expect(setTheme).toHaveBeenCalledWith("dark");
	});
});
