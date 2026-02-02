import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/auth/callback")({
	head: () => createPageHead("認証中..."),
	component: AuthCallbackComponent,
});

function AuthCallbackComponent() {
	const navigate = useNavigate({ from: "/auth/callback" });
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (isPending) return;

		if (session?.user) {
			// onboardingCompletedに基づいてリダイレクト先を決定
			const redirectTo = session.user.onboardingCompleted
				? "/dashboard"
				: "/onboarding";
			navigate({ to: redirectTo });
		} else {
			// セッションがない場合はログインページへ
			navigate({ to: "/login" });
		}
	}, [session, isPending, navigate]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<Loader />
				<p className="mt-4 text-base-content/60">認証処理中...</p>
			</div>
		</div>
	);
}
