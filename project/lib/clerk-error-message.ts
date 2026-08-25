interface ClerkErrorLike {
	errors?: Array<{ longMessage?: string; message?: string }>;
	longMessage?: string;
	message?: string;
}

// Returns clerk user message while keeping a safe fallback for unknown failures.
export function getClerkErrorMessage(error: unknown, fallback: string) {
	if (!error || typeof error !== "object") return fallback;

	const clerkError = error as ClerkErrorLike;
	return (
		clerkError.longMessage ||
		clerkError.errors?.[0]?.longMessage ||
		clerkError.errors?.[0]?.message ||
		clerkError.message ||
		fallback
	);
}
