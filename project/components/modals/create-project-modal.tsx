"use client";

import {
	type CalendarDate,
	getLocalTimeZone,
	today,
} from "@internationalized/date";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import type { RangeValue } from "react-aria-components";
import { useFormStatus } from "react-dom";
import { createProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import type { CreateProjectActionState } from "@/types";

const initialCreateProjectState: CreateProjectActionState = {
	status: "idle",
	message: "",
};

// Formats the chosen project range for the date-picker trigger
function formatDateRange(range: RangeValue<CalendarDate> | null) {
	if (!range) return "Select start and end dates";

	const formatter = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});

	return `${formatter.format(range.start.toDate(getLocalTimeZone()))} – ${formatter.format(range.end.toDate(getLocalTimeZone()))}`;
}

// Shows a pending label and disables submission while the action is running
function CreateProjectSubmit() {
	const { pending } = useFormStatus();

	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Creating…" : "Create project"}
		</Button>
	);
}

// Renders the create-project dialog that connects to the server action and handles its state
export function CreateProjectModal() {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(
		null,
	);
	const [state, formAction] = useActionState(
		createProject,
		initialCreateProjectState,
	);
	useActionToast(state, { successMessage: "Project created." });
	const formRef = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (state.status === "success") {
			formRef.current?.reset();
			setDateRange(null);
			setIsOpen(false);
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
		}
	}, [queryClient, state.status]);

	return (
		<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
			<Button size="sm" aria-label="New project" className="px-2.5 sm:px-3">
				<Plus data-icon="inline-start" />
				<span className="hidden sm:inline">New project</span>
			</Button>
			<Dialog className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
				<DialogHeader className="pr-10">
					<DialogTitle className="text-xl">Create a new project</DialogTitle>
				</DialogHeader>

				<form ref={formRef} action={formAction} className="space-y-6">
					<FieldGroup className="gap-5">
						<Field data-invalid={Boolean(state.fieldErrors?.name)}>
							<FieldLabel htmlFor="project-name">
								Project title <span className="text-destructive">*</span>
							</FieldLabel>
							<Input
								id="project-name"
								name="name"
								placeholder="e.g. Product launch"
								maxLength={160}
								required
								aria-invalid={Boolean(state.fieldErrors?.name)}
							/>
							<FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
						</Field>

						<Field data-invalid={Boolean(state.fieldErrors?.description)}>
							<FieldLabel htmlFor="project-description">
								Description{" "}
								<span className="text-muted-foreground">(optional)</span>
							</FieldLabel>
							<Textarea
								id="project-description"
								name="description"
								placeholder="What is this project trying to achieve?"
								maxLength={5000}
								className="min-h-28"
								aria-invalid={Boolean(state.fieldErrors?.description)}
							/>
							<FieldError>{state.fieldErrors?.description?.[0]}</FieldError>
						</Field>

						<Field
							data-invalid={Boolean(
								state.fieldErrors?.startDate || state.fieldErrors?.endDate,
							)}
						>
							<FieldLabel>
								Project timeline{" "}
								<span className="text-muted-foreground">(optional)</span>
							</FieldLabel>
							<input
								type="hidden"
								name="startDate"
								value={dateRange?.start.toString() ?? ""}
							/>
							<input
								type="hidden"
								name="endDate"
								value={dateRange?.end.toString() ?? ""}
							/>
							<PopoverTrigger>
								<Button
									variant="outline"
									className="h-9 w-full justify-start rounded-md font-normal"
								>
									{formatDateRange(dateRange)}
								</Button>
								<Popover className="w-auto p-0">
									<RangeCalendar
										aria-label="Project timeline"
										value={dateRange}
										onChange={setDateRange}
										minValue={today(getLocalTimeZone())}
										numberOfMonths={2}
									/>
								</Popover>
							</PopoverTrigger>
							<FieldDescription>
								Dates are optional and can be changed later.
							</FieldDescription>
							<FieldError>
								{state.fieldErrors?.startDate?.[0] ??
									state.fieldErrors?.endDate?.[0]}
							</FieldError>
						</Field>
					</FieldGroup>

					{state.status === "error" && (
						<p
							className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
							role="alert"
						>
							{state.message}
						</p>
					)}

					<DialogFooter>
						<DialogClose variant="ghost">Discard</DialogClose>
						<CreateProjectSubmit />
					</DialogFooter>
				</form>
			</Dialog>
		</DialogTrigger>
	);
}

/* 
// TODO: Task 4.1 - Implement project CRUD operations
// TODO: Task 4.4 - Build task creation and editing functionality

/*
TODO: Implementation Notes for Interns:

Modal for creating new projects with form validation.

Features to implement:
- Form with project name, description, due date
- Zod validation
- Error handling
- Loading states
- Success feedback
- Team member assignment
- Project template selection

Form fields:
- Name (required)
- Description (optional)
- Due date (optional)
- Team members (optional)
- Project template (optional)
- Privacy settings

Integration:
- Use project validation schema from lib/validations.ts
- Call project creation API
- Update project list optimistically
- Handle errors gracefully
*/
