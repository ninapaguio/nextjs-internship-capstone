import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

const isPublicRoute = createRouteMatcher([
	"/",
	"/sign-in/:path*",
	"/sign-up/:path*",
	"/api/webhooks/:path*",
]);

export default clerkMiddleware(
	async (auth, request) => {
		if (!isPublicRoute(request)) {
			await auth.protect();
		}
	},
	{
		authorizedParties: appUrl ? [appUrl] : undefined,
	},
);

export const config = {
	matcher: [
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		"/(api|trpc)(.*)",
		"/__clerk/(.*)",
	],
};

// TODO: Task 2.2 - Configure authentication middleware for route protection
// import { authMiddleware } from "@clerk/nextjs"

// NOTE: This file is disabled for Next.js 16+
// The "middleware" file convention is deprecated in Next.js 16.
// When implementing authentication, use the new "proxy" pattern instead.
// Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
//
// To re-enable: rename to middleware.ts and consider migrating to proxy pattern
// Placeholder middleware - currently allows all routes for development
// TODO: Replace with actual Clerk authMiddleware when authentication is implemented
//export default function middleware() {
// TODO: Implement actual authentication middleware
// For now, allow all routes so interns can navigate and see the mock pages
// console.log("TODO: Implement Clerk authentication middleware")

// Return undefined to allow all requests through
//  return undefined
// }

//export const config = {
// TODO: Update matcher when implementing actual authentication
// For now, don't match any routes to allow free navigation
//  matcher: [],
// }

/*
TODO: Task 2.2 Implementation Notes for Interns:
- Install and configure Clerk
- Set up authMiddleware to protect routes
- Configure public routes: ["/", "/sign-in", "/sign-up"]
- Protect all dashboard routes: ["/dashboard", "/projects"]
- Add proper redirects for unauthenticated users

Example implementation when ready:
export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  ignoredRoutes: [],
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
*/
