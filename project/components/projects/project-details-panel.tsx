"use client";

import {
	type CalendarDate,
	getLocalTimeZone,
	parseDate,
} from "@internationalized/date";
import { Archive, Ellipsis, FolderKanban, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { RangeValue } from "react-aria-components";
import { changeProjectLifecycle, updateProject } from "@/actions/projects";
import { ConfirmLifecycleDialog } from "@/components/modals/confirm-lifecycle-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import {
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
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
	const [lifecycleAction, setLifecycleAction] = useState<
		"archive" | "delete" | null
	>(null);
	const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(
		() => createSavedDateRange(project),
	);
	const [editingTitle, setEditingTitle] = useState(false);
	const [name, setName] = useState(project?.name ?? "");

	useEffect(() => {
		setDateRange(createSavedDateRange(project));
		setName(project?.name ?? "");
		setEditingTitle(false);
		setError(null);
		setLifecycleAction(null);
	}, [project]);

	if (!project) return null;
	const activeProject = project;

	// Submits edited fields through the project Server Action and optimistic cache.
	function handleUpdate(formData: FormData) {
		setError(null);
		const updatedName = String(formData.get("name") ?? "");
		const description = String(formData.get("description") ?? "") || null;
		const startDate = dateRange?.start.toString() ?? null;
		const endDate = dateRange?.end.toString() ?? null;

		onUpdate(
			activeProject.id,
			{
				name: updatedName,
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
		setLifecycleAction(null);
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
			showCloseButton={false}
			className="data-[side=right]:w-full! sm:data-[side=right]:w-[65vw]! sm:max-w-2xl! lg:max-w-3xl!"
		>
			<SheetHeader className="border-b pb-4">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs capitalize">
							<FolderKanban className="size-3.5 text-brand_teal-600 dark:text-brand_mint-400" />
							{project.status}
						</Badge>
					</div>

					<div className="flex items-center gap-1">
						<DropdownMenuTrigger>
							<TooltipTrigger delay={400}>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Project options"
								>
									<Ellipsis />
								</Button>
								<Tooltip placement="bottom">Project options</Tooltip>
							</TooltipTrigger>
							<DropdownMenu placement="bottom end">
								<DropdownMenuItem onAction={() => setLifecycleAction("archive")}>
									<Archive /> Archive project
								</DropdownMenuItem>
								<DropdownMenuItem
									className="text-destructive"
									onAction={() => setLifecycleAction("delete")}
								>
									<Trash2 /> Delete project
								</DropdownMenuItem>
							</DropdownMenu>
						</DropdownMenuTrigger>

						<TooltipTrigger delay={400}>
							<SheetClose
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Close panel"
							>
								<X />
							</SheetClose>
							<Tooltip placement="bottom end">Close panel</Tooltip>
						</TooltipTrigger>
					</div>
				</div>

				<div className="mt-3 flex min-w-0 items-start gap-3">
					<SheetTitle className="sr-only">Project details</SheetTitle>
					<div className="min-w-0 flex-1">
						{editingTitle ? (
							<Input
								aria-label="Project name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								maxLength={160}
								autoFocus
								className="h-10 w-full text-lg font-semibold"
							/>
						) : (
							<div className="max-w-full whitespace-normal py-1 text-left text-xl font-bold tracking-tight text-foreground wrap-anywhere">
								<span>{name}</span>{" "}
								<TooltipTrigger delay={400}>
									<Button
										type="button"
										variant="ghost"
										size="icon-xs"
										className="inline-flex align-text-bottom"
										aria-label="Edit project name"
										onPress={() => setEditingTitle(true)}
									>
										<Pencil />
									</Button>
									<Tooltip placement="bottom start">Edit project title</Tooltip>
								</TooltipTrigger>
							</div>
						)}
					</div>
				</div>
				<SheetDescription className="text-xs text-muted-foreground">
					Edit project information or manage its lifecycle.
				</SheetDescription>
			</SheetHeader>
			<form action={handleUpdate} className="flex flex-1 flex-col min-h-0">
				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
					<input type="hidden" name="projectId" value={project.id} />
					<input type="hidden" name="name" value={name} />

					<Field>
						<FieldLabel htmlFor="edit-project-description">
							Description
						</FieldLabel>
						<Textarea
							id="edit-project-description"
							name="description"
							defaultValue={project.description ?? ""}
							placeholder="What is this project trying to achieve?"
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
								className="h-9 w-full justify-start rounded-xl font-normal shadow-2xs"
							>
								{formatDateRange(dateRange)}
							</Button>
							<Popover className="w-auto p-0 shadow-md">
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
						<p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">
							{error}
						</p>
					)}
				</div>

				<SheetFooter className="border-t bg-card p-4 sm:justify-end">
					<Button type="submit" size="default">
						Save changes
					</Button>
				</SheetFooter>
			</form>

			{lifecycleAction && (
				<ConfirmLifecycleDialog
					action={lifecycleAction}
					itemName={activeProject.name}
					itemType="project"
					isOpen
					onOpenChange={(open) => {
						if (!open) setLifecycleAction(null);
					}}
					onConfirm={() => handleLifecycle(lifecycleAction)}
				/>
			)}
		</SheetContent>
	);
}
