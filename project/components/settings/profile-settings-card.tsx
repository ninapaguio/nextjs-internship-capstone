"use client";

import { useClerk } from "@clerk/nextjs";
import { ExternalLink, Mail, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export interface SettingsProfile {
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	username: string | null;
	imageUrl: string;
}

interface ProfileSettingsCardProps {
	profile: SettingsProfile;
}

// Derives two-letter initials for the avatar fallback.
function getInitials(
	firstName: string | null,
	lastName: string | null,
): string {
	const first = firstName?.trim().charAt(0) ?? "";
	const last = lastName?.trim().charAt(0) ?? "";
	const combined = `${first}${last}`.toUpperCase();
	return combined || "U";
}

// Renders the structured profile card with verified attributes and Clerk modal delegation.
export function ProfileSettingsCard({ profile }: ProfileSettingsCardProps) {
	const { openUserProfile } = useClerk();

	const displayName =
		[profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
		"EverFlow Member";

	const initials = getInitials(profile.firstName, profile.lastName);

	return (
		<Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
			<CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<CardTitle className="text-base sm:text-lg font-semibold text-foreground">
							Personal Profile
						</CardTitle>
						<CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
							Your identity details and account attributes across the workspace.
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onPress={() => openUserProfile()}
						className="w-fit text-xs font-medium self-start sm:self-center"
					>
						Edit in Clerk
						<ExternalLink className="size-3.5 ml-1.5" />
					</Button>
				</div>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 space-y-6">
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border/70 bg-muted/15 p-4">
					<div>
						<Avatar className="size-16 sm:size-18 border-2 border-border shadow-xs">
							{profile.imageUrl ? (
								<AvatarImage src={profile.imageUrl} alt={displayName} />
							) : null}
							<AvatarFallback className="text-base font-bold bg-brand_navy-500/10 text-brand_navy-700 dark:bg-brand_mint-500/15 dark:text-brand_mint-300">
								{initials}
							</AvatarFallback>
						</Avatar>
					</div>

					<div className="space-y-1 min-w-0 flex-1">
						<h3 className="text-base sm:text-lg font-bold text-foreground truncate">
							{displayName}
						</h3>
						<p className="text-xs text-muted-foreground">
							{profile.email ?? "Signed in via Clerk"}
						</p>
					</div>
				</div>

				{/* Structured Profile Attributes Table */}
				<Table
					aria-label="Profile attributes"
					className="rounded-xl border border-border"
				>
					<TableHeader>
						<TableHead isRowHeader className="px-4 py-2.5 text-xs w-44 sm:w-56">
							Attribute
						</TableHead>
						<TableHead className="px-4 py-2.5 text-xs">Value</TableHead>
						<TableHead className="px-4 py-2.5 text-xs text-right w-28 sm:w-36">
							Status
						</TableHead>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
								<span className="inline-flex items-center gap-2">
									<User className="size-3.5 text-muted-foreground" />
									Full Name
								</span>
							</TableCell>
							<TableCell className="px-4 py-3 text-xs text-foreground font-medium">
								{displayName}
							</TableCell>
							<TableCell className="px-4 py-3 text-right">
								<Badge variant="secondary" className="text-[10px] font-normal">
									Clerk profile
								</Badge>
							</TableCell>
						</TableRow>

						<TableRow>
							<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
								<span className="inline-flex items-center gap-2">
									<Mail className="size-3.5 text-muted-foreground" />
									Primary Email
								</span>
							</TableCell>
							<TableCell className="px-4 py-3 text-xs text-foreground font-medium">
								{profile.email ?? "—"}
							</TableCell>
							<TableCell className="px-4 py-3 text-right">
								<Badge
									variant="secondary"
									className="text-[10px] font-normal text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400"
								>
									Primary
								</Badge>
							</TableCell>
						</TableRow>

						{profile.username ? (
							<TableRow>
								<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
									<span className="inline-flex items-center gap-2">
										<User className="size-3.5 text-muted-foreground" />
										Username
									</span>
								</TableCell>
								<TableCell className="px-4 py-3 text-xs text-foreground font-medium">
									@{profile.username}
								</TableCell>
								<TableCell className="px-4 py-3 text-right">
									<Badge
										variant="secondary"
										className="text-[10px] font-normal"
									>
										Clerk profile
									</Badge>
								</TableCell>
							</TableRow>
						) : null}

						<TableRow>
							<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
								<span className="inline-flex items-center gap-2">
									<Shield className="size-3.5 text-muted-foreground" />
									Identity Source
								</span>
							</TableCell>
							<TableCell className="px-4 py-3 text-xs text-muted-foreground">
								Clerk Authentication Service
							</TableCell>
							<TableCell className="px-4 py-3 text-right">
								<Badge variant="secondary" className="text-[10px] font-normal">
									Authoritative
								</Badge>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
