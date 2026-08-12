import type {
	comments,
	complexityOptions,
	labels,
	lists,
	projects,
	taskActivities,
	taskAssignees,
	taskLabels,
	tasks,
	teamMembers,
	teamRoles,
	teams,
	users,
} from "@/lib/db/schema";

// Keeping database row types inferred from Drizzle so they stay aligned with the columns returned by neon
export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TeamRole = typeof teamRoles.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type List = typeof lists.$inferSelect;
export type Label = typeof labels.$inferSelect;
export type ComplexityOption = typeof complexityOptions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type TaskLabel = typeof taskLabels.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type TaskActivity = typeof taskActivities.$inferSelect;

// Insert types describe the values accepted by Drizzle. 
export type NewUser = typeof users.$inferInsert;
export type NewTeam = typeof teams.$inferInsert;
export type NewProject = typeof projects.$inferInsert;
export type NewList = typeof lists.$inferInsert;
export type NewLabel = typeof labels.$inferInsert;
export type NewTask = typeof tasks.$inferInsert;
export type NewComment = typeof comments.$inferInsert;
