import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { createPageHead } from "@/lib/head";

/**
 * returnTo パラメータの検証（オープンリダイレクト防止）
 * - 相対パスのみ許可（/で始まる）
 * - プロトコル相対URL（//example.com）は拒否
 */
function isValidReturnTo(url: string): boolean {
	// 相対パスのみ許可
	if (!url.startsWith("/")) {
		return false;
	}
	// プロトコル相対URLは拒否
	if (url.startsWith("//")) {
		return false;
	}
	return true;
}

export const Route = createFileRoute("/login")({
	head: () => createPageHead("ログイン"),
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>): { returnTo?: string } => {
		return {
			returnTo:
				typeof search.returnTo === "string" ? search.returnTo : undefined,
		};
	},
});

function RouteComponent() {
	const [showSignIn, setShowSignIn] = useState(false);
	const { returnTo } = Route.useSearch();

	// 検証済みの returnTo（無効な場合は undefined）
	const validatedReturnTo =
		returnTo && isValidReturnTo(returnTo) ? returnTo : undefined;

	return showSignIn ? (
		<SignInForm
			onSwitchToSignUp={() => setShowSignIn(false)}
			returnTo={validatedReturnTo}
		/>
	) : (
		<SignUpForm
			onSwitchToSignIn={() => setShowSignIn(true)}
			returnTo={validatedReturnTo}
		/>
	);
}
