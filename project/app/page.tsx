import { Show } from "@clerk/nextjs";
import {
	ArrowRight,
	BellRing,
	ChartNoAxesCombined,
	GitBranch,
	KanbanSquare,
	MessageSquareText,
	Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/footer";
import { LandingHeader } from "@/components/landingheader";

export const metadata: Metadata = {
	title: "EverFlow | Projects that keep moving",
	description:
		"Plan projects, coordinate teams, and turn task progress into clear next steps with EverFlow.",
	openGraph: {
		title: "EverFlow | Projects that keep moving",
		description:
			"Plan projects, coordinate teams, and turn task progress into clear next steps with EverFlow.",
	},
};

const productFeatures = [
	{
		title: "Boards built for momentum",
		description:
			"Move work through clear stages, assign owners, and keep priorities visible without losing context.",
		icon: KanbanSquare,
		accent: "bg-brand-primary/10 text-brand-primary dark:text-brand-cyan",
		hoverBorder: "hover:border-brand-primary/50 hover:shadow-brand-primary/10",
	},
	{
		title: "Dependencies you can trust",
		description:
			"Connect related tasks, prevent circular links, and notify assignees when blocked work becomes ready.",
		icon: GitBranch,
		accent: "bg-brand-violet/10 text-brand-violet dark:text-brand_violet-300",
		hoverBorder: "hover:border-brand-violet/50 hover:shadow-brand-violet/10",
	},
	{
		title: "Progress with meaning",
		description:
			"See completion trends, workload, overdue work, and project health through focused analytics.",
		icon: ChartNoAxesCombined,
		accent: "bg-brand-cyan/10 text-brand-cyan dark:text-brand_cyan-300",
		hoverBorder: "hover:border-brand-cyan/50 hover:shadow-brand-cyan/10",
	},
] as const;

const collaborationPoints = [
	{
		label: "Role-aware teamwork",
		description:
			"Owners, managers, and members see the controls meant for them.",
		icon: Users,
	},
	{
		label: "Conversations beside the work",
		description:
			"Comments stay connected to the task and the people assigned to it.",
		icon: MessageSquareText,
	},
	{
		label: "Timely in-app updates",
		description:
			"Assignments, comments, and newly unblocked tasks reach the right people.",
		icon: BellRing,
	},
] as const;

export default function HomePage() {
	return (
		<div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
			<div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-160 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_42%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_38%)]" />

			<LandingHeader />

			<main>
				{/* Hero Section */}
				<section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-8 lg:py-28">
					<div className="max-w-2xl text-center sm:text-left mx-auto sm:mx-0">
						<h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black tracking-[-0.03em] leading-[1.12]">
							<span>Turn every project into </span>
							<span className="block text-brand-gradient">work in flows.</span>
						</h1>

						<p className="mt-4 sm:mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-7 lg:text-lg">
							EverFlow brings Kanban planning, task dependencies, team
							conversations, and progress insights together so everyone knows
							what is moving and what needs attention.
						</p>

						<div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:flex-row">
							<Show when="signed-out">
								<Link
									href="/sign-up"
									className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-brand-primary px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-brand-primary/25 transition-all duration-200 hover:-translate-y-1 hover:bg-brand_primary-600 hover:shadow-xl hover:shadow-brand-primary/30 active:scale-[0.99]"
								>
									<span>Create your account</span>
									<ArrowRight className="size-3.5 sm:size-4 transition-transform group-hover:translate-x-1" />
								</Link>
								<Link
									href="/sign-in"
									className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl sm:rounded-2xl border border-border bg-card/70 px-5 py-3 text-xs sm:text-sm font-bold shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted hover:border-brand-primary/40 hover:text-foreground"
								>
									Sign in to EverFlow
								</Link>
							</Show>
						</div>
					</div>
				</section>

				<section className="border-y border-border/70 bg-muted/35">
					<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-18 lg:px-8">
						<div className="mx-auto max-w-2xl text-center">
							<p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-brand-primary uppercase dark:text-brand-cyan">
								A clearer way to move work forward
							</p>
							<h2 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
								Everything your team needs to stay aligned
							</h2>
						</div>
						<div className="mt-8 sm:mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{productFeatures.map((feature) => {
								const Icon = feature.icon;
								return (
									<article
										key={feature.title}
										className={`group rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg ${feature.hoverBorder}`}
									>
										<div
											className={`flex size-10 sm:size-11 items-center justify-center rounded-xl sm:rounded-2xl transition-transform duration-300 group-hover:scale-110 ${feature.accent}`}
										>
											<Icon className="size-4.5 sm:size-5" />
										</div>
										<h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-bold transition-colors group-hover:text-foreground">
											{feature.title}
										</h3>
										<p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
											{feature.description}
										</p>
									</article>
								);
							})}
						</div>
					</div>
				</section>

				<section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12 lg:px-8">
					<div className="text-center sm:text-left">
						<p className="text-[11px] sm:text-xs font-bold tracking-[0.2em] text-brand-violet uppercase dark:text-brand_violet-400">
							Designed for collaboration
						</p>
						<h2 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
							Keep people informed without adding more noise
						</h2>
					</div>
					<div className="grid gap-3">
						{collaborationPoints.map((point) => {
							const Icon = point.icon;
							return (
								<div
									key={point.label}
									className="group flex items-start sm:items-center gap-3.5 sm:gap-4 rounded-xl sm:rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-violet/40 hover:shadow-md hover:shadow-brand-violet/5"
								>
									<div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-brand-violet/10 text-brand-violet dark:text-brand_violet-400 transition-transform duration-300 group-hover:scale-110">
										<Icon className="size-4 sm:size-5" />
									</div>
									<div>
										<h3 className="text-sm sm:text-base font-bold transition-colors group-hover:text-brand-violet">
											{point.label}
										</h3>
										<p className="mt-0.5 sm:mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">
											{point.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</section>

				<section className="px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8">
					<div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-4xl bg-brand-dark-surface px-5 py-8 text-white shadow-2xl sm:px-8 sm:py-12 lg:flex lg:items-center lg:justify-between lg:px-14">
						<div className="pointer-events-none absolute -top-32 right-0 size-72 sm:size-96 rounded-full bg-brand-primary/30 blur-3xl" />
						<div className="relative max-w-2xl text-center sm:text-left">
							<h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
								Ready to put your work with EverFlow?
							</h2>
							<p className="mt-2 sm:mt-3 text-xs leading-relaxed text-slate-300 sm:text-base">
								Create an account or return to your workspace already
								shares.
							</p>
						</div>
						<div className="relative mt-6 flex flex-col gap-2.5 sm:flex-row sm:mt-7 lg:mt-0">
							<Show when="signed-out">
								<Link
									href="/sign-up"
									className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-slate-100 hover:shadow-xl active:scale-[0.99]"
								>
									<span>Get started</span>
									<ArrowRight className="size-3.5 sm:size-4 transition-transform group-hover:translate-x-1" />
								</Link>
								<Link
									href="/sign-in"
									className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl sm:rounded-2xl border border-white/20 bg-white/8 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:border-white/40"
								>
									Sign in
								</Link>
							</Show>
							<Show when="signed-in">
								<Link
									href="/dashboard"
									className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition-all duration-200 hover:-translate-y-1 hover:bg-slate-100 hover:shadow-xl active:scale-[0.99]"
								>
									<span>Continue to dashboard</span>
									<ArrowRight className="size-3.5 sm:size-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Show>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
