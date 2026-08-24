const DEFAULT_AUTH_REDIRECT = "/dashboard";

// Returns a same-origin post-authentication destination or the dashboard fallback.
export function getSafeAuthRedirect(
	redirectUrl: string | undefined,
	currentOrigin: string,
) {
	if (!redirectUrl) return DEFAULT_AUTH_REDIRECT;

	try {
		const destination = new URL(redirectUrl, currentOrigin);
		if (destination.origin !== currentOrigin) return DEFAULT_AUTH_REDIRECT;

		return `${destination.pathname}${destination.search}${destination.hash}`;
	} catch {
		return DEFAULT_AUTH_REDIRECT;
	}
}

// Carries Clerk's return destination when moving between local authentication routes.
export function buildAuthRoute(pathname: string, redirectUrl?: string) {
	if (!redirectUrl) return pathname;

	const searchParams = new URLSearchParams({ redirect_url: redirectUrl });
	return `${pathname}?${searchParams.toString()}`;
}
