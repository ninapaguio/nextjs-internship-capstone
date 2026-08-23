"use client";

import {
	CheckCircle2,
	Kanban,
	Layers,
	ShieldCheck,
	Sparkles,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";

interface AuthHeroProps {
	mode: "sign-in" | "sign-up";
}

// Renders the responsive animated brand hero panel for authentication flows.
export function AuthHero({ mode }: AuthHeroProps) {
	const isSignIn = mode === "sign-in";

	return (
		<div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-2xl transition-all duration-500 lg:min-h-160 lg:p-12">
			<div
				className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full opacity-40 blur-3xl transition-all duration-700 animate-pulse"
				style={{
					background: isSignIn
						? "radial-gradient(circle, #2563eb 0%, rgba(6,182,212,0.4) 60%, transparent 100%)"
						: "radial-gradient(circle, #8b5cf6 0%, rgba(37,99,235,0.4) 60%, transparent 100%)",
				}}
			/>
			<div
				className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full opacity-35 blur-3xl transition-all duration-700"
				style={{
					background: isSignIn
						? "radial-gradient(circle, #06b6d4 0%, rgba(37,99,235,0.3) 60%, transparent 100%)"
						: "radial-gradient(circle, #2563eb 0%, rgba(139,92,246,0.3) 60%, transparent 100%)",
				}}
			/>

			{/* Top Header & Brand */}
			<div className="relative z-10">
				<Link
					href="/"
					className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
				>
					<div
						className="flex size-10 items-center justify-center rounded-xl font-bold text-white shadow-lg"
						style={{
							background: isSignIn
								? "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)"
								: "linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%)",
						}}
					>
						<Layers className="size-5" />
					</div>
					<div className="flex flex-col">
						<span className="text-xl font-bold tracking-tight text-white">
							EverFlow
						</span>
						<span className="text-[11px] font-medium tracking-wide text-cyan-400">
							WORKSPACE SUITE
						</span>
					</div>
				</Link>

				{/* Dynamic Tag / Status pill */}
				<div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
					{isSignIn ? (
						<>
							<Zap className="size-3.5 text-cyan-400 animate-bounce" />
							<span className="text-slate-200">Real-time sync active</span>
						</>
					) : (
						<>
							<Sparkles className="size-3.5 text-violet-400 animate-spin" />
							<span className="text-slate-200">Instant team onboarding</span>
						</>
					)}
				</div>

				{/* Headline & Description */}
				<div className="mt-4 max-w-md">
					<h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
						{isSignIn ? (
							<>
								Supercharge your projects with{" "}
								<span className="bg-linear-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
									real-time velocity
								</span>
								.
							</>
						) : (
							<>
								Build, organize, and ship{" "}
								<span className="bg-linear-to-r from-violet-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
									faster together
								</span>
								.
							</>
						)}
					</h2>
					<p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
						{isSignIn
							? "Access your interactive Kanban boards, track task assignees, and collaborate with your team in real time."
							: "Join dynamic teams, manage project lifecycles, and streamline deliverables with zero friction."}
					</p>
				</div>
			</div>

			{/* Interactive Workspace Preview Graphics */}
			<div className="relative z-10 my-6">
				{isSignIn ? (
					/* Sign-In Workspace Card (Blue/Cyan Focus) */
					<div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-xl shadow-xl transition-all hover:border-cyan-400/40">
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<div className="flex items-center gap-2">
								<div className="size-3 rounded-full bg-rose-500/80" />
								<div className="size-3 rounded-full bg-amber-500/80" />
								<div className="size-3 rounded-full bg-emerald-500/80" />
								<span className="ml-2 text-xs font-semibold text-slate-200">
									Sprint Alpha Board
								</span>
							</div>
							<span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
								<Kanban className="size-3" /> Live
							</span>
						</div>

						<div className="mt-3.5 space-y-2.5">
							<div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-white/5">
								<div className="flex items-center gap-2.5">
									<CheckCircle2 className="size-4 text-cyan-400" />
									<div>
										<p className="text-xs font-semibold text-white">
											API Performance Refactor
										</p>
										<p className="text-[10px] text-slate-400">
											Completed • 4 subtasks
										</p>
									</div>
								</div>
								<span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
									High
								</span>
							</div>

							<div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-white/5">
								<div className="flex items-center gap-2.5">
									<div className="size-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
									<div>
										<p className="text-xs font-semibold text-white">
											Design System Synchronization
										</p>
										<p className="text-[10px] text-slate-400">
											In Review • 2 assignees
										</p>
									</div>
								</div>
								<span className="rounded-md bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
									Active
								</span>
							</div>
						</div>

						{/* Progress Bar */}
						<div className="mt-3 pt-2">
							<div className="flex justify-between text-[11px] text-slate-300 font-medium mb-1">
								<span>Sprint Progress</span>
								<span className="text-cyan-300 font-bold">92%</span>
							</div>
							<div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
								<div
									className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-500"
									style={{ width: "92%" }}
								/>
							</div>
						</div>
					</div>
				) : (
					/* Sign-Up Collaboration Card (Violet/Blue Focus) */
					<div className="rounded-2xl border border-white/15 bg-white/10 p-4.5 backdrop-blur-xl shadow-xl transition-all hover:border-violet-400/40">
						<div className="flex items-center justify-between border-b border-white/10 pb-3">
							<div className="flex items-center gap-2">
								<Users className="size-4 text-violet-300" />
								<span className="text-xs font-semibold text-slate-200">
									Team Workspace Roster
								</span>
							</div>
							<span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
								<TrendingUp className="size-3" /> +40% Velocity
							</span>
						</div>

						<div className="mt-3.5 space-y-2.5">
							<div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-white/5">
								<div className="flex items-center gap-2.5">
									<div className="flex size-7 items-center justify-center rounded-full bg-linear-to-tr from-violet-600 to-blue-500 text-xs font-bold text-white shadow-xs">
										YP
									</div>
									<div>
										<p className="text-xs font-semibold text-white">
											Product Lead
										</p>
										<p className="text-[10px] text-slate-400">
											Project Owner • Full Access
										</p>
									</div>
								</div>
								<span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">
									Owner
								</span>
							</div>

							<div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-2.5 border border-white/5">
								<div className="flex items-center gap-2.5">
									<div className="flex size-7 items-center justify-center rounded-full bg-linear-to-tr from-blue-600 to-cyan-500 text-xs font-bold text-white shadow-xs">
										TM
									</div>
									<div>
										<p className="text-xs font-semibold text-white">
											Engineering Team
										</p>
										<p className="text-[10px] text-slate-400">
											5 Active Contributors
										</p>
									</div>
								</div>
								<span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-300">
									Manager
								</span>
							</div>
						</div>

						{/* Feature Pills */}
						<div className="mt-3 flex flex-wrap gap-1.5 pt-2">
							<span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300">
								🔒 Role-Based Permissions
							</span>
							<span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300">
								💬 Task Comments
							</span>
							<span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-300">
								📅 Due Date Calendars
							</span>
						</div>
					</div>
				)}
			</div>

			{/* Bottom Trust & Security Banner */}
			<div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
				<div className="flex items-center gap-1.5">
					<ShieldCheck className="size-4 text-emerald-400" />
					<span>Enterprise-grade security</span>
				</div>
				<span>© {new Date().getFullYear()} EverFlow</span>
			</div>
		</div>
	);
}
