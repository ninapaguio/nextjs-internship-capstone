import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SettingsProfile } from "@/components/settings/profile-settings-card";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
	title: "Settings",
	description: "Manage your EverFlow profile, security, and appearance.",
};

export default async function SettingsPage() {
	const clerkUser = await currentUser();

	if (!clerkUser) {
		notFound();
	}

	const primaryEmail =
		clerkUser.emailAddresses.find(
			(address) => address.id === clerkUser.primaryEmailAddressId,
		)?.emailAddress ??
		clerkUser.emailAddresses[0]?.emailAddress ??
		null;

	const profile: SettingsProfile = {
		firstName: clerkUser.firstName,
		lastName: clerkUser.lastName,
		email: primaryEmail,
		username: clerkUser.username ?? null,
		imageUrl: clerkUser.imageUrl,
	};

	return <SettingsView profile={profile} />;
}
