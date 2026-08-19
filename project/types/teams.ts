import type { ProjectInvitationListItem } from "./project-invitations";

// Summary data rendered by the team overview page.
export interface TeamListItem {
	id: string;
	name: string;
	description: string | null;
	isOwner: boolean;
	memberCount: number;
}

export type ProjectAccessRole = "owner" | "member";

export interface TeamProjectAssignment {
	projectId: string;
	projectName: string;
	accessRole: ProjectAccessRole;
	assignedRoleId: string | null;
	assignedRoleName: string | null;
	canManage: boolean;
}

export interface TeamRoleOption {
	id: string;
	name: string;
}

export interface TeamDetailMember {
	id: string;
	name: string;
	email: string;
	imageUrl: string | null;
	projectRole: ProjectAccessRole;
	projects: TeamProjectAssignment[];
}

export interface TeamDetailData {
	id: string;
	projectId: string;
	name: string;
	isOwner: boolean;
	roles: TeamRoleOption[];
	invitations: ProjectInvitationListItem[];
	members: TeamDetailMember[];
}
