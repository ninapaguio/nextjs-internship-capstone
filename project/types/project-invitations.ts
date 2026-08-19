export type ProjectInvitationManagementStatus =
	| "pending"
	| "declined"
	| "expired";

export interface ProjectInvitationListItem {
	id: string;
	email: string;
	status: ProjectInvitationManagementStatus;
	createdAt: Date;
	expiresAt: Date;
}

export interface ProjectInvitationDecisionData {
	id: string;
	projectName: string;
	projectDescription: string | null;
	expiresAt: Date;
}

export interface ProjectInvitationDecisionProps {
	invitation: ProjectInvitationDecisionData;
}

export interface ProjectInvitationsManagerProps {
	invitations: ProjectInvitationListItem[];
}

export interface InvitationStateOption {
	id: ProjectInvitationManagementStatus;
	label: string;
}

export interface InviteProjectMemberModalProps {
	projectId: string;
	projectName: string;
}

export interface ProjectInvitationPageProps {
	params: Promise<{ invitationId: string }>;
}

export interface AcceptInvitationPageProps {
	searchParams: Promise<{ invitation?: string }>;
}
