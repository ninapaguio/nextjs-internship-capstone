import { pgEnum } from "drizzle-orm/pg-core";

export const teamStatus = pgEnum("team_status", ["active", "archived"]);
export const listStatus = pgEnum("list_status", ["active", "archived"]);
export const invitationStatus = pgEnum("invitation_status", [
	"pending",
	"accepted",
	"declined",
	"expired",
	"revoked",
]);
export const projectStatus = pgEnum("project_status", [
	"inactive",
	"active",
	"completed",
	"archived",
]);
export const projectAccessRole = pgEnum("project_access_role", [
	"owner",
	"member",
]);
export const activityAction = pgEnum("activity_action", [
	"created",
	"updated",
	"moved",
	"assigned",
	"unassigned",
	"commented",
	"completed",
	"deleted",
	"restored",
	"archived",
	"unarchived",
]);
