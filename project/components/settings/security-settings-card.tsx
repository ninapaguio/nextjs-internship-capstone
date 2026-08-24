"use client";

import { useClerk } from "@clerk/nextjs";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";
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

	return (
		<Card className="rounded-2xl border-border bg-card shadow-xs overflow-hidden">
			<CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-border">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<CardTitle className="text-base sm:text-lg font-semibold text-foreground">
							Account & Security
						</CardTitle>
						<CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
							Review the sign-in methods available for your EverFlow account.
						</CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						onPress={() => openUserProfile()}
						className="w-fit text-xs font-medium self-start sm:self-center"
					>
						Manage in Clerk
						<ExternalLink aria-hidden="true" className="size-3.5 ml-1.5" />
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
						<TableRow id="auth">
							<TableCell className="px-4 py-3 text-xs font-medium text-foreground">
								<span className="inline-flex items-center gap-2.5">
									<span className="size-6 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
										<ShieldCheck
											aria-hidden="true"
											className="size-3.5 text-brand-primary dark:text-brand-cyan"
										/>
									</span>
									Sign-in Methods
								</span>
							</TableCell>
							<TableCell className="px-4 py-3 text-xs text-muted-foreground">
								Email or username with password, and Google
							</TableCell>
							<TableCell className="px-4 py-3 text-right">
								<Badge variant="secondary" className="text-[10px] font-normal">
									Managed in Clerk
								</Badge>
							</TableCell>
						</TableRow>
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
						<LogOut aria-hidden="true" className="size-3.5 mr-1.5" />
						Sign out of EverFlow
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
