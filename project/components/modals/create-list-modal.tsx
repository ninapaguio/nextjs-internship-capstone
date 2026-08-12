"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BoardList } from "@/stores/board-store";

interface CreateListModalProps {
	isOpen: boolean;
	list: BoardList | null;
	onOpenChange: (isOpen: boolean) => void;
	onSave: (title: string, description: string) => void;
}

// Collects a column name and optional description for add and edit operations.
export function CreateListModal({
	isOpen,
	list,
	onOpenChange,
	onSave,
}: CreateListModalProps) {
	// Validates and submits the column fields to the board state.
	function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const title = String(formData.get("title") ?? "").trim();
		const description = String(formData.get("description") ?? "").trim();
		if (!title) return;
		onSave(title, description);
		onOpenChange(false);
	}

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<form
				key={list?.id ?? "new-list"}
				onSubmit={handleSubmit}
				className="grid gap-5"
			>
				<DialogHeader>
					<DialogTitle>{list ? "Edit column" : "Add column"}</DialogTitle>
					<DialogDescription>
						Name the workflow stage and optionally explain what belongs in it.
					</DialogDescription>
				</DialogHeader>
				<label
					className="grid gap-2 text-sm font-medium"
					htmlFor="column-title"
				>
					Column name
					<Input
						id="column-title"
						name="title"
						defaultValue={list?.title ?? ""}
						placeholder="e.g. Review"
						required
						autoFocus
					/>
				</label>
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
					<Button type="submit">{list ? "Save changes" : "Add column"}</Button>
				</DialogFooter>
			</form>
		</Dialog>
	);
}
