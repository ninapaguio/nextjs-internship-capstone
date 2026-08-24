"use client";

import { useSignIn } from "@clerk/nextjs";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Eye,
	EyeOff,
	KeyRound,
	Loader2,
	Lock,
	Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClerkErrorMessage } from "@/components/auth/clerk-error-message";

// Compact, minimalist, borderless Sign-In Form component matching EverFlow design.
export function CustomSignInForm() {
	const { signIn, fetchStatus } = useSignIn();
	const router = useRouter();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isOAuthLoading, setIsOAuthLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isLoading = fetchStatus === "fetching";

	// Forgot password state
	const [isResetMode, setIsResetMode] = useState(false);
	const [resetCode, setResetCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [resetSent, setResetSent] = useState(false);
	const [resetSuccess, setResetSuccess] = useState(false);

	// Activates a completed Clerk session and preserves Clerk's Safari-safe redirect URL.
	async function finalizeSignIn() {
		if (!signIn) return false;

		const { error } = await signIn.finalize({
			navigate: ({ decorateUrl }) => {
				const destination = decorateUrl("/dashboard");
				if (destination.startsWith("http")) {
					window.location.href = destination;
					return;
				}
				router.push(destination);
			},
		});

		if (!error) return true;
		setErrorMessage(
			getClerkErrorMessage(
				error,
				"Could not finish signing in. Please try again.",
			),
		);
		return false;
	}

	// Handles standard email + password sign-in
	async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!signIn) return;

		setErrorMessage(null);

		try {
			const { error } = await signIn.password({
				emailAddress: email.trim(),
				password,
			});
			if (error) {
				setErrorMessage(
					getClerkErrorMessage(
						error,
						"Invalid email or password. Please try again.",
					),
				);
				return;
			}

			if (signIn.status === "complete") {
				await finalizeSignIn();
				return;
			}

			setErrorMessage(
				signIn.status === "needs_second_factor" ||
					signIn.status === "needs_client_trust"
					? "This account requires an additional verification step that this form does not support yet."
					: "Clerk requires another sign-in step. Please try Google or contact support.",
			);
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(
					error,
					"Invalid email or password. Please try again.",
				),
			);
		}
	}

	// Handles Google OAuth sign-in redirect
	async function handleGoogleSignIn() {
		if (!signIn) return;
		setIsOAuthLoading(true);
		setErrorMessage(null);

		try {
			const { error } = await signIn.sso({
				strategy: "oauth_google",
				redirectCallbackUrl: "/sign-in/sso-callback",
				redirectUrl: "/dashboard",
			});
			if (error) {
				setErrorMessage(
					getClerkErrorMessage(
						error,
						"Could not connect to Google. Please try again.",
					),
				);
				setIsOAuthLoading(false);
			}
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(
					error,
					"Could not connect to Google. Please try again.",
				),
			);
			setIsOAuthLoading(false);
		}
	}

	// Sends password reset code to user's email
	async function handleSendResetCode(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!signIn || !email.trim()) return;

		setErrorMessage(null);

		try {
			const { error: createError } = await signIn.create({
				identifier: email.trim(),
			});
			if (createError) {
				setErrorMessage(
					getClerkErrorMessage(
						createError,
						"Failed to start password reset. Please check your email.",
					),
				);
				return;
			}

			const { error: sendError } =
				await signIn.resetPasswordEmailCode.sendCode();
			if (sendError) {
				setErrorMessage(
					getClerkErrorMessage(
						sendError,
						"Failed to send reset code. Please check your email.",
					),
				);
				return;
			}
			setResetSent(true);
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(
					error,
					"Failed to send reset code. Please check your email.",
				),
			);
		}
	}

	// Confirms code & updates password
	async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!signIn) return;

		setErrorMessage(null);

		try {
			const { error: verifyError } =
				await signIn.resetPasswordEmailCode.verifyCode({
					code: resetCode.trim(),
				});
			if (verifyError) {
				setErrorMessage(
					getClerkErrorMessage(
						verifyError,
						"The reset code is invalid or expired.",
					),
				);
				return;
			}

			const { error: passwordError } =
				await signIn.resetPasswordEmailCode.submitPassword({
					password: newPassword,
					signOutOfOtherSessions: true,
				});
			if (passwordError) {
				setErrorMessage(
					getClerkErrorMessage(
						passwordError,
						"The new password does not meet the account requirements.",
					),
				);
				return;
			}

			if (signIn.status === "complete") {
				setResetSuccess(true);
				await finalizeSignIn();
			} else {
				setErrorMessage("Could not complete password reset. Please try again.");
			}
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(error, "Invalid reset code or password format."),
			);
		}
	}

	return (
		<div className="w-full transition-all">
			{/* Form Header */}
			<div className="mb-4 text-left">
				<h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
					{isResetMode ? "Reset your password" : "Sign In"}
				</h1>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{isResetMode
						? "Enter your account email to receive a reset code."
						: "Enter your credentials to access your account."}
				</p>
			</div>

			{/* Error Banner */}
			{errorMessage && (
				<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in-0 duration-200">
					<AlertCircle className="size-3.5 shrink-0 mt-0.5" />
					<div className="flex-1 font-medium">{errorMessage}</div>
				</div>
			)}

			{/* Success Banner */}
			{resetSuccess && (
				<div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
					<CheckCircle2 className="size-3.5" />
					<span>Password reset successfully! Redirecting to dashboard...</span>
				</div>
			)}

			{!isResetMode ? (
				/* Main Sign-In View */
				<div className="space-y-3.5">
					{/* Google OAuth Button */}
					<button
						type="button"
						onClick={handleGoogleSignIn}
						disabled={isOAuthLoading || !signIn}
						className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background/80 py-2.5 px-3 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:border-brand-primary/40 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-50"
					>
						{isOAuthLoading && (
							<Loader2 className="size-4 animate-spin text-brand-primary" />
						)}
						<span>
							{isOAuthLoading ? "Connecting..." : "Continue with Google"}
						</span>
					</button>

					{/* Divider */}
					<div className="relative my-3 flex items-center justify-center">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border" />
						</div>
						<span className="relative bg-background px-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
							OR EMAIL
						</span>
					</div>

					{/* Email & Password Form */}
					<form onSubmit={handleEmailSignIn} className="space-y-3">
						<div>
							<label
								htmlFor="signin-email"
								className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
							>
								Email Address
							</label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<input
									id="signin-email"
									name="email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@company.com"
									className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
								/>
							</div>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1">
								<label
									htmlFor="signin-password"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
								>
									Password
								</label>
								<button
									type="button"
									onClick={() => {
										setIsResetMode(true);
										setErrorMessage(null);
									}}
									className="text-[11px] font-medium text-brand-primary dark:text-brand-cyan hover:underline transition-colors"
								>
									Forgot password?
								</button>
							</div>
							<div className="relative">
								<Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<input
									id="signin-password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="w-full rounded-xl border border-border bg-background pl-9 pr-9 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
									aria-label={showPassword ? "Hide password" : "Show password"}
								>
									{showPassword ? (
										<EyeOff className="size-3.5" />
									) : (
										<Eye className="size-3.5" />
									)}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading || !signIn}
							className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand_primary-600 hover:shadow-md hover:shadow-brand-primary/25 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
						>
							{isLoading ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<>
									<span>Sign In</span>
									<ArrowRight className="size-3.5" />
								</>
							)}
						</button>
					</form>
				</div>
			) : (
				/* Password Reset Flow */
				<div className="space-y-3.5">
					{!resetSent ? (
						<form onSubmit={handleSendResetCode} className="space-y-3">
							<div>
								<label
									htmlFor="reset-email"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
								>
									Account Email
								</label>
								<div className="relative">
									<Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<input
										id="reset-email"
										name="email"
										type="email"
										autoComplete="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@company.com"
										className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={isLoading || !signIn}
								className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
							>
								{isLoading ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<span>Send Reset Code</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => {
									setIsResetMode(false);
									setErrorMessage(null);
								}}
								className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Back to Sign In
							</button>
						</form>
					) : (
						<form onSubmit={handleResetPassword} className="space-y-3">
							<div className="rounded-xl bg-brand-primary/10 p-2.5 border border-brand-primary/20 text-xs text-brand-primary dark:text-brand-cyan">
								A 6-digit code has been sent to <strong>{email}</strong>.
							</div>

							<div>
								<label
									htmlFor="reset-code"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
								>
									Reset Code
								</label>
								<div className="relative">
									<KeyRound className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<input
										id="reset-code"
										name="resetCode"
										type="text"
										autoComplete="one-time-code"
										inputMode="numeric"
										required
										value={resetCode}
										onChange={(e) => setResetCode(e.target.value)}
										placeholder="123456"
										className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm tracking-widest text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="new-password"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
								>
									New Password
								</label>
								<div className="relative">
									<Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<input
										id="new-password"
										name="newPassword"
										type="password"
										autoComplete="new-password"
										required
										minLength={8}
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										placeholder="At least 8 characters"
										className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
									/>
								</div>
							</div>

							<button
								type="submit"
								disabled={isLoading || !signIn}
								className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50"
							>
								{isLoading ? (
									<Loader2 className="size-3.5 animate-spin" />
								) : (
									<span>Update Password & Sign In</span>
								)}
							</button>

							<button
								type="button"
								onClick={() => {
									setIsResetMode(false);
									setResetSent(false);
									setErrorMessage(null);
								}}
								className="w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								Cancel
							</button>
						</form>
					)}
				</div>
			)}

			{/* Footer Navigation */}
			<div className="mt-5 border-t border-border pt-3.5 text-center text-xs text-muted-foreground">
				<span>Don't have an account?</span>
				<Link
					href="/sign-up"
					className="ml-1.5 font-semibold text-brand-primary dark:text-brand-cyan hover:underline transition-colors"
				>
					Create an account
				</Link>
			</div>
		</div>
	);
}
