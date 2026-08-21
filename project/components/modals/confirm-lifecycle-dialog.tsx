"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmLifecycleDialogProps {
	action: "archive" | "delete";
	itemName: string;
	itemType: "project" | "task" | "column";
	isOpen: boolean;
	isPending?: boolean;
	onConfirm: () => void;
	onOpenChange: (isOpen: boolean) => void;
}

// Confirms an archive or delete request before the performs the mutation.
export function ConfirmLifecycleDialog({
	action,
	itemName,
	itemType,
	isOpen,
	isPending = false,
	onConfirm,
	onOpenChange,
}: ConfirmLifecycleDialogProps) {
	const isDelete = action === "delete";
	const actionLabel = isDelete ? "Delete" : "Archive";

	return (
		<Dialog
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			isDismissable={!isPending}
			showCloseButton={!isPending}
		>
			<DialogHeader>
				<DialogTitle>
					Are you sure you want to {action} this {itemType}?
				</DialogTitle>
				<DialogDescription>
					<strong className="font-medium text-foreground">{itemName}</strong>{" "}
					{isDelete
						? "will be removed from the application."
						: "will be hidden from active views and can be restored later."}
				</DialogDescription>
			</DialogHeader>
			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					isDisabled={isPending}
					onPress={() => onOpenChange(false)}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant={isDelete ? "destructive" : "default"}
					isDisabled={isPending}
					onPress={onConfirm}
				>
					{isPending ? `${actionLabel}ing…` : `${actionLabel} ${itemType}`}
				</Button>
			</DialogFooter>
		</Dialog>
	);
}
