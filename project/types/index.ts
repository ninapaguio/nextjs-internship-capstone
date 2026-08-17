// Public type API. Explicit exports make the available application types easy
// to discover and prevent accidental exports when a new local type is added

export type {
	BoardComplexityOption,
	BoardLabelOption,
	BoardList,
	BoardMemberOption,
	BoardTask,
	ProjectBoardData,
} from "./board";
export type {
	Comment,
	ComplexityOption,
	Label,
	List,
	NewComment,
	NewLabel,
	NewList,
	NewProject,
	NewTask,
	NewTeam,
	NewUser,
	Project,
	Task,
	TaskActivity,
	TaskAssignee,
	TaskLabel,
	Team,
	TeamMember,
	TeamRole,
	User,
} from "./database";
export type {
	CommentInput,
	CreateListInput,
	CreateProjectInput,
	CreateTaskInput,
	CreateTeamInput,
	LabelInput,
	MoveTaskInput,
	ProjectFilterInput,
	TaskAssignmentInput,
	TaskFilterInput,
	TeamInvitationInput,
	TeamRoleInput,
	UpdateListInput,
	UpdateProjectInput,
	UpdateTaskInput,
	UpdateTeamInput,
	UpdateTeamMemberInput,
	UserInput,
	UserUpdateInput,
} from "./inputs";
export type { ListWithTasks, ProjectBoard, ProjectCardView } from "./projects";
export type {
	CommentWithAuthor,
	TaskActivityWithActor,
	TaskDetails,
} from "./tasks";

export type { UIState } from "./ui";

export type MembershipStatus = "active" | "disabled";

export type MemberWorkStatus =
	| "has_updates"
	| "no_recent_updates"
	| "no_assigned_tasks";
