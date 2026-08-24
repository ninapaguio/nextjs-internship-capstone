import "server-only";

import { Buffer } from "node:buffer";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENCODED_UUID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

// Converts a project title into a readable URL-safe value.
export function createProjectTitleSlug(title: string) {
	const slug = title
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || "project";
}

// Encodes a UUID as a reversible 22-character Base64URL identifier.
function encodeProjectId(projectId: string) {
	if (!UUID_PATTERN.test(projectId)) {
		throw new Error("Cannot create a project slug from an invalid UUID");
	}

	return Buffer.from(projectId.replaceAll("-", ""), "hex").toString(
		"base64url",
	);
}

// Decodes a 22-character Base64URL identifier into its canonical UUID form.
function decodeProjectId(encodedProjectId: string) {
	if (!ENCODED_UUID_PATTERN.test(encodedProjectId)) return null;

	const hex = Buffer.from(encodedProjectId, "base64url").toString("hex");
	if (hex.length !== 32) return null;

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Combines the encoded project UUID with its readable title slug.
export function createProjectCompositeSlug(projectId: string, title: string) {
	return `${encodeProjectId(projectId)}-${createProjectTitleSlug(title)}`;
}

// Creates the complete client-ready route for one project card.
export function createProjectHref(projectId: string, title: string) {
	return `/projects/${createProjectCompositeSlug(projectId, title)}`;
}

// Creates the client-ready route for a specific task inside a project board.
export function createProjectTaskHref(
	projectId: string,
	title: string,
	taskId: string,
) {
	return `/projects/${createProjectCompositeSlug(projectId, title)}?task=${taskId}`;
}

// Extracts the UUID while keeping previous full-UUID project links valid.
export function extractProjectIdFromSlug(compositeSlug: string) {
	const legacyProjectId = compositeSlug.slice(0, 36);
	const isLegacySlug =
		UUID_PATTERN.test(legacyProjectId) &&
		(compositeSlug.length === 36 || compositeSlug[36] === "-");

	if (isLegacySlug) return legacyProjectId;
	if (compositeSlug.length < 24 || compositeSlug[22] !== "-") return null;

	return decodeProjectId(compositeSlug.slice(0, 22));
}
