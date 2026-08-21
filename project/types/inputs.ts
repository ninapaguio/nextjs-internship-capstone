import type { z } from "zod";
import type {
	commentSchema,
	createListSchema,
	createProjectSchema,
	createTaskSchema,
	labelSchema,
	moveTaskSchema,
	moveTasksSchema,
	projectFilterSchema,
	taskAssignmentSchema,
	taskFilterSchema,
	teamRoleSchema,
	updateListSchema,
	updateProjectMemberSchema,
	updateProjectSchema,
	updateTaskSchema,
	userSchema,
	userUpdateSchema,
} from "@/lib/validations";

// Input types come from the same Zod schemas used at runtime, to prevents Server Action's TypeScript type from disagreeing with its validation rules.
export type UserInput = z.infer<typeof userSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type TeamRoleInput = z.infer<typeof teamRoleSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectMemberInput = z.infer<
	typeof updateProjectMemberSchema
>;
export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type MoveTasksInput = z.infer<typeof moveTasksSchema>;
export type TaskAssignmentInput = z.infer<typeof taskAssignmentSchema>;
export type LabelInput = z.infer<typeof labelSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
