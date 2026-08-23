import { describe, expect, it } from "vitest";
import { createProjectSchema, updateBoardTaskSchema } from "@/lib/validations";

describe("createProjectSchema", () => {
	// Confirms valid form values are normalized and accepted.
	it("accepts valid project input", () => {
		const result = createProjectSchema.safeParse({
			name: " Internship Capstone ",
			description: "Project management application",
			startDate: "2026-08-23",
			endDate: "2026-09-23",
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.name).toBe("Internship Capstone");
		}
	});

	// Confirms a project cannot be created without a meaningful name.
	it("rejects an empty project name", () => {
		const result = createProjectSchema.safeParse({
			name: "   ",
			description: "",
			startDate: "",
			endDate: "",
		});

		expect(result.success).toBe(false);
	});

	// Confirms the end date cannot precede the project start date.
	it("rejects an invalid project date range", () => {
		const result = createProjectSchema.safeParse({
			name: "Internship Capstone",
			description: "",
			startDate: "2026-09-23",
			endDate: "2026-08-23",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.endDate).toContain(
				"End date cannot be earlier than start date",
			);
		}
	});
});

describe("updateBoardTaskSchema", () => {
	// Leaves dependency fields unchanged when they were not included in the form.
	it("preserves omitted dependency directions as undefined", () => {
		const result = updateBoardTaskSchema.safeParse({
			projectId: "11111111-1111-4111-8111-111111111111",
			taskId: "55555555-5555-4555-8555-555555555555",
			title: "Updated task",
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dependencyIds).toBeUndefined();
			expect(result.data.blockingTaskIds).toBeUndefined();
		}
	});

	// Uses an empty list to remove every dependency selected on that side.
	it("preserves an explicit empty dependency replacement", () => {
		const result = updateBoardTaskSchema.safeParse({
			projectId: "11111111-1111-4111-8111-111111111111",
			taskId: "55555555-5555-4555-8555-555555555555",
			dependencyIds: [],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.dependencyIds).toEqual([]);
			expect(result.data.blockingTaskIds).toBeUndefined();
		}
	});
});
