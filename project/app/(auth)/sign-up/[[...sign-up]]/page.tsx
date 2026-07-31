import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<main className="min-h-screen bg-platinum-900 px-4 py-12 dark:bg-outer_space-600">
			<div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col items-center justify-center">
				<div className="mb-8 text-center">
					<h1 className="mb-2 text-3xl font-bold text-outer_space-500 dark:text-platinum-500">
						Create Account
					</h1>
					<p className="text-paynes_gray-500 dark:text-french_gray-400">
						Continue with Google or register with email and password.
					</p>
				</div>

				<SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
			</div>
		</main>
	);
}
