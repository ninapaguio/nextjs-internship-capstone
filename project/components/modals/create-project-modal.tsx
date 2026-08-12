"use client";

import {
	type CalendarDate,
	getLocalTimeZone,
	today,
} from "@internationalized/date";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus } from "lucide-react";
import {
	useActionState,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { RangeValue } from "react-aria-components";
import { useFormStatus } from "react-dom";
import {
	type CreateProjectActionState,
	createProject,
} from "@/actions/projects";
import { CreateTeamModal } from "@/components/modals/create-team-modal";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogClose,
	DialogDescription,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TeamOption {
	id: string;
	name: string;
}

interface CreateProjectModalProps {
	teams: TeamOption[];
}

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
export function CreateProjectModal({ teams }: CreateProjectModalProps) {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
	const [createdTeams, setCreatedTeams] = useState<TeamOption[]>([]);
	const [selectedTeamId, setSelectedTeamId] = useState("personal");
	const [dateRange, setDateRange] = useState<RangeValue<CalendarDate> | null>(
		null,
	);
	const [state, formAction] = useActionState(
		createProject,
		initialCreateProjectState,
	);
	const formRef = useRef<HTMLFormElement>(null);
	const teamOptions = [
		...createdTeams,
		...teams.filter(
			(team) => !createdTeams.some((createdTeam) => createdTeam.id === team.id),
		),
	];

	// Opens the team modal when team selector option is click
	function handleTeamSelection(teamId: string) {
		if (teamId === "create-team") {
			setIsOpen(false);
			setIsTeamModalOpen(true);
			return;
		}

		setSelectedTeamId(teamId);
	}

	// Adds a newly created team to the selector and restores the project modal
	const handleTeamCreated = useCallback((team: TeamOption) => {
		setCreatedTeams((currentTeams) => [team, ...currentTeams]);
		setSelectedTeamId(team.id);
		setIsOpen(true);
	}, []);

	// Returns to project creation when the separate team modal is dismissed
	const handleTeamModalOpenChange = useCallback((open: boolean) => {
		setIsTeamModalOpen(open);
		if (!open) setIsOpen(true);
	}, []);

	useEffect(() => {
		if (state.status === "success") {
			formRef.current?.reset();
			setDateRange(null);
			setIsOpen(false);
			void queryClient.invalidateQueries({ queryKey: ["projects"] });
		}
	}, [queryClient, state.status]);

	return (
		<>
			<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
				<Button size="sm" className="h-8 rounded-full px-3 text-xs shadow-sm">
					<Plus data-icon="inline-start" />
					New project
				</Button>
				<Dialog className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
					<DialogHeader className="pr-10">
						<DialogTitle className="text-xl">Create a new project</DialogTitle>
					</DialogHeader>

					<form ref={formRef} action={formAction} className="space-y-6">
						<FieldGroup className="gap-5">
							<Field data-invalid={Boolean(state.fieldErrors?.teamId)}>
								<FieldLabel>Team</FieldLabel>
								<Select
									name="teamId"
									aria-label="Team"
									value={selectedTeamId}
									onChange={(value) => handleTeamSelection(String(value))}
									aria-invalid={Boolean(state.fieldErrors?.teamId)}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem id="create-team">Create new team</SelectItem>
										<SelectItem id="personal">Only me</SelectItem>
										{teamOptions.map((team) => (
											<SelectItem key={team.id} id={team.id}>
												{team.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FieldDescription>
									Personal projects are visible only to you. Select a team to
									share the project with its members.
								</FieldDescription>
								<FieldError>{state.fieldErrors?.teamId?.[0]}</FieldError>
							</Field>

							<Field data-invalid={Boolean(state.fieldErrors?.name)}>
								<FieldLabel htmlFor="project-name">Project title</FieldLabel>
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

						<DialogFooter className="border-t pt-5">
							<DialogClose variant="ghost">Discard</DialogClose>
							<CreateProjectSubmit />
						</DialogFooter>
					</form>
				</Dialog>
			</DialogTrigger>
			<CreateTeamModal
				isOpen={isTeamModalOpen}
				onOpenChange={handleTeamModalOpenChange}
				onCreated={handleTeamCreated}
			/>
		</>
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
