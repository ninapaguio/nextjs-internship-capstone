"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { BoardLabelOption } from "@/types";

interface TaskLabelSelectProps {
	labels: BoardLabelOption[];
	value: string | null;
	onChange: (labelId: string | null) => void;
	onCreateLabel: (name: string) => Promise<BoardLabelOption>;
}

// Provides one consistent selector for choosing, clearing, or creating a task label.
export function TaskLabelSelect({
	labels,
	value,
	onChange,
	onCreateLabel,
}: TaskLabelSelectProps) {
	const [isCreatorOpen, setIsCreatorOpen] = useState(false);
	const [newLabelName, setNewLabelName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);

	// Creates a reusable project label and selects it for the current task.
	async function handleCreateLabel() {
		const name = newLabelName.trim();
		if (!name || isCreating) return;
		setIsCreating(true);
		setError(null);
		try {
			const label = await onCreateLabel(name);
			onChange(label.id);
			setNewLabelName("");
			setIsCreatorOpen(false);
		} catch (createError) {
			setError(
				createError instanceof Error
					? createError.message
					: "The label was not created.",
			);
		} finally {
			setIsCreating(false);
		}
	}

	// Restores the label selector without creating the current draft.
	function cancelCreateLabel() {
		setNewLabelName("");
		setError(null);
		setIsCreatorOpen(false);
	}

	return (
		<div className="grid gap-2">
			{isCreatorOpen ? (
				<Input
					aria-label="New label name"
					placeholder={
						isCreating ? "Creating label…" : "Type a label and press Enter"
					}
					value={newLabelName}
					onChange={(event) => setNewLabelName(event.target.value)}
					maxLength={40}
					disabled={isCreating}
					autoFocus
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							event.preventDefault();
							handleCreateLabel();
						}
						if (event.key === "Escape") {
							event.preventDefault();
							event.stopPropagation();
							cancelCreateLabel();
						}
					}}
				/>
			) : (
				<Select
					className="w-full"
					aria-label="Label"
					value={value ?? "no-label"}
					onChange={(selectedValue) => {
						if (selectedValue === "create-label") {
							setIsCreatorOpen(true);
							return;
						}
						onChange(
							selectedValue === "no-label" ? null : String(selectedValue),
						);
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem id="create-label" textValue="Create tag">
							Create tag
						</SelectItem>
						<SelectSeparator />
						<SelectItem id="no-label">No label</SelectItem>
						{labels.map((label) => (
							<SelectItem key={label.id} id={label.id}>
								{label.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			{error ? (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
