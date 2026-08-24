"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { buildAuthRoute } from "@/lib/auth/auth-redirect";
import { cn } from "@/lib/utils";

interface AuthHeroProps {
	mode: "sign-in" | "sign-up";
	redirectUrl?: string;
}

// Auth Hero panel
export function AuthHero({ mode, redirectUrl }: AuthHeroProps) {
	const isSignIn = mode === "sign-in";

	return (
		<div className="relative flex h-full min-h-137.5 w-full flex-col items-center justify-center overflow-hidden bg-brand-dark-surface p-6 sm:p-10 lg:min-h-screen lg:p-12 select-none">
			<div
				className="pointer-events-none absolute -top-32 -left-32 h-137.5 w-137.5 rounded-full opacity-35 blur-[130px] transition-all duration-1000"
				style={{
					background: isSignIn
						? "radial-gradient(circle, var(--brand-primary) 0%, var(--brand-cyan) 50%, transparent 80%)"
						: "radial-gradient(circle, var(--brand-violet) 0%, var(--brand-primary) 50%, transparent 80%)",
				}}
			/>
			<div
				className="pointer-events-none absolute -bottom-32 -right-32 h-137.5 w-137.5 rounded-full opacity-30 blur-[130px] transition-all duration-1000"
				style={{
					background: isSignIn
						? "radial-gradient(circle, var(--brand-cyan) 0%, var(--brand-primary) 60%, transparent 80%)"
						: "radial-gradient(circle, var(--brand-primary) 0%, var(--brand-violet) 60%, transparent 80%)",
				}}
			/>

			<div
				className="pointer-events-none absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
					backgroundSize: "32px 32px",
				}}
			/>

			<div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 px-4">
				<div className="relative group">
					<div
						className={cn(
							"absolute -inset-3 rounded-full opacity-40 blur-xl transition duration-500 group-hover:opacity-70",
							isSignIn
								? "bg-linear-to-r from-blue-600 to-cyan-500"
								: "bg-linear-to-r from-violet-600 to-blue-500",
						)}
					/>
					<Image
						src="/ef-logo.png"
						alt="EverFlow Logo"
						width={88}
						height={88}
						className="relative size-18 sm:size-20 lg:size-22 object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
						priority
					/>
				</div>

				<div className="space-y-1.5 flex flex-col items-center">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-md leading-none">
						EverFlow
					</h1>
					<p
						className={cn(
							"text-[10px] sm:text-xs font-bold tracking-[0.28em] uppercase pt-0.5",
							isSignIn ? "text-brand-cyan" : "text-brand_violet-300",
						)}
					>
						Project Management Tool
					</p>
				</div>

				<div className="pt-1">
					<h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-200">
						<span>Every project, </span>
						<span
							className={cn(
								"font-black",
								isSignIn ? "text-brand-gradient" : "text-brand-gradient-violet",
							)}
						>
							Work in Flow.
						</span>
					</h2>
				</div>

				<div className="pt-2 flex flex-col items-center">
					{isSignIn ? (
						<Link
							href={buildAuthRoute("/sign-up", redirectUrl)}
							className="group inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md shadow-md transition-all duration-300 hover:bg-white/20 hover:border-brand-cyan/60 hover:scale-105 hover:shadow-brand-cyan/25 cursor-pointer"
						>
							<span>Create an Account</span>
							<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
						</Link>
					) : (
						<Link
							href={buildAuthRoute("/sign-in", redirectUrl)}
							className="group inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md shadow-md transition-all duration-300 hover:bg-white/20 hover:border-brand-violet/60 hover:scale-105 hover:shadow-brand-violet/25 cursor-pointer"
						>
							<ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
							<span>Sign In to Account</span>
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
