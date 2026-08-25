import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
	// Confirms the accessible button exposes its label and handles user input.
	it("calls its press handler when activated", async () => {
		const user = userEvent.setup();
		const handlePress = vi.fn();

		render(<Button onPress={handlePress}>Create project</Button>);
		await user.click(screen.getByRole("button", { name: "Create project" }));

		expect(handlePress).toHaveBeenCalledTimes(1);
	});

	// Confirms disabled actions cannot be activated by the user.
	it("prevents interaction while disabled", async () => {
		const user = userEvent.setup();
		const handlePress = vi.fn();

		render(
			<Button isDisabled onPress={handlePress}>
				Create project
			</Button>,
		);
		await user.click(screen.getByRole("button", { name: "Create project" }));

		expect(handlePress).not.toHaveBeenCalled();
	});
});
