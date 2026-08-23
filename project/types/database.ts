import type {
	comments,
	labels,
	lists,
	notifications,
	priorityOptions,
	projectMembers,
	projects,
	taskActivities,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
	teamRoles,
	teams,
	users,
} from "@/lib/db/schema";

// Keeping database row types inferred from Drizzle so they stay aligned with the columns returned by neon
export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamRole = typeof teamRoles.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type PriorityOption = typeof priorityOptions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type TaskDependency = typeof taskDependencies.$inferSelect;
export type TaskLabel = typeof taskLabels.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type TaskActivity = typeof taskActivities.$inferSelect;
export type Notification = typeof notifications.$inferSelect;

// Insert types describe the values accepted by Drizzle.
export type NewUser = typeof users.$inferInsert;
export type NewTeam = typeof teams.$inferInsert;
export type NewTeamRole = typeof teamRoles.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type NewList = typeof lists.$inferInsert;
export type NewLabel = typeof labels.$inferInsert;
export type NewTask = typeof tasks.$inferInsert;
export type NewTaskDependency = typeof taskDependencies.$inferInsert;
export type NewComment = typeof comments.$inferInsert;
export type NewNotification = typeof notifications.$inferInsert;
