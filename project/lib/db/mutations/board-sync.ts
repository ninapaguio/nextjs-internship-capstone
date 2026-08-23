import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";

// Records one committed board change for clients waiting on this project.
export function advanceProjectBoardVersion(projectId: string) {
	return db
		.update(projects)
		.set({ boardVersion: sql`${projects.boardVersion} + 1` })
		.where(
			and(
				eq(projects.id, projectId),
				isNull(projects.archivedAt),
				isNull(projects.deletedAt),
			),
		);
}
