// TODO: Task 5.3 - Set up client-side state management with Zustand

/*
TODO: Implementation Notes for Interns:

UI state management store for:
- Modal states (create project, create task, etc.)
- Sidebar state
- Theme preferences
- Loading states
- Error states
- Notifications/toasts

Install: pnpm add zustand

Example structure:
import { create } from 'zustand'

interface UIState {
  // Modal states
  isCreateProjectModalOpen: boolean
  isCreateTaskModalOpen: boolean
  isTaskDetailModalOpen: boolean
  selectedTaskId: string | null

  // UI states
  sidebarOpen: boolean
  theme: 'light' | 'dark'

  // Loading states
  isLoading: boolean
  loadingMessage: string

  // Actions
  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openCreateTaskModal: () => void
  closeCreateTaskModal: () => void
  openTaskDetailModal: (taskId: string) => void
  closeTaskDetailModal: () => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setLoading: (loading: boolean, message?: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  // ... implementation
}))
*/

// Placeholder to prevent import errors
import { create } from "zustand";
import type { UIState } from "@/types";

export const useUIStore = create<UIState>((set) => ({
	sidebarOpen: false,
	createProjectModalOpen: false,
	createTaskModalOpen: false,
	selectedTaskId: null,

	openSidebar: () => set({ sidebarOpen: true }),
	closeSidebar: () => set({ sidebarOpen: false }),
	openCreateProjectModal: () => set({ createProjectModalOpen: true }),
	closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
	openCreateTaskModal: () => set({ createTaskModalOpen: true }),
	closeCreateTaskModal: () => set({ createTaskModalOpen: false }),
	openTaskDetails: (taskId) => set({ selectedTaskId: taskId }),
	closeTaskDetails: () => set({ selectedTaskId: null }),
}));
