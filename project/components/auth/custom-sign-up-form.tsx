"use client";

import { useSignUp } from "@clerk/nextjs";
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
	RotateCw,
	User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClerkErrorMessage } from "@/components/auth/clerk-error-message";

// Compact, minimalist, borderless Sign-Up Form component matching EverFlow design.
export function CustomSignUpForm() {
	const { signUp, fetchStatus } = useSignUp();
	const router = useRouter();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [verificationCode, setVerificationCode] = useState("");

	const [isVerifying, setIsVerifying] = useState(false);
	const [isOAuthLoading, setIsOAuthLoading] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [resendSuccess, setResendSuccess] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const isLoading = fetchStatus === "fetching";

	// Activates a completed Clerk session and preserves Clerk's Safari-safe redirect URL.
	async function finalizeSignUp() {
		if (!signUp) return false;

		const { error } = await signUp.finalize({
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
			getClerkErrorMessage(error, "Could not finish creating your account."),
		);
		return false;
	}

	// Handles initial sign up submission and prepares email verification
	async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!signUp) return;

		setErrorMessage(null);

		try {
			const { error: signUpError } = await signUp.password({
				emailAddress: email.trim(),
				password,
				firstName: firstName.trim() || undefined,
				lastName: lastName.trim() || undefined,
			});
			if (signUpError) {
				setErrorMessage(
					getClerkErrorMessage(
						signUpError,
						"Could not complete registration. Please try again.",
					),
				);
				return;
			}

			const { error: verificationError } =
				await signUp.verifications.sendEmailCode();
			if (verificationError) {
				setErrorMessage(
					getClerkErrorMessage(
						verificationError,
						"Could not send the verification code. Please try again.",
					),
				);
				return;
			}
			setIsVerifying(true);
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(
					error,
					"Could not complete registration. Please try again.",
				),
			);
		}
	}

	// Handles email OTP code verification
	async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!signUp) return;

		setErrorMessage(null);

		try {
			const { error } = await signUp.verifications.verifyEmailCode({
				code: verificationCode.trim(),
			});
			if (error) {
				setErrorMessage(
					getClerkErrorMessage(error, "Invalid verification code."),
				);
				return;
			}

			if (signUp.status === "complete") {
				await finalizeSignUp();
			} else {
				const missingFields = signUp.missingFields.join(", ");
				setErrorMessage(
					missingFields
						? `Clerk still requires: ${missingFields}. Update the Clerk settings or add those fields to this form.`
						: "Verification completed, but Clerk requires another sign-up step.",
				);
			}
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(error, "Invalid verification code."),
			);
		}
	}

	// Handles resending email verification code
	async function handleResendCode() {
		if (!signUp || isResending) return;
		setIsResending(true);
		setErrorMessage(null);

		try {
			const { error } = await signUp.verifications.sendEmailCode();
			if (error) {
				setErrorMessage(
					getClerkErrorMessage(
						error,
						"Could not resend code. Please try again shortly.",
					),
				);
				return;
			}
			setResendSuccess(true);
			setTimeout(() => setResendSuccess(false), 4000);
		} catch (error: unknown) {
			setErrorMessage(
				getClerkErrorMessage(
					error,
					"Could not resend code. Please try again shortly.",
				),
			);
		} finally {
			setIsResending(false);
		}
	}

	// Handles Google OAuth sign-up redirect
	async function handleGoogleSignUp() {
		if (!signUp) return;
		setIsOAuthLoading(true);
		setErrorMessage(null);

		try {
			const { error } = await signUp.sso({
				strategy: "oauth_google",
				redirectCallbackUrl: "/sign-up/sso-callback",
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

	// Clears Clerk's pending sign-up before allowing the user to enter another email.
	async function handleChangeEmail() {
		if (signUp) await signUp.reset();
		setVerificationCode("");
		setIsVerifying(false);
		setErrorMessage(null);
	}

	return (
		<div className="w-full transition-all">
			{/* Header */}
			<div className="mb-4 text-left">
				<h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
					{isVerifying ? "Verify your email" : "Create an account"}
				</h1>
				<p className="mt-0.5 text-xs text-muted-foreground">
					{isVerifying
						? `Enter the 6-digit code sent to ${email}`
						: "Start collaborating and tracking projects in real-time."}
				</p>
			</div>

			{/* Error Banner */}
			{errorMessage && (
				<div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 animate-in fade-in-0 duration-200">
					<AlertCircle className="size-3.5 shrink-0 mt-0.5" />
					<div className="flex-1 font-medium">{errorMessage}</div>
				</div>
			)}

			{/* Resend Notice */}
			{resendSuccess && (
				<div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">
					<CheckCircle2 className="size-3.5" />
					<span>A new verification code was sent to your email.</span>
				</div>
			)}

			{!isVerifying ? (
				/* Registration Form Step */
				<div className="space-y-3.5">
					{/* Google OAuth Button */}
					<button
						type="button"
						onClick={handleGoogleSignUp}
						disabled={isOAuthLoading || !signUp}
						className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background/80 py-2.5 px-3 text-xs sm:text-sm font-semibold text-foreground shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:border-brand-violet/40 hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-violet/30 disabled:opacity-50"
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

					<form onSubmit={handleSignUp} className="space-y-3">
						{/* Name Fields */}
						<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
							<div>
								<label
									htmlFor="signup-first-name"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
								>
									First Name
								</label>
								<div className="relative">
									<User className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
									<input
										id="signup-first-name"
										name="firstName"
										type="text"
										autoComplete="given-name"
										required
										value={firstName}
										onChange={(e) => setFirstName(e.target.value)}
										placeholder="Jane"
										className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
									/>
								</div>
							</div>
							<div>
								<label
									htmlFor="signup-last-name"
									className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
								>
									Last Name
								</label>
								<input
									id="signup-last-name"
									name="lastName"
									type="text"
									autoComplete="family-name"
									required
									value={lastName}
									onChange={(e) => setLastName(e.target.value)}
									placeholder="Doe"
									className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
								/>
							</div>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="signup-email"
								className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
							>
								Email Address
							</label>
							<div className="relative">
								<Mail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<input
									id="signup-email"
									name="email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="jane.doe@company.com"
									className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
								/>
							</div>
						</div>

						{/* Password */}
						<div>
							<label
								htmlFor="signup-password"
								className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
							>
								Password
							</label>
							<div className="relative">
								<Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
								<input
									id="signup-password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="new-password"
									required
									minLength={8}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="At least 8 characters"
									className="w-full rounded-xl border border-border bg-background pl-9 pr-9 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
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
							<p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
								Must contain at least 8 characters.
							</p>
						</div>

						{/* Clerk mounts its bot-protection challenge here when enabled. */}
						<div
							id="clerk-captcha"
							data-cl-theme="auto"
							data-cl-size="flexible"
						/>

						<button
							type="submit"
							disabled={isLoading || !signUp}
							className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-violet py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand_violet-600 hover:shadow-md hover:shadow-brand-violet/25 focus:outline-none focus:ring-2 focus:ring-brand-violet focus:ring-offset-2 active:scale-[0.99] disabled:opacity-50"
						>
							{isLoading ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<>
									<span>Create Account</span>
									<ArrowRight className="size-3.5" />
								</>
							)}
						</button>
					</form>
				</div>
			) : (
				/* Email Code Verification Step */
				<form onSubmit={handleVerifyCode} className="space-y-3">
					<div className="rounded-xl bg-brand-violet/10 p-2.5 border border-brand-violet/20 text-xs text-brand-violet dark:text-brand_violet-300">
						Please check your inbox at <strong>{email}</strong> and enter the
						6-digit confirmation code below.
					</div>

					<div>
						<label
							htmlFor="verification-code"
							className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
						>
							Verification Code
						</label>
						<div className="relative">
							<KeyRound className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<input
								id="verification-code"
								name="verificationCode"
								type="text"
								autoComplete="one-time-code"
								inputMode="numeric"
								required
								maxLength={6}
								value={verificationCode}
								onChange={(e) => setVerificationCode(e.target.value)}
								placeholder="123456"
								className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-center text-base sm:text-lg font-bold tracking-widest text-foreground placeholder:text-muted-foreground transition-all focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/20"
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={isLoading || !signUp || verificationCode.length < 6}
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-violet py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-violet-hover focus:outline-none focus:ring-2 focus:ring-brand-violet disabled:opacity-50"
					>
						{isLoading ? (
							<Loader2 className="size-3.5 animate-spin" />
						) : (
							<span>Verify & Launch Your Account</span>
						)}
					</button>

					<div className="flex items-center justify-between pt-1">
						<button
							type="button"
							onClick={handleResendCode}
							disabled={isResending}
							className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-violet dark:text-brand_violet-400 hover:underline disabled:opacity-50"
						>
							<RotateCw
								className={`size-3 ${isResending ? "animate-spin" : ""}`}
							/>
							<span>Resend code</span>
						</button>

						<button
							type="button"
							onClick={handleChangeEmail}
							className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
						>
							Change email
						</button>
					</div>
				</form>
			)}

			{/* Footer Navigation */}
			<div className="mt-5 border-t border-border pt-3.5 text-center text-xs text-muted-foreground">
				<span>Already have an account?</span>
				<Link
					href="/sign-in"
					className="ml-1.5 font-semibold text-brand-violet dark:text-brand_violet-400 hover:underline transition-colors"
				>
					Sign in
				</Link>
			</div>
		</div>
	);
}
