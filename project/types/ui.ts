// Client-only interface state belongs here rather than in the database schema.
export interface UIState {
	sidebarOpen: boolean;
	createProjectModalOpen: boolean;
	createTaskModalOpen: boolean;
	selectedTaskId: string | null;

	openSidebar: () => void;
	closeSidebar: () => void;
	toggleSidebar: () => void;
	openCreateProjectModal: () => void;
	closeCreateProjectModal: () => void;
	openCreateTaskModal: () => void;
	closeCreateTaskModal: () => void;
	openTaskDetails: (taskId: string) => void;
	closeTaskDetails: () => void;
}
