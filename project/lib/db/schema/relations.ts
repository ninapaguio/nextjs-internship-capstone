import { relations } from "drizzle-orm";
import { notifications } from "./notifications";
import { labels, lists, priorityOptions, projects } from "./projects";
import {
	comments,
	taskActivities,
	taskAssignees,
	taskDependencies,
	taskLabels,
	tasks,
} from "./tasks";
import { projectInvitations, projectMembers, teamRoles, teams } from "./teams";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
	createdTeamRoles: many(teamRoles),
	createdProjects: many(projects),
	projectMemberships: many(projectMembers, {
		relationName: "projectMembershipUser",
	}),
	addedProjectMembers: many(projectMembers, {
		relationName: "projectMembershipAddedBy",
	}),
	createdTasks: many(tasks),
	comments: many(comments),
	receivedNotifications: many(notifications, {
		relationName: "notificationRecipient",
	}),
	createdNotifications: many(notifications, {
		relationName: "notificationActor",
	}),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
	project: one(projects, {
		fields: [teams.projectId],
		references: [projects.id],
	}),
	roles: many(teamRoles),
}));

export const teamRolesRelations = relations(teamRoles, ({ one, many }) => ({
	team: one(teams, {
		fields: [teamRoles.teamId],
		references: [teams.id],
	}),
	createdBy: one(users, {
		fields: [teamRoles.createdById],
		references: [users.id],
	}),
	projectMembers: many(projectMembers),
}));

export const projectInvitationsRelations = relations(
	projectInvitations,
	({ one }) => ({
		project: one(projects, {
			fields: [projectInvitations.projectId],
			references: [projects.id],
		}),
		invitedBy: one(users, {
			fields: [projectInvitations.invitedById],
			references: [users.id],
		}),
	}),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
	team: one(teams),
	createdBy: one(users, {
		fields: [projects.createdById],
		references: [users.id],
	}),
	lists: many(lists),
	labels: many(labels),
	tasks: many(tasks),
	members: many(projectMembers),
	notifications: many(notifications),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id],
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id],
		relationName: "projectMembershipUser",
	}),
	addedBy: one(users, {
		fields: [projectMembers.addedById],
		references: [users.id],
		relationName: "projectMembershipAddedBy",
	}),
	assignedRole: one(teamRoles, {
		fields: [projectMembers.assignedRoleId],
		references: [teamRoles.id],
	}),
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

export const priorityOptionsRelations = relations(
	priorityOptions,
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
	priority: one(priorityOptions, {
		fields: [tasks.priorityId],
		references: [priorityOptions.id],
	}),
	assignees: many(taskAssignees),
	labels: many(taskLabels),
	dependencies: many(taskDependencies, {
		relationName: "taskDependencySource",
	}),
	dependents: many(taskDependencies, {
		relationName: "taskDependencyTarget",
	}),
	comments: many(comments),
	activities: many(taskActivities),
	notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	recipient: one(users, {
		fields: [notifications.recipientUserId],
		references: [users.id],
		relationName: "notificationRecipient",
	}),
	actor: one(users, {
		fields: [notifications.actorUserId],
		references: [users.id],
		relationName: "notificationActor",
	}),
	project: one(projects, {
		fields: [notifications.projectId],
		references: [projects.id],
	}),
	task: one(tasks, {
		fields: [notifications.taskId],
		references: [tasks.id],
	}),
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

export const taskDependenciesRelations = relations(
	taskDependencies,
	({ one }) => ({
		task: one(tasks, {
			fields: [taskDependencies.taskId],
			references: [tasks.id],
			relationName: "taskDependencySource",
		}),
		dependsOnTask: one(tasks, {
			fields: [taskDependencies.dependsOnTaskId],
			references: [tasks.id],
			relationName: "taskDependencyTarget",
		}),
		createdBy: one(users, {
			fields: [taskDependencies.createdById],
			references: [users.id],
		}),
	}),
);

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
