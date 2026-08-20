import "server-only";

import { headers } from "next/headers";

type RuleName = "add-comment" | "create-post";

const RULES: Record<RuleName, { window: number; max: number }> = {
	"add-comment": { window: 60, max: 5 },
	"create-post": { window: 300, max: 5 },
};

interface Bucket {
	count: number;
	resetAt: number;
}

interface RateLimitGlobal {
	rateLimitStore?: Map<string, Bucket>;
}

const rateLimitGlobal = globalThis as typeof globalThis & RateLimitGlobal;
const store = rateLimitGlobal.rateLimitStore ?? new Map<string, Bucket>();
rateLimitGlobal.rateLimitStore = store;

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt?: number;
}

// Resolves the originating address forwarded by the deployment proxy.
async function getClientIp() {
	const requestHeaders = await headers();
	const forwardedFor = requestHeaders.get("x-forwarded-for");
	if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
	return requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

// Applies a process-local fixed-window limit for one user, IP, and action rule.
export async function checkRateLimit(
	rule: RuleName,
	identifier = "anonymous",
): Promise<RateLimitResult> {
	const { window, max } = RULES[rule];
	const ip = await getClientIp();
	const key = `${rule}:${identifier}:${ip}`;
	const now = Date.now();
	const bucket = store.get(key);

	if (!bucket || now >= bucket.resetAt) {
		const resetAt = now + window * 1_000;
		store.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: max - 1, resetAt };
	}

	if (bucket.count >= max) {
		return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
	}

	bucket.count += 1;
	return {
		allowed: true,
		remaining: max - bucket.count,
		resetAt: bucket.resetAt,
	};
}
