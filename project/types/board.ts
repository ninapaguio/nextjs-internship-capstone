export interface BoardMemberOption {
	id: string;
	name: string;
	imageUrl: string | null;
}

export interface BoardComplexityOption {
	id: string;
	key: "low" | "medium" | "high";
	label: string;
}

export interface BoardLabelOption {
	id: string;
	name: string;
	color: string;
}

export interface BoardTask {
	id: string;
	listId: string;
	title: string;
	description: string | null;
	complexity: BoardComplexityOption;
	dueDate: string | null;
	position: number;
	completedAt: string | null;
	assignees: BoardMemberOption[];
	labels: BoardLabelOption[];
}

export interface BoardList {
	id: string;
	title: string;
	description: string | null;
	position: number;
	tasks: BoardTask[];
	archived?: boolean;
}

export interface ProjectBoardData {
	lists: BoardList[];
	complexityOptions: BoardComplexityOption[];
	members: BoardMemberOption[];
	labels: BoardLabelOption[];
}
