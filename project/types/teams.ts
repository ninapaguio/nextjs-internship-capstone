// Summary data rendered by the team overview page.
export interface TeamListItem {
	id: string;
	name: string;
	description: string | null;
	isOwner: boolean;
	memberCount: number;
	projectCount: number;
}
