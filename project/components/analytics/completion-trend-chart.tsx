"use client";

import {
	Bar,
	BarChart,
	CartesianGrid,
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
import type {
	AnalyticsDateRange,
	CompletionTrendPoint,
} from "@/types/analytics";

interface CompletionTrendChartProps {
	data: CompletionTrendPoint[];
	range: AnalyticsDateRange;
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: Array<{ value: number; payload: CompletionTrendPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
	if (!active || !payload || payload.length === 0) return null;
	const point = payload[0].payload;
	const count = payload[0].value;

	return (
		<div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
			<div className="font-semibold">{point.label}</div>
			<div className="mt-1 text-muted-foreground">
				<span className="font-medium text-foreground">{count}</span> task
				{count === 1 ? "" : "s"} completed
			</div>
		</div>
	);
}

export function CompletionTrendChart({
	data,
	range,
}: CompletionTrendChartProps) {
	const totalCompleted = data.reduce(
		(sum, item) => sum + item.completedCount,
		0,
	);
	const rangeLabel =
		range === "today"
			? "Today"
			: range === "7d"
				? "Last 7 days"
				: range === "15d"
					? "Last 15 days"
					: "Last 30 days";

	// Calculate interval tick frequency for clean X-axis display
	const tickInterval = range === "30d" ? 4 : range === "15d" ? 1 : 0;

	return (
		<Card className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl">
			<CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
					<CardTitle className="text-sm sm:text-base font-semibold">
						Task Completion Trend
					</CardTitle>
					<span className="text-[11px] sm:text-xs text-muted-foreground font-normal">
						{totalCompleted} completed ({rangeLabel.toLowerCase()})
					</span>
				</div>
				<CardDescription className="text-[11px] sm:text-xs">
					Active tasks currently completed within the selected period
				</CardDescription>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 pt-1 sm:pt-2 flex-1">
				{totalCompleted === 0 ? (
					<div className="flex h-56 sm:h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center p-4 sm:p-6">
						<p className="text-xs sm:text-sm font-medium text-muted-foreground">
							No task completions recorded{" "}
							{range === "today"
								? "today"
								: `in the ${rangeLabel.toLowerCase()}`}
						</p>
						<p className="text-[11px] sm:text-xs text-muted-foreground/80 mt-1 max-w-xs">
							Tasks marked completed will appear in this timeline trend.
						</p>
					</div>
				) : (
					<div className="h-56 sm:h-64 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								data={data}
								margin={{
									top: 10,
									right: 8,
									left: -24,
									bottom: range === "30d" ? 25 : 10,
								}}
								accessibilityLayer
							>
								<CartesianGrid
									strokeDasharray="3 3"
									vertical={false}
									stroke="var(--border)"
									opacity={0.6}
								/>
								<XAxis
									dataKey="label"
									interval={tickInterval}
									angle={range === "30d" ? -35 : 0}
									textAnchor={range === "30d" ? "end" : "middle"}
									height={range === "30d" ? 35 : 20}
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
								<Bar
									dataKey="completedCount"
									name="Tasks Completed"
									fill="var(--brand-primary)"
									radius={[4, 4, 0, 0]}
									maxBarSize={range === "today" ? 48 : range === "7d" ? 32 : 20}
									isAnimationActive={false}
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}

				{/* Screen reader accessible summary table */}
				<div className="sr-only">
					<table>
						<caption>Task completion trend summary for {rangeLabel}</caption>
						<thead>
							<tr>
								<th scope="col">Period</th>
								<th scope="col">Completed Tasks</th>
							</tr>
						</thead>
						<tbody>
							{data.map((item) => (
								<tr key={item.dateKey}>
									<td>{item.label}</td>
									<td>{item.completedCount}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
