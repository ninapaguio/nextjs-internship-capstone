import type { BoardComment } from "./board";

export type ActionStatus = "idle" | "success" | "error";

export interface BoardActionState {
	status: ActionStatus;
	message: string;
	data?: { id: string };
	fieldErrors?: Record<string, string[] | undefined>;
}

export interface CreateBoardLabelActionState extends BoardActionState {
	data?: { id: string; name: string; color: string };
}

export interface CreateBoardCommentActionState extends BoardActionState {
	data?: BoardComment;
}

export interface CreateProjectActionState {
	status: ActionStatus;
	message: string;
	fieldErrors?: Partial<
		Record<"name" | "description" | "startDate" | "endDate", string[]>
	>;
}

export interface ProjectMutationActionState {
	status: Exclude<ActionStatus, "idle">;
	message: string;
	fieldErrors?: Partial<
		Record<
			"projectId" | "name" | "description" | "startDate" | "endDate",
			string[]
		>
	>;
}

export interface ProjectMemberActionState {
	status: ActionStatus;
	message: string;
	redirectTo?: string;
	fieldErrors?: Partial<Record<"assignedRoleId", string[] | undefined>>;
}

export interface TeamRoleActionState {
	status: ActionStatus;
	message: string;
	fieldErrors?: Partial<Record<"name", string[] | undefined>>;
}

export interface InviteProjectMemberActionState {
	status: ActionStatus;
	message: string;
	fieldErrors?: Partial<Record<"email", string[] | undefined>>;
}

export interface ProjectInvitationDecisionActionState {
	status: ActionStatus;
	message: string;
	redirectTo?: string;
}

export interface CancelProjectInvitationActionState {
	status: ActionStatus;
	message: string;
}
