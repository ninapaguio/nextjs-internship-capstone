// Client-only interface state belongs here rather than in the database schema.
export interface UIState {
	sidebarOpen: boolean;

	openSidebar: () => void;
	closeSidebar: () => void;
	toggleSidebar: () => void;
}
