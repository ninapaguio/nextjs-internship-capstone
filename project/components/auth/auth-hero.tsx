"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthHeroProps {
	mode: "sign-in" | "sign-up";
}

// Hero panel with giant EverFlow app name, logo, signature tagline, and directly integrated action switch button.
export function AuthHero({ mode }: AuthHeroProps) {
	const isSignIn = mode === "sign-in";

	return (
		<div className="relative flex h-full min-h-137.5 w-full flex-col justify-center overflow-hidden bg-brand-dark-surface p-8 text-white sm:p-12 lg:min-h-screen lg:p-16">
			{/* Ambient Minimalist Radial Glow using centralized brand palette */}
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

			{/* Subtle Geometric Dot Texture */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.03]"
				style={{
					backgroundImage:
						"radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
					backgroundSize: "32px 32px",
				}}
			/>

			{/* Centerpiece: Logo + Giant App Name + Tagline + Action Button */}
			<div className="relative z-10 max-w-2xl space-y-8 my-auto">
				{/* Logo & Giant App Name */}
				<div className="flex items-center gap-4 sm:gap-6">
					<Image
						src="/ef-logo.png"
						alt="EverFlow Logo"
						width={96}
						height={96}
						className="size-16 sm:size-20 lg:size-24 object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
						priority
					/>
					<div className="flex flex-col">
						<span className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white drop-shadow-md">
							EverFlow
						</span>
						<span
							className={cn(
								"text-xs sm:text-sm font-bold tracking-[0.25em] uppercase mt-0.5",
								isSignIn ? "text-brand-cyan" : "text-brand_violet-300",
							)}
						>
							Project Management Tool
						</span>
					</div>
				</div>

				{/* Signature Tagline */}
				<div>
					<h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1]">
						<span className="block text-slate-200 drop-shadow-sm">
							Every project,
						</span>
						<span
							className={cn(
								"mt-1 block font-black",
								isSignIn ? "text-brand-gradient" : "text-brand-gradient-violet",
							)}
						>
							Work in Flow.
						</span>
					</h1>
				</div>

				{/* Action Switch Button directly below the Tagline */}
				<div className="pt-2">
					{isSignIn ? (
						<Link
							href="/sign-up"
							className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-brand-cyan/50 hover:scale-105 hover:shadow-brand-cyan/20"
						>
							<span>Sign Up</span>
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
					) : (
						<Link
							href="/sign-in"
							className="group inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-brand-violet/50 hover:scale-105 hover:shadow-brand-violet/20"
						>
							<span>Sign In</span>
							<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
