import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomSignInForm } from "./custom-sign-in-form";

const { mockPush, mockUseSignIn } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockUseSignIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@clerk/nextjs", () => ({
	useSignIn: mockUseSignIn,
}));

describe("CustomSignInForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("completes Device Trust using only an email code", async () => {
		const user = userEvent.setup();
		const signIn = {
			status: "needs_identifier",
			supportedSecondFactors: [{ strategy: "email_code" }],
			password: vi.fn(async () => {
				signIn.status = "needs_client_trust";
				return { error: null };
			}),
			finalize: vi.fn(async ({ navigate }) => {
				navigate({ decorateUrl: (url: string) => url });
				return { error: null };
			}),
			reset: vi.fn(),
			mfa: {
				sendEmailCode: vi.fn(async () => ({ error: null })),
				verifyEmailCode: vi.fn(async () => {
					signIn.status = "complete";
					return { error: null };
				}),
			},
			sso: vi.fn(),
		};
		mockUseSignIn.mockReturnValue({ signIn, fetchStatus: "idle" });

		render(<CustomSignInForm redirectUrl="/projects/acme" />);
		await user.type(screen.getByLabelText("Email Address"), "yuna@example.com");
		await user.type(screen.getByLabelText("Password"), "password123");
		await user.click(screen.getByRole("button", { name: "Sign In" }));

		expect(signIn.mfa.sendEmailCode).toHaveBeenCalledOnce();
		await user.type(screen.getByLabelText("Verification code"), "123456");
		await user.click(
			screen.getByRole("button", { name: "Verify and continue" }),
		);

		expect(signIn.mfa.verifyEmailCode).toHaveBeenCalledWith({ code: "123456" });
		expect(mockPush).toHaveBeenCalledWith("/projects/acme");
	});

	it("does not expose unsupported second-factor methods", async () => {
		const user = userEvent.setup();
		const signIn = {
			status: "needs_identifier",
			password: vi.fn(async () => {
				signIn.status = "needs_second_factor";
				return { error: null };
			}),
			finalize: vi.fn(),
			sso: vi.fn(),
		};
		mockUseSignIn.mockReturnValue({ signIn, fetchStatus: "idle" });

		render(<CustomSignInForm />);
		await user.type(screen.getByLabelText("Email Address"), "yuna@example.com");
		await user.type(screen.getByLabelText("Password"), "password123");
		await user.click(screen.getByRole("button", { name: "Sign In" }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Clerk requires another sign-in step",
		);
		expect(
			screen.queryByLabelText("Verification code"),
		).not.toBeInTheDocument();
	});

	it("keeps reset-code verification separate from password submission", async () => {
		const user = userEvent.setup();
		const signIn = {
			status: "needs_identifier",
			password: vi.fn(),
			finalize: vi.fn(async () => ({ error: null })),
			reset: vi.fn(),
			sso: vi.fn(),
			create: vi.fn(async () => ({ error: null })),
			resetPasswordEmailCode: {
				sendCode: vi.fn(async () => ({ error: null })),
				verifyCode: vi.fn(async () => {
					signIn.status = "needs_new_password";
					return { error: null };
				}),
				submitPassword: vi.fn(async () => ({
					error: { message: "Password is too weak." },
				})),
			},
		};
		mockUseSignIn.mockReturnValue({ signIn, fetchStatus: "idle" });

		render(<CustomSignInForm />);
		await user.click(screen.getByRole("button", { name: "Forgot password?" }));
		await user.type(screen.getByLabelText("Account Email"), "yuna@example.com");
		await user.click(screen.getByRole("button", { name: "Send Reset Code" }));
		await user.type(screen.getByLabelText("Reset Code"), "123456");
		await user.click(screen.getByRole("button", { name: "Verify Reset Code" }));

		expect(signIn.resetPasswordEmailCode.verifyCode).toHaveBeenCalledOnce();
		expect(screen.getByLabelText("New Password")).toBeVisible();

		await user.type(screen.getByLabelText("New Password"), "weakpass");
		await user.click(
			screen.getByRole("button", { name: "Update Password & Sign In" }),
		);

		expect(signIn.resetPasswordEmailCode.verifyCode).toHaveBeenCalledOnce();
		expect(signIn.resetPasswordEmailCode.submitPassword).toHaveBeenCalledOnce();
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Password is too weak.",
		);
	});
});
