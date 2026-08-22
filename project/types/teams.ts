import type { ProjectInvitationListItem } from "./project-invitations";

// Summary data rendered by the team overview page.
export interface TeamListItem {
	id: string;
	name: string;
	description: string | null;
	accessRole: ProjectAccessRole;
	memberCount: number;
}

export type ProjectAccessRole = "owner" | "manager" | "member";

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
	assignedRoleId: string | null;
	assignedRoleName: string | null;
}

export interface TeamDetailData {
	id: string;
	projectId: string;
	name: string;
	isOwner: boolean;
	canManage: boolean;
	roles: TeamRoleOption[];
	invitations: ProjectInvitationListItem[];
	members: TeamDetailMember[];
}
