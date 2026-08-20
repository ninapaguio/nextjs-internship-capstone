// TODO: Task 3.6 - Set up data validation with Zod schemas

/*
TODO: Implementation Notes for Interns:

1. Install Zod: pnpm add zod
2. Create validation schemas for all forms and API endpoints
3. Add proper error messages
4. Set up client and server-side validation

Example schemas needed:
- Project creation/update
- Task creation/update
- User profile update
- List/column management
- Comment creation

Example structure:
import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  dueDate: z.date().min(new Date(), 'Due date must be in future').optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().optional(),
  assigneeId: z.string().uuid().optional(),
})
*/

// Placeholder exports to prevent import errors
/* export const projectSchema = "TODO: Implement project validation schema";
export const taskSchema = "TODO: Implement task validation schema";
export const userSchema = "TODO: Implement user validation schema";
export const listSchema = "TODO: Implement list validation schema";
export const commentSchema = "TODO: Implement comment validation schema"; */

import { z } from "zod";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function emptyStringToUndefined(value: unknown) {
	if (typeof value !== "string") return value;

	const trimmedValue = value.trim();
	return trimmedValue === "" ? undefined : trimmedValue;
}

function optionalText(maxLength: number, message: string) {
	return z.preprocess(
		emptyStringToUndefined,
		z.string().trim().max(maxLength, message).optional(),
	);
}

function nullableText(maxLength: number, message: string) {
	return z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === "" ? null : value,
		z.string().trim().max(maxLength, message).nullable().optional(),
	);
}

// Validates a duplicate-free collection of UUIDs within the requested limit.
function uniqueIds(
	message: string,
	maxValues = 100,
	maxMessage = "Too many values were selected",
) {
	return z
		.array(z.uuid("Each ID must be a valid UUID"))
		.max(maxValues, maxMessage)
		.refine((ids) => new Set(ids).size === ids.length, message)
		.default([]);
}

export const uuidSchema = z.uuid("Invalid ID");

export const dateSchema = z.iso.date({
	error: "Date must be a valid date using YYYY-MM-DD",
});

export const optionalDateSchema = z.preprocess(
	emptyStringToUndefined,
	dateSchema.optional(),
);

export const nullableDateSchema = z.preprocess(
	(value) => (typeof value === "string" && value.trim() === "" ? null : value),
	dateSchema.nullable().optional(),
);

export const normalizedEmailSchema = z
	.string()
	.trim()
	.min(1, "Email address is required")
	.max(320, "Email address is too long")
	.pipe(z.email("Enter a valid email address"))
	.transform((email) => email.toLowerCase());

export const projectStatusSchema = z.enum([
	"planned",
	"active",
	"completed",
	"archived",
]);

export const projectAccessRoleSchema = z.enum(["owner", "member"]);

export const teamRoleSchema = z
	.object({
		teamId: uuidSchema,
		name: z
			.string()
			.trim()
			.min(1, "Role name is required")
			.max(80, "Role name must be 80 characters or fewer"),
	})
	.strict();

export const updateTeamRoleSchema = teamRoleSchema
	.extend({ roleId: uuidSchema })
	.strict();

export const activityActionSchema = z.enum([
	"created",
	"updated",
	"moved",
	"assigned",
	"unassigned",
	"commented",
	"completed",
	"reopened",
	"deleted",
]);

const imageUrlSchema = z
	.url("Image URL is invalid")
	.max(2048, "Image URL is too long")
	.refine((value) => /^https:\/\//i.test(value), "Image is invalid");

// Skip an invalid Clerk profile image so user synchronization can continue.
const clerkImageUrlSchema = z
	.preprocess(emptyStringToUndefined, imageUrlSchema.optional())
	.catch(undefined);

const userFields = {
	clerkId: z.string().trim().min(1, "Clerk user ID is required").max(255),
	email: normalizedEmailSchema,
	username: z
		.string()
		.trim()
		.min(1, "Username is required")
		.max(100, "Username must be 100 characters or fewer"),
	firstName: optionalText(100, "First name is too long"),
	lastName: optionalText(100, "Last name is too long"),
	imageUrl: clerkImageUrlSchema,
};

// Validates user data received from a Clerk webhook
export const userSchema = z.object(userFields).strict();

export const userUpdateSchema = z
	.object({
		email: normalizedEmailSchema.optional(),
		username: userFields.username.optional(),
		firstName: optionalText(100, "First name is too long"),
		lastName: optionalText(100, "Last name is too long"),
		imageUrl: z.preprocess(emptyStringToUndefined, imageUrlSchema.optional()),
	})
	.strict();

export const projectInvitationSchema = z
	.object({
		projectId: uuidSchema,
		email: normalizedEmailSchema,
	})
	.strict();

export const projectInvitationDecisionSchema = z
	.object({ invitationId: uuidSchema })
	.strict();

export const projectInvitationCancellationSchema = z
	.object({ invitationId: uuidSchema })
	.strict();

const projectFields = {
	name: z
		.string()
		.trim()
		.min(1, "Project name is required")
		.max(160, "Project name must be 160 characters or fewer"),
	description: optionalText(
		5000,
		"Project description must be 5,000 characters or fewer",
	),
	startDate: optionalDateSchema,
	endDate: optionalDateSchema,
};

type ProjectDateInput = {
	startDate?: string | null;
	endDate?: string | null;
};

function validateProjectDateRange(
	input: ProjectDateInput,
	ctx: z.RefinementCtx,
) {
	if (input.startDate && input.endDate && input.endDate < input.startDate) {
		ctx.addIssue({
			code: "custom",
			message: "End date cannot be earlier than start date",
			path: ["endDate"],
		});
	}
}

export const createProjectSchema = z
	.object(projectFields)
	.strict()
	.superRefine(validateProjectDateRange);

export const updateProjectSchema = z
	.object({
		projectId: uuidSchema,
		name: projectFields.name.optional(),
		description: nullableText(
			5000,
			"Project description must be 5,000 characters or fewer",
		),
		startDate: nullableDateSchema,
		endDate: nullableDateSchema,
	})
	.strict()
	.superRefine((input, ctx) => {
		if (
			!Object.entries(input).some(
				([key, value]) => key !== "projectId" && value !== undefined,
			)
		) {
			ctx.addIssue({
				code: "custom",
				message: "Provide at least one project field to update",
			});
		}

		validateProjectDateRange(input, ctx);
	});

export const updateProjectMemberSchema = z
	.object({
		teamId: uuidSchema,
		projectId: uuidSchema,
		userId: uuidSchema,
		assignedRoleId: z
			.union([uuidSchema, z.literal("")])
			.transform((value) => value || null),
	})
	.strict();

export const removeProjectMemberSchema = z
	.object({
		teamId: uuidSchema,
		projectId: uuidSchema,
		userId: uuidSchema,
	})
	.strict();

const listFields = {
	projectId: uuidSchema,
	name: z
		.string()
		.trim()
		.min(1, "Column name is required")
		.max(100, "Column name must be 100 characters or fewer"),
	description: optionalText(
		2000,
		"Column description must be 2,000 characters or fewer",
	),
	position: z.coerce
		.number()
		.int("Position must be a whole number")
		.min(0, "Position cannot be negative")
		.optional(),
};

export const createListSchema = z.object(listFields).strict();
export const updateListSchema = z
	.object({
		name: listFields.name.optional(),
		description: nullableText(
			2000,
			"Column description must be 2,000 characters or fewer",
		),
		position: listFields.position.optional(),
	})
	.strict()
	.refine(
		(input) => Object.values(input).some((value) => value !== undefined),
		{
			message: "Provide at least one column field to update",
		},
	);

export const listLifecycleSchema = z
	.object({
		projectId: uuidSchema,
		listId: uuidSchema,
		action: z.enum(["archive", "restore", "delete"]),
	})
	.strict();

const taskFields = {
	projectId: uuidSchema,
	listId: uuidSchema,
	title: z
		.string()
		.trim()
		.min(1, "Task title is required")
		.max(200, "Task title must be 200 characters or fewer"),
	description: optionalText(
		10_000,
		"Task description must be 10,000 characters or fewer",
	),
	complexityId: uuidSchema,
	dueDate: optionalDateSchema,
	position: z.coerce
		.number()
		.int("Position must be a whole number")
		.min(0, "Position cannot be negative")
		.optional(),
	assigneeIds: uniqueIds("An assignee cannot be selected twice"),
	labelIds: uniqueIds(
		"A label cannot be selected twice",
		1,
		"A task can have only one label",
	),
};

export const createTaskSchema = z.object(taskFields).strict();

export const updateTaskSchema = z
	.object({
		title: taskFields.title.optional(),
		description: nullableText(
			10_000,
			"Task description must be 10,000 characters or fewer",
		),
		complexityId: taskFields.complexityId.optional(),
		dueDate: nullableDateSchema,
		assigneeIds: taskFields.assigneeIds.optional(),
		labelIds: taskFields.labelIds.optional(),
		dependencyIds: uniqueIds(
			"A dependency cannot be selected twice",
		).optional(),
	})
	.strict()
	.refine(
		(input) => Object.values(input).some((value) => value !== undefined),
		{
			message: "Provide at least one task field to update",
		},
	);

export const updateBoardTaskSchema = z
	.object({
		projectId: uuidSchema,
		taskId: uuidSchema,
		listId: uuidSchema.optional(),
		title: taskFields.title.optional(),
		description: nullableText(
			10_000,
			"Task description must be 10,000 characters or fewer",
		),
		complexityId: taskFields.complexityId.optional(),
		dueDate: nullableDateSchema,
		completed: z.union([z.boolean(), z.stringbool()]).optional(),
		assigneeIds: taskFields.assigneeIds.optional(),
		labelIds: taskFields.labelIds.optional(),
		dependencyIds: uniqueIds(
			"A dependency cannot be selected twice",
		).optional(),
	})
	.strict()
	.refine(
		(input) =>
			Object.entries(input).some(
				([key, value]) =>
					key !== "projectId" && key !== "taskId" && value !== undefined,
			),
		{ message: "Provide at least one task field to update" },
	);

export const taskLifecycleSchema = z
	.object({
		projectId: uuidSchema,
		taskId: uuidSchema,
		action: z.literal("delete"),
	})
	.strict();

export const moveTaskSchema = z
	.object({
		projectId: uuidSchema,
		taskId: uuidSchema,
		targetListId: uuidSchema,
		position: z.coerce
			.number()
			.int("Position must be a whole number")
			.min(0, "Position cannot be negative"),
	})
	.strict();

export const taskCompletionSchema = z
	.object({
		projectId: uuidSchema,
		taskId: uuidSchema,
		completed: z.boolean(),
	})
	.strict();

export const taskAssignmentSchema = z
	.object({
		projectId: uuidSchema,
		taskId: uuidSchema,
		userIds: uniqueIds("An assignee cannot be selected twice"),
	})
	.strict();

export const labelSchema = z
	.object({
		projectId: uuidSchema,
		name: z
			.string()
			.trim()
			.min(1, "Label name is required")
			.max(50, "Label name must be 50 characters or fewer"),
		color: z
			.string()
			.trim()
			.regex(HEX_COLOR_PATTERN, "Color must be a six-digit hex value"),
	})
	.strict();

export const commentSchema = z
	.object({
		taskId: uuidSchema,
		content: z
			.string()
			.trim()
			.min(1, "Comment cannot be empty")
			.max(5000, "Comment must be 5,000 characters or fewer"),
	})
	.strict();

export const updateCommentSchema = z
	.object({
		commentId: uuidSchema,
		content: commentSchema.shape.content,
	})
	.strict();

export const entityIdSchema = z.object({ id: uuidSchema }).strict();

export const projectLifecycleSchema = z
	.object({
		projectId: uuidSchema,
		action: z.enum(["archive", "restore", "delete"]),
	})
	.strict();

const booleanQuerySchema = z.union([
	z.boolean(),
	z.stringbool({
		truthy: ["true"],
		falsy: ["false"],
		case: "sensitive",
	}),
]);

export const paginationSchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		pageSize: z.coerce.number().int().min(1).max(100).default(20),
	})
	.strict();

export const projectFilterSchema = z
	.object({
		query: optionalText(100, "Search query is too long"),
		teamId: uuidSchema.optional(),
		status: projectStatusSchema.exclude(["archived"]).optional(),
		includeArchived: booleanQuerySchema.default(false),
		page: z.coerce.number().int().min(1).default(1),
		pageSize: z.coerce.number().int().min(1).max(100).default(20),
	})
	.strict();

export const taskFilterSchema = z
	.object({
		projectId: uuidSchema,
		query: optionalText(100, "Search query is too long"),
		listId: uuidSchema.optional(),
		complexityId: uuidSchema.optional(),
		assigneeId: uuidSchema.optional(),
		labelId: uuidSchema.optional(),
		completed: booleanQuerySchema.optional(),
		dueBefore: optionalDateSchema,
		includeArchived: booleanQuerySchema.default(false),
		page: z.coerce.number().int().min(1).default(1),
		pageSize: z.coerce.number().int().min(1).max(100).default(50),
	})
	.strict();
