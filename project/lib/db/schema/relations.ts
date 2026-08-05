import { relations } from "drizzle-orm";
import { complexityOptions, labels, lists, projects } from "./projects";
import {
	comments,
	taskActivities,
	taskAssignees,
	taskLabels,
	tasks,
} from "./tasks";
import {
	permissions,
	rolePermissions,
	teamInvitations,
	teamMembers,
	teamRoles,
	teams,
} from "./teams";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
	createdTeams: many(teams),
	teamMemberships: many(teamMembers),
	createdProjects: many(projects),
	createdTasks: many(tasks),
	comments: many(comments),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [teams.createdById],
		references: [users.id],
	}),
	roles: many(teamRoles),
	members: many(teamMembers),
	invitations: many(teamInvitations),
	projects: many(projects),
}));

export const teamRolesRelations = relations(teamRoles, ({ one, many }) => ({
	team: one(teams, {
		fields: [teamRoles.teamId],
		references: [teams.id],
	}),
	members: many(teamMembers),
	permissions: many(rolePermissions),
	invitations: many(teamInvitations),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
	roles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
	rolePermissions,
	({ one }) => ({
		role: one(teamRoles, {
			fields: [rolePermissions.roleId],
			references: [teamRoles.id],
		}),
		permission: one(permissions, {
			fields: [rolePermissions.permissionId],
			references: [permissions.id],
		}),
	}),
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
	team: one(teams, {
		fields: [teamMembers.teamId],
		references: [teams.id],
	}),
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id],
	}),
	role: one(teamRoles, {
		fields: [teamMembers.roleId],
		references: [teamRoles.id],
	}),
}));

export const teamInvitationsRelations = relations(
	teamInvitations,
	({ one }) => ({
		team: one(teams, {
			fields: [teamInvitations.teamId],
			references: [teams.id],
		}),
		role: one(teamRoles, {
			fields: [teamInvitations.roleId],
			references: [teamRoles.id],
		}),
		invitedBy: one(users, {
			fields: [teamInvitations.invitedById],
			references: [users.id],
		}),
	}),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
	team: one(teams, {
		fields: [projects.teamId],
		references: [teams.id],
	}),
	createdBy: one(users, {
		fields: [projects.createdById],
		references: [users.id],
	}),
	lists: many(lists),
	labels: many(labels),
	tasks: many(tasks),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
	project: one(projects, {
		fields: [lists.projectId],
		references: [projects.id],
	}),
	tasks: many(tasks),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
	project: one(projects, {
		fields: [labels.projectId],
		references: [projects.id],
	}),
	tasks: many(taskLabels),
}));

export const complexityOptionsRelations = relations(
	complexityOptions,
	({ many }) => ({ tasks: many(tasks) }),
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	project: one(projects, {
		fields: [tasks.projectId],
		references: [projects.id],
	}),
	list: one(lists, {
		fields: [tasks.listId],
		references: [lists.id],
	}),
	createdBy: one(users, {
		fields: [tasks.createdById],
		references: [users.id],
	}),
	complexity: one(complexityOptions, {
		fields: [tasks.complexityId],
		references: [complexityOptions.id],
	}),
	assignees: many(taskAssignees),
	labels: many(taskLabels),
	comments: many(comments),
	activities: many(taskActivities),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
	task: one(tasks, {
		fields: [taskAssignees.taskId],
		references: [tasks.id],
	}),
	user: one(users, {
		fields: [taskAssignees.userId],
		references: [users.id],
	}),
}));

export const taskLabelsRelations = relations(taskLabels, ({ one }) => ({
	task: one(tasks, {
		fields: [taskLabels.taskId],
		references: [tasks.id],
	}),
	label: one(labels, {
		fields: [taskLabels.labelId],
		references: [labels.id],
	}),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	task: one(tasks, {
		fields: [comments.taskId],
		references: [tasks.id],
	}),
	author: one(users, {
		fields: [comments.authorId],
		references: [users.id],
	}),
}));

export const taskActivitiesRelations = relations(taskActivities, ({ one }) => ({
	task: one(tasks, {
		fields: [taskActivities.taskId],
		references: [tasks.id],
	}),
	actor: one(users, {
		fields: [taskActivities.actorId],
		references: [users.id],
	}),
}));
