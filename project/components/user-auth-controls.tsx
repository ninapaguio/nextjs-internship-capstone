"use client";

import { SignOutButton, UserButton } from "@clerk/nextjs";

export function UserAuthControls() {
	return (
		<div className="flex items-center gap-3">
			<UserButton />
			<SignOutButton redirectUrl="/">
				<button
					type="button"
					className="text-sm font-medium text-paynes_gray-500 transition-colors hover:text-blue_munsell-500 dark:text-french_gray-400"
				>
					Sign out
				</button>
			</SignOutButton>
		</div>
	);
}
