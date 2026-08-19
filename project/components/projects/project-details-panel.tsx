"use client";

import {
	type CalendarDate,
	getLocalTimeZone,
	parseDate,
} from "@internationalized/date";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import type { RangeValue } from "react-aria-components";
import { changeProjectLifecycle, updateProject } from "@/actions/projects";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectCardData, ProjectMutationResult } from "@/types";

interface ProjectDetailsPanelProps {
	project: ProjectCardData | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onUpdate: (
		projectId: string,
		changes: Partial<ProjectCardData>,
		mutation: () => Promise<ProjectMutationResult>,
	) => void;
	onRemove: (
		projectId: string,
		mutation: () => Promise<ProjectMutationResult>,
	) => void;
}

// Converts saved project dates into the range calendar
function createSavedDateRange(project: ProjectCardData | null) {
	if (!project?.startDate || !project.endDate) return null;
	return {
		start: parseDate(project.startDate),
		end: parseDate(project.endDate),
	};
}

// Formats dates to be not 00/00/0000
function formatDateRange(range: RangeValue<CalendarDate> | null) {
	if (!range) return "Select start and end dates";
	const formatter = new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	return `${formatter.format(range.start.toDate(getLocalTimeZone()))} – ${formatter.format(range.end.toDate(getLocalTimeZone()))}`;
}

// Renders one shared side panel for editing, archiving, or deleting a project.
export function ProjectDetailsPanel({
	project,
	isOpen,
	onOpenChange,
	onUpdate,
	onRemove,
}: ProjectDetailsPanelProps) {
	const [error, setError] = useState<string | null>(null);
	const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
		useState(false);
	const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(
		() => createSavedDateRange(project),
	);

	useEffect(() => {
		setDateRange(createSavedDateRange(project));
		setError(null);
		setIsDeleteConfirmationOpen(false);
	}, [project]);

	if (!project) return null;
	const activeProject = project;

	// Submits edited fields through the project Server Action and optimistic cache.
	function handleUpdate(formData: FormData) {
		setError(null);
		const name = String(formData.get("name") ?? "");
		const description = String(formData.get("description") ?? "") || null;
		const startDate = dateRange?.start.toString() ?? null;
		const endDate = dateRange?.end.toString() ?? null;

		onUpdate(
			activeProject.id,
			{
				name,
				description,
				startDate,
				endDate,
			},
			async () => {
				const result = await updateProject(formData);
				if (result.status === "error") setError(result.message);
				else onOpenChange(false);
				return result;
			},
		);
	}

	// Submits an archive or soft-delete operation with optimistic card removal
	function handleLifecycle(action: "archive" | "delete") {
		setError(null);
		const formData = new FormData();
		formData.set("projectId", activeProject.id);
		formData.set("action", action);

		onRemove(activeProject.id, async () => {
			const result = await changeProjectLifecycle(formData);
			if (result.status === "error") setError(result.message);
			else onOpenChange(false);
			return result;
		});
	}

	return (
		<SheetContent
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			side="right"
			className="w-full sm:max-w-md"
		>
			<SheetHeader className="pr-14">
				<SheetTitle className="text-xl">Project details</SheetTitle>
				<SheetDescription>
					Edit project information or manage its lifecycle.
				</SheetDescription>
			</SheetHeader>

			<div className="min-h-0 flex-1 overflow-y-auto">
				<form action={handleUpdate} className="flex flex-col gap-5 px-6">
					<input type="hidden" name="projectId" value={project.id} />
					<Field>
						<FieldLabel htmlFor="edit-project-name">Project title</FieldLabel>
						<Input
							id="edit-project-name"
							name="name"
							defaultValue={project.name}
							required
							maxLength={160}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="edit-project-description">
							Description
						</FieldLabel>
						<Textarea
							id="edit-project-description"
							name="description"
							defaultValue={project.description ?? ""}
							maxLength={5000}
							className="min-h-28"
						/>
					</Field>
					<Field>
						<FieldLabel>Project timeline</FieldLabel>
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
								className="w-full justify-start font-normal"
							>
								<CalendarDays data-icon="inline-start" />
								{formatDateRange(dateRange)}
							</Button>
							<Popover className="w-auto p-0">
								<RangeCalendar
									aria-label="Project timeline"
									value={dateRange}
									onChange={setDateRange}
									numberOfMonths={1}
								/>
							</Popover>
						</PopoverTrigger>
					</Field>
					{error && (
						<p className="text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
					<SheetFooter className="border-t px-0 pt-4 pb-0">
						<Button type="submit">Save changes</Button>
					</SheetFooter>
				</form>

				<section
					className="mt-6 space-y-3 border-t p-6 pt-5"
					aria-labelledby="danger-zone-title"
				>
					<h3 id="danger-zone-title" className="font-semibold text-destructive">
						Danger zone
					</h3>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onPress={() => handleLifecycle("archive")}
						>
							Archive
						</Button>
						<Button
							type="button"
							variant="destructive"
							onPress={() => setIsDeleteConfirmationOpen(true)}
						>
							Delete
						</Button>
					</div>
					{isDeleteConfirmationOpen && (
						<div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
							<p className="text-sm">
								Delete <strong>{project.name}</strong>? It will be archived and
								soft-deleted from the application.
							</p>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="ghost"
									onPress={() => setIsDeleteConfirmationOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="button"
									variant="destructive"
									onPress={() => handleLifecycle("delete")}
								>
									Confirm delete
								</Button>
							</div>
						</div>
					)}
					<p className="text-xs text-muted-foreground">
						Archive hides the project and allows future restoration. <br />
						Delete performs a recoverable soft deletion.
					</p>
				</section>
			</div>
		</SheetContent>
	);
}
