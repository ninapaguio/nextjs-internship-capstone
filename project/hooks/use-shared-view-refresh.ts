"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Refreshes shared server-rendered data when the user returns to the page.
export function useSharedViewRefresh() {
	const router = useRouter();

	useEffect(() => {
		// Refreshes once when a previously hidden tab becomes visible again.
		function refreshVisiblePage() {
			if (document.visibilityState !== "visible") return;
			router.refresh();
		}

		document.addEventListener("visibilitychange", refreshVisiblePage);

		return () => {
			document.removeEventListener("visibilitychange", refreshVisiblePage);
		};
	}, [router]);
}
