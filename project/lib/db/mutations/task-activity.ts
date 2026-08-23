export interface ActivityEntity {
	id: string;
	name: string;
}

export interface TaskActivitySnapshot {
	title: string;
	description: string | null;
	dueDate: string | null;
	completed: boolean;
	list: ActivityEntity;
	priority: ActivityEntity;
	assignees: ActivityEntity[];
	labels: ActivityEntity[];
	dependencies: ActivityEntity[];
}

export interface TaskActivityInsert {
	taskId: string;
	actorId: string;
	action: "updated" | "moved" | "assigned" | "unassigned" | "completed";
	fieldName?: string;
	oldValue?: string | boolean | null;
	newValue?: string | boolean | null;
}

function compareActivityEntities(
	previous: ActivityEntity[],
	next: ActivityEntity[],
) {
	return {
		added: next.filter(
			(entity) => !previous.some((item) => item.id === entity.id),
		),
		removed: previous.filter(
			(entity) => !next.some((item) => item.id === entity.id),
		),
	};
}

// Builds immutable activity rows before the enclosing database batch is committed.
export function buildTaskSnapshotActivities(
	taskId: string,
	actorId: string,
	previous: TaskActivitySnapshot,
	next: TaskActivitySnapshot,
): TaskActivityInsert[] {
	const activityRows: TaskActivityInsert[] = [];
	const addUpdate = (
		fieldName: string,
		oldValue: string | null,
		newValue: string | null,
	) => {
		if (oldValue === newValue) return;
		activityRows.push({
			taskId,
			actorId,
			action: "updated",
			fieldName,
			oldValue,
			newValue,
		});
	};

	addUpdate("title", previous.title, next.title);
	addUpdate("description", previous.description, next.description);
	addUpdate("due_date", previous.dueDate, next.dueDate);
	addUpdate("priority", previous.priority.name, next.priority.name);

	if (previous.list.id !== next.list.id) {
		activityRows.push({
			taskId,
			actorId,
			action: "moved",
			fieldName: "column",
			oldValue: previous.list.name,
			newValue: next.list.name,
		});
	}
	if (previous.completed !== next.completed) {
		activityRows.push({
			taskId,
			actorId,
			action: next.completed ? "completed" : "updated",
			fieldName: "completion",
			oldValue: previous.completed,
			newValue: next.completed,
		});
	}

	const assignees = compareActivityEntities(previous.assignees, next.assignees);
	for (const member of assignees.added) {
		activityRows.push({
			taskId,
			actorId,
			action: "assigned",
			fieldName: "assignee",
			oldValue: null,
			newValue: member.name,
		});
	}
	for (const member of assignees.removed) {
		activityRows.push({
			taskId,
			actorId,
			action: "unassigned",
			fieldName: "assignee",
			oldValue: member.name,
			newValue: null,
		});
	}

	for (const [fieldName, changes] of [
		["label", compareActivityEntities(previous.labels, next.labels)],
		[
			"dependency",
			compareActivityEntities(previous.dependencies, next.dependencies),
		],
	] as const) {
		for (const entity of changes.added) {
			activityRows.push({
				taskId,
				actorId,
				action: "updated",
				fieldName,
				oldValue: null,
				newValue: entity.name,
			});
		}
		for (const entity of changes.removed) {
			activityRows.push({
				taskId,
				actorId,
				action: "updated",
				fieldName,
				oldValue: entity.name,
				newValue: null,
			});
		}
	}

	return activityRows;
}
