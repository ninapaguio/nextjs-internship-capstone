// Shared shell state belongs here
import { create } from "zustand";
import type { UIState } from "@/types";

export const useUIStore = create<UIState>((set) => ({
	sidebarOpen: true,

	openSidebar: () => set({ sidebarOpen: true }),
	closeSidebar: () => set({ sidebarOpen: false }),
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
