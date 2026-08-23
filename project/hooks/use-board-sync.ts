"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";
import {
	getProjectBoardChannelName,
	PROJECT_BOARD_UPDATED_EVENT,
	type ProjectRealtimeConfig,
} from "@/lib/realtime/project-board";
import { getPusherClient } from "@/lib/realtime/pusher-client";

const BOARD_POLL_INTERVAL_MS = 5_000;
const BOARD_RECOVERY_INTERVAL_MS = 120_000;
const boardVersionResponseSchema = z.object({
	boardVersion: z.number().int().nonnegative(),
});
const boardUpdatedEventSchema = z.object({
	projectId: z.string().uuid(),
	boardVersion: z.number().int().nonnegative(),
});

interface UseBoardSyncInput {
	projectId: string;
	boardVersion: number;
	isPaused: boolean;
	realtimeConfig: ProjectRealtimeConfig | null;
}

// Loads the latest revision without downloading the full board.
async function fetchBoardVersion(projectId: string, signal: AbortSignal) {
	const response = await fetch(
		`/api/projects/${encodeURIComponent(projectId)}/board-version`,
		{ cache: "no-store", signal },
	);
	if ([401, 403, 404].includes(response.status)) return null;
	if (!response.ok) throw new Error("Board version could not be loaded.");

	const parsed = boardVersionResponseSchema.safeParse(await response.json());
	if (!parsed.success) throw new Error("Board version response was invalid.");
	return parsed.data.boardVersion;
}

// Refreshes an open board when another client commits a newer revision.
export function useBoardSync({
	projectId,
	boardVersion,
	isPaused,
	realtimeConfig,
}: UseBoardSyncInput) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const isChecking = useRef(false);
	const requestedVersion = useRef<number | null>(null);
	const pendingRemoteVersion = useRef<number | null>(null);
	const isPausedRef = useRef(isPaused);
	const realtimeKey = realtimeConfig?.key ?? null;
	const realtimeCluster = realtimeConfig?.cluster ?? null;

	// Reloads task details that stay mounted while the board route refreshes.
	const refreshOpenTaskDetails = useCallback(() => {
		void queryClient.invalidateQueries({
			predicate: ({ queryKey }) =>
				(queryKey[0] === "task-comments" || queryKey[0] === "task-activity") &&
				queryKey[1] === projectId,
		});
	}, [projectId, queryClient]);

	useEffect(() => {
		isPausedRef.current = isPaused;
		if (isPaused) return;

		const pendingVersion = pendingRemoteVersion.current;
		if (pendingVersion === null || pendingVersion <= boardVersion) return;
		pendingRemoteVersion.current = null;
		requestedVersion.current = pendingVersion;
		refreshOpenTaskDetails();
		router.refresh();
	}, [boardVersion, isPaused, refreshOpenTaskDetails, router]);

	useEffect(() => {
		if (!realtimeKey || !realtimeCluster) return;

		let isDisposed = false;
		let cleanupConnection: (() => void) | null = null;
		void getPusherClient({ key: realtimeKey, cluster: realtimeCluster })
			.then((pusher) => {
				if (isDisposed) return;
				const channelName = getProjectBoardChannelName(projectId);
				const channel = pusher.subscribe(channelName);
				channel.bind(PROJECT_BOARD_UPDATED_EVENT, (event: unknown) => {
					const parsed = boardUpdatedEventSchema.safeParse(event);
					if (
						!parsed.success ||
						parsed.data.projectId !== projectId ||
						parsed.data.boardVersion <= boardVersion
					) {
						return;
					}

					if (isPausedRef.current) {
						pendingRemoteVersion.current = Math.max(
							pendingRemoteVersion.current ?? 0,
							parsed.data.boardVersion,
						);
						return;
					}
					if (requestedVersion.current === parsed.data.boardVersion) return;
					requestedVersion.current = parsed.data.boardVersion;
					refreshOpenTaskDetails();
					router.refresh();
				});

				cleanupConnection = () => {
					channel.unbind(PROJECT_BOARD_UPDATED_EVENT);
					pusher.unsubscribe(channelName);
				};
			})
			.catch(() => {
				// Version checks keep synchronization working if Pusher cannot load.
			});

		return () => {
			isDisposed = true;
			cleanupConnection?.();
		};
	}, [
		boardVersion,
		projectId,
		realtimeCluster,
		realtimeKey,
		refreshOpenTaskDetails,
		router,
	]);

	useEffect(() => {
		const controller = new AbortController();
		requestedVersion.current = null;

		// Checks only visible, settled boards and ignores temporary network failures.
		async function checkForBoardChange() {
			if (
				document.visibilityState !== "visible" ||
				isPaused ||
				isChecking.current
			) {
				return;
			}

			isChecking.current = true;
			try {
				const latestVersion = await fetchBoardVersion(
					projectId,
					controller.signal,
				);
				if (latestVersion === boardVersion) return;

				const refreshKey = latestVersion ?? -1;
				if (requestedVersion.current === refreshKey) return;
				requestedVersion.current = refreshKey;
				refreshOpenTaskDetails();
				router.refresh();
			} catch {
				// A later interval retries without interrupting the board.
			} finally {
				isChecking.current = false;
			}
		}

		void checkForBoardChange();
		const intervalId = window.setInterval(
			checkForBoardChange,
			realtimeKey && realtimeCluster
				? BOARD_RECOVERY_INTERVAL_MS
				: BOARD_POLL_INTERVAL_MS,
		);
		function checkVisibleBoard() {
			if (document.visibilityState === "visible") void checkForBoardChange();
		}
		document.addEventListener("visibilitychange", checkVisibleBoard);

		return () => {
			controller.abort();
			window.clearInterval(intervalId);
			document.removeEventListener("visibilitychange", checkVisibleBoard);
		};
	}, [
		boardVersion,
		isPaused,
		projectId,
		realtimeCluster,
		realtimeKey,
		refreshOpenTaskDetails,
		router,
	]);
}
