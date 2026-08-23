export const PROJECT_BOARD_UPDATED_EVENT = "board-updated";

export interface ProjectRealtimeConfig {
	key: string;
	cluster: string;
}

// Creates the private channel shared only by members of one Project board.
export function getProjectBoardChannelName(projectId: string) {
	return `private-project-${projectId}`;
}
