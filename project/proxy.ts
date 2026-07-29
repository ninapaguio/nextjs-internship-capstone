import { clerkMiddleware } from "@clerk/nextjs/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export default clerkMiddleware({
	authorizedParties: appUrl ? [appUrl] : undefined,
});

export const config = {
	matcher: [
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		"/(api|trpc)(.*)",
		"/__clerk/(.*)",
	],
};
