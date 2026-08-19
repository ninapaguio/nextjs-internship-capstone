"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createBoardList, updateBoardList } from "@/actions/board";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BoardActionState, BoardList } from "@/types";

interface CreateListModalProps {
	projectId: string;
	isOpen: boolean;
	list: BoardList | null;
	nextPosition: number;
	onOpenChange: (isOpen: boolean) => void;
	onSaved: (list: BoardList) => void;
}

const initialState: BoardActionState = { status: "idle", message: "" };

// Shows pending feedback while a column is persisted.
function ListSubmit({ isEditing }: { isEditing: boolean }) {
	const { pending } = useFormStatus();
	return (
		<Button type="submit" isDisabled={pending}>
			{pending ? "Saving…" : isEditing ? "Save changes" : "Add column"}
		</Button>
	);
}

// Collects a column name and optional description for add and edit operations.
export function CreateListModal({
	projectId,
	isOpen,
	list,
	nextPosition,
	onOpenChange,
	onSaved,
}: CreateListModalProps) {
	// Persists the column, then publishes the confirmed record to Zustand.
	const [state, formAction] = useActionState(
		async (
			_previousState: BoardActionState,
			formData: FormData,
		): Promise<BoardActionState> => {
			const result = list
				? await updateBoardList(formData)
				: await createBoardList(_previousState, formData);
			if (result.status !== "success") return result;
			const id = list?.id ?? result.data?.id;
			if (!id) return { status: "error", message: "The column ID is missing." };
			onSaved({
				id,
				title: String(formData.get("name") ?? ""),
				description: String(formData.get("description") ?? "") || null,
				position: list?.position ?? nextPosition,
				tasks: list?.tasks ?? [],
			});
			onOpenChange(false);
			return result;
		},
		initialState,
	);

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<form
				key={list?.id ?? "new-list"}
				action={formAction}
				className="grid gap-5"
			>
				<input type="hidden" name="projectId" value={projectId} />
				<input type="hidden" name="listId" value={list?.id ?? ""} />
				<input
					type="hidden"
					name="position"
					value={list?.position ?? nextPosition}
				/>
				<DialogHeader>
					<DialogTitle>{list ? "Edit column" : "Add column"}</DialogTitle>
				</DialogHeader>
				<label
					className="grid gap-2 text-sm font-medium"
					htmlFor="column-title"
				>
					Column name
					<Input
						id="column-title"
						name="name"
						defaultValue={list?.title ?? ""}
						placeholder="e.g. Review"
						required
						autoFocus
					/>
				</label>
				{state.status === "error" ? (
					<p className="text-sm font-medium text-destructive" role="alert">
						{state.message}
					</p>
				) : null}
				<label
					className="grid gap-2 text-sm font-medium"
					htmlFor="column-description"
				>
					Description{" "}
					<span className="font-normal text-muted-foreground">(optional)</span>
					<Textarea
						id="column-description"
						name="description"
						defaultValue={list?.description ?? ""}
						placeholder="What work belongs in this column?"
					/>
				</label>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onPress={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<ListSubmit isEditing={Boolean(list)} />
				</DialogFooter>
			</form>
		</Dialog>
	);
}
