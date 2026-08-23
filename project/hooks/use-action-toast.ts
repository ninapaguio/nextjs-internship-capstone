"use client";

import { useEffect } from "react";
import { toast } from "sonner";

interface ToastActionState {
	status: "idle" | "success" | "error";
	message: string;
}

interface ActionToastOptions {
	successMessage?: string;
}

// Announces successful Server Actions while errors remain beside their controls.
export function useActionToast(
	state: ToastActionState,
	options: ActionToastOptions = {},
) {
	const { successMessage } = options;

	useEffect(() => {
		if (state.status === "success") {
			toast.success(successMessage ?? state.message);
		}
	}, [state, successMessage]);
}
