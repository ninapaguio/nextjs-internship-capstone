"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
	value: string[];
	onChange: (labelIds: string[]) => void;
	onCreateLabel: (name: string) => Promise<BoardLabelOption>;
}

const maximumTaskLabels = 3;

// Provides one selector for choosing up to three labels or creating a reusable label.
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
			onChange([...value, label.id].slice(0, maximumTaskLabels));
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
				<div className="flex min-w-0 gap-2">
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
					<Button
						type="button"
						variant="outline"
						isDisabled={isCreating}
						onPress={cancelCreateLabel}
					>
						Cancel
					</Button>
				</div>
			) : (
				<Select
					className="w-full"
					aria-label="Label"
					selectionMode="multiple"
					value={value}
					onChange={(selectedValues) => {
						const nextValues = Array.from(selectedValues, String);
						if (nextValues.includes("create-label")) {
							setIsCreatorOpen(true);
							return;
						}
						if (nextValues.includes("no-label")) {
							onChange([]);
							return;
						}
						if (nextValues.length > maximumTaskLabels) {
							setError("A task can have at most three labels.");
							return;
						}
						setError(null);
						onChange(nextValues);
					}}
				>
					<SelectTrigger className="w-full">
						<SelectValue>
							{({ selectedText }) => selectedText || "No labels"}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							id="create-label"
							textValue="Create tag"
							isDisabled={value.length >= maximumTaskLabels}
						>
							Create tag
						</SelectItem>
						<SelectSeparator />
						<SelectItem id="no-label">No label</SelectItem>
						{labels.map((label) => (
							<SelectItem
								key={label.id}
								id={label.id}
								isDisabled={
									value.length >= maximumTaskLabels && !value.includes(label.id)
								}
							>
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
