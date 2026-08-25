import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHero } from "@/components/auth/auth-hero";
import { CustomSignInForm } from "@/components/auth/custom-sign-in-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
	title: "Sign In | EverFlow",
	description:
		"Sign in to your EverFlow workspace to access your projects and tasks.",
	openGraph: {
		title: "Sign In | EverFlow",
		description:
			"Sign in to your EverFlow workspace to access your projects and tasks.",
	},
};

interface SignInPageProps {
	params: Promise<{ "sign-in"?: string[] }>;
	searchParams: Promise<{ redirect_url?: string | string[] }>;
}

export default async function SignInPage({
	params,
	searchParams,
}: SignInPageProps) {
	const [resolvedParams, resolvedSearchParams] = await Promise.all([
		params,
		searchParams,
	]);
	const isSsoCallback = resolvedParams["sign-in"]?.[0] === "sso-callback";
	const redirectValue = resolvedSearchParams.redirect_url;
	const redirectUrl = Array.isArray(redirectValue)
		? redirectValue[0]
		: redirectValue;

	if (isSsoCallback) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
				<AuthenticateWithRedirectCallback />
			</main>
		);
	}

	const { userId } = await auth();
	if (userId) {
		redirect(redirectUrl && redirectUrl.startsWith("/") ? redirectUrl : "/dashboard");
	}

	return (
		<main className="relative min-h-screen w-full bg-background grid grid-cols-1 lg:grid-cols-2 overflow-x-hidden">
			<div className="absolute top-4 right-4 z-50 sm:top-6 sm:right-6">
				<ThemeToggle />
			</div>

			{/* Left Column: Hero Panel (Desktop) */}
			<div className="order-2 lg:order-1 relative hidden lg:block h-full animate-in fade-in-0 slide-in-from-left-8 duration-700 ease-out">
				<AuthHero mode="sign-in" redirectUrl={redirectUrl} />
			</div>

			{/* Right Column: Sign In Form */}
			<div className="order-1 lg:order-2 relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-10 sm:px-12 md:px-16 lg:px-12 xl:px-16 animate-in fade-in-0 slide-in-from-right-8 duration-700 ease-out">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/3 right-1/4 size-72 sm:size-96 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/10" />
				</div>

				<div className="relative z-10 w-full max-w-85 sm:max-w-95 md:max-w-100 mx-auto flex flex-col items-center">
					{/* Visible only on mobile/tablet */}
					<div className="w-full lg:hidden mb-6 text-center">
						<Link
							href="/"
							className="inline-flex items-center justify-center gap-2.5 mb-2.5 group"
						>
							<Image
								src="/ef-logo.png"
								alt="EverFlow Logo"
								width={36}
								height={36}
								className="size-8 sm:size-9 object-contain drop-shadow-md"
								priority
							/>
							<div className="text-left">
								<span className="block text-xl sm:text-2xl font-black tracking-tight text-foreground">
									EverFlow
								</span>
								<span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-blue-600 dark:text-cyan-400">
									Project Management Tool
								</span>
							</div>
						</Link>

						<h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
							<span>Every project, </span>
							<span className="bg-linear-to-r from-blue-600 via-cyan-500 to-violet-500 bg-clip-text text-transparent">
								Work in Flow.
							</span>
						</h2>
					</div>

					<CustomSignInForm redirectUrl={redirectUrl} />
				</div>
			</div>
		</main>
	);
}
