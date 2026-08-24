"use client";

import { useClerk } from "@clerk/nextjs";
import {
	ExternalLink,
	KeyRound,
	LogOut,
	ShieldCheck,
	Smartphone,
	UsersRound,
} from "lucide-react";
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

// Renders the structured security management card with Clerk delegation.
export function SecuritySettingsCard() {
	const { openUserProfile, signOut } = useClerk();

	const securityFeatures = [
		{
			id: "auth",
			name: "Sign-in Methods",
			description: "Review the sign-in methods available for your account",
			icon: ShieldCheck,
		},
		{
			id: "2fa",
			name: "Two-Factor Authentication",
			description: "Review the multi-factor options available for your account",
			icon: Smartphone,
		},
		{
			id: "sessions",
			name: "Active Device Sessions",
			description: "Inspect or revoke active logins across other devices",
			icon: KeyRound,
		},
		{
			id: "oauth",
			name: "Connected Accounts",
			description: "Third-party social authentication providers",
			icon: UsersRound,
		},
	];

	return (
		<Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
			<CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<CardTitle className="text-base sm:text-lg font-semibold text-foreground">
							Account & Security
						</CardTitle>
						<CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
							Manage sign-in methods, multi-factor protection, and active
							sessions through Clerk.
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onPress={() => openUserProfile()}
						className="w-fit text-xs font-medium self-start sm:self-center"
					>
						Manage in Clerk
						<ExternalLink className="size-3.5 ml-1.5" />
					</Button>
				</div>
			</CardHeader>

			<CardContent className="p-4 sm:p-6 space-y-6">
				{/* Security Items Table */}
				<Table
					aria-label="Security controls"
					className="rounded-xl border border-border"
				>
					<TableHeader>
						<TableHead isRowHeader className="px-4 py-2.5 text-xs w-48 sm:w-60">
							Security Control
						</TableHead>
						<TableHead className="px-4 py-2.5 text-xs">Description</TableHead>
						<TableHead className="px-4 py-2.5 text-xs text-right w-24 sm:w-28">
							Status
						</TableHead>
					</TableHeader>
					<TableBody>
						{securityFeatures.map((item) => {
							const Icon = item.icon;
							return (
								<TableRow key={item.id} id={item.id}>
									<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
										<span className="inline-flex items-center gap-2.5">
											<div className="size-6 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
												<Icon className="size-3.5 text-brand-primary dark:text-brand-cyan" />
											</div>
											{item.name}
										</span>
									</TableCell>
									<TableCell className="px-4 py-3 text-xs text-muted-foreground">
										{item.description}
									</TableCell>
									<TableCell className="px-4 py-3 text-right">
										<Badge
											variant="secondary"
											className="text-[10px] font-normal"
										>
											Managed in Clerk
										</Badge>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>

				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-border">
					<div className="space-y-0.5">
						<h4 className="text-xs sm:text-sm font-semibold text-foreground">
							Active Session
						</h4>
						<p className="text-[11px] sm:text-xs text-muted-foreground">
							End your current workspace session securely on this browser.
						</p>
					</div>

					<Button
						variant="destructive"
						size="sm"
						onPress={() => signOut({ redirectUrl: "/" })}
						className="text-xs font-medium shrink-0"
					>
						<LogOut className="size-3.5 mr-1.5" />
						Sign out of EverFlow
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
