"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { WorkloadMemberItem } from "@/types/analytics";

interface WorkloadChartProps {
	data: WorkloadMemberItem[];
	totalIncompleteTasks: number;
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{
		dataKey: string;
		name: string;
		value: number;
		color: string;
	}>;
	label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
	if (!active || !payload || payload.length === 0) return null;

	const activeItem = payload.find((p) => p.dataKey === "activeTasks");
	const overdueItem = payload.find((p) => p.dataKey === "overdueTasks");

	const totalActive = activeItem ? Number(activeItem.value) : 0;
	const totalOverdue = overdueItem ? Number(overdueItem.value) : 0;

	return (
		<div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
			<div className="font-semibold mb-1">{label}</div>
			<div className="space-y-0.5">
				<div className="flex items-center justify-between gap-3 text-muted-foreground">
					<span className="flex items-center gap-1.5">
						<span
							className="size-2 rounded-full"
							style={{
								backgroundColor: activeItem?.color ?? "var(--brand-primary)",
							}}
						/>
						Incomplete:
					</span>
					<span className="font-medium text-foreground">{totalActive}</span>
				</div>
				{totalOverdue > 0 && (
					<div className="flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400">
						<span className="flex items-center gap-1.5">
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: overdueItem?.color ?? "#f43f5e" }}
							/>
							Overdue subset:
						</span>
						<span className="font-medium">{totalOverdue}</span>
					</div>
				)}
			</div>
		</div>
	);
}

export function WorkloadChart({
	data,
	totalIncompleteTasks,
}: WorkloadChartProps) {
	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
					<CardTitle className="text-sm sm:text-base font-semibold">
						Workload Distribution
					</CardTitle>
					<span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
						{totalIncompleteTasks} incomplete task
						{totalIncompleteTasks === 1 ? "" : "s"}
					</span>
				</div>
				<CardDescription className="text-[11px] sm:text-xs">
					Current distribution of pending work across team members and
					unassigned tasks
				</CardDescription>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{data.length === 0 || totalIncompleteTasks === 0 ? (
					<div className="flex h-56 sm:h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4 sm:p-6">
						<p className="text-xs sm:text-sm font-medium text-muted-foreground">
							No active incomplete tasks to distribute
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							When new tasks are created or reopened, assigned workload will
							appear here.
						</p>
					</div>
				) : (
					<div className="h-56 sm:h-64 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={data}
								margin={{ top: 10, right: 8, left: -24, bottom: 25 }}
								accessibilityLayer
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="var(--border)"
									opacity={0.6}
								/>
								<XAxis
									dataKey="name"
									interval={0}
									angle={-30}
									textAnchor="end"
									height={40}
									tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
									tickLine={false}
									axisLine={{ stroke: "var(--border)" }}
								/>
								<YAxis
									allowDecimals={false}
									tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip content={<CustomTooltip />} />
								<Legend
									verticalAlign="top"
									align="right"
									iconSize={8}
									wrapperStyle={{ fontSize: 10, paddingBottom: 6 }}
								/>
								<Bar
									dataKey="activeTasks"
									name="Incomplete Tasks"
									fill="var(--brand-primary)"
									radius={[4, 4, 0, 0]}
									maxBarSize={32}
									isAnimationActive={false}
								/>
								<Bar
									dataKey="overdueTasks"
									name="Overdue Tasks"
									fill="#f43f5e"
									radius={[4, 4, 0, 0]}
									maxBarSize={32}
									isAnimationActive={false}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}

				{/* Screen reader accessible summary table */}
				<div className="sr-only">
					<table>
						<caption>Workload distribution for active incomplete tasks</caption>
						<thead>
							<tr>
								<th scope="col">Assignee</th>
								<th scope="col">Incomplete Tasks</th>
								<th scope="col">Overdue Tasks</th>
							</tr>
						</thead>
						<tbody>
							{data.map((item) => (
								<tr key={item.userId ?? "unassigned"}>
									<td>{item.name}</td>
									<td>{item.activeTasks}</td>
									<td>{item.overdueTasks}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
