import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthHero } from "@/components/auth/auth-hero";
import { CustomSignUpForm } from "@/components/auth/custom-sign-up-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
	title: "Create Account | EverFlow",
	description:
		"Create your EverFlow account to start managing projects and collaborating with your team.",
	openGraph: {
		title: "Create Account | EverFlow",
		description:
			"Create your EverFlow account to start managing projects and collaborating with your team.",
	},
};

interface SignUpPageProps {
	params: Promise<{ "sign-up"?: string[] }>;
}

// split-screen sign-up
export default async function SignUpPage({ params }: SignUpPageProps) {
	const resolvedParams = await params;
	const isSsoCallback = resolvedParams["sign-up"]?.[0] === "sso-callback";

	if (isSsoCallback) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
				<AuthenticateWithRedirectCallback />
			</main>
		);
	}

	return (
		<main className="relative min-h-screen w-full bg-background grid grid-cols-1 lg:grid-cols-2 overflow-x-hidden">
			<div className="absolute top-4 right-4 z-50 sm:top-6 sm:right-6">
				<ThemeToggle />
			</div>

			{/* Left Column: Hero Panel (Desktop only) */}
			<div className="order-2 lg:order-1 relative hidden lg:block h-full animate-in fade-in-0 slide-in-from-left-6 duration-700">
				<AuthHero mode="sign-up" />
			</div>

			{/* Right Column: Hero Panel (Desktop only) */}
			<div className="order-1 lg:order-2 relative flex min-h-screen w-full flex-col items-center justify-center px-8 py-10 sm:px-12 md:px-16 lg:px-12 xl:px-16 animate-in fade-in-0 slide-in-from-right-6 duration-700">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute top-1/3 right-1/4 size-72 sm:size-96 rounded-full bg-violet-500/5 blur-3xl dark:bg-violet-500/10" />
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
								<span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-violet-600 dark:text-violet-400">
									Project Management Tool
								</span>
							</div>
						</Link>

						<h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
							<span>Ideas in Motion. </span>
							<span className="bg-linear-to-r from-violet-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
								Work in Flow.
							</span>
						</h2>
					</div>

					<CustomSignUpForm />
				</div>
			</div>
		</main>
	);
}
