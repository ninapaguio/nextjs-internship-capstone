import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { z } from "zod";
import { CalendarViewComponent } from "@/components/calendar/calendar-view";
import { ensureApplicationUser } from "@/lib/auth/ensure-application-user";
import { formatDateKey } from "@/lib/calendar";
import {
	getCalendarDataForUser,
	getCalendarTaskCreationOptionsForUser,
} from "@/lib/db/queries/calendar";

interface CalendarPageProps {
	searchParams: Promise<{
		date?: string;
		view?: string;
		task?: string;
	}>;
}

// Confirms a navigation date is a real local calendar day, not only a matching string.
function isValidDateKey(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	return formatDateKey(new Date(year, month - 1, day)) === value;
}

const calendarNavigationSchema = z.object({
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.refine(isValidDateKey)
		.optional(),
	view: z.enum(["month", "week"]).optional(),
	task: z.uuid().optional(),
});

export const metadata: Metadata = {
	title: "Calendar",
	description: "View project deadlines and team schedules.",
	openGraph: {
		title: "Calendar | EverFlow",
		description: "View project deadlines and team schedules.",
	},
};

// Loads the signed-in user's project schedules and task deadlines for the calendar.
export default async function CalendarPage({ searchParams }: CalendarPageProps) {
	const { userId: clerkId } = await auth();
	const applicationUser = clerkId ? await ensureApplicationUser(clerkId) : null;

	if (!applicationUser) {
		return (
			<section className="mx-auto max-w-7xl py-8">
				<div className="rounded-4xl border bg-card p-8 text-center">
					<h1 className="text-xl font-semibold">
						We couldn't load your workspace
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Refresh the page to try again. If the problem continues, sign out
						and sign back in.
					</p>
				</div>
			</section>
		);
	}

	const navigation = calendarNavigationSchema.safeParse(await searchParams);
	const [calendarData, taskCreationOptions] = await Promise.all([
		getCalendarDataForUser(applicationUser.id),
		getCalendarTaskCreationOptionsForUser(applicationUser.id),
	]);

	return (
		<CalendarViewComponent
			calendarData={calendarData}
			today={formatDateKey(new Date())}
			initialDate={navigation.success ? navigation.data.date : undefined}
			initialView={navigation.success ? navigation.data.view : undefined}
			highlightedTaskId={
				navigation.success ? navigation.data.task : undefined
			}
			taskCreationOptions={taskCreationOptions}
		/>
	);
}
