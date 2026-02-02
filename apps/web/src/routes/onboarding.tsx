import { useForm } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import Loader from "@/components/loader";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUser } from "@/functions/get-user";
import { authClient } from "@/lib/auth-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/onboarding")({
	head: () => createPageHead("オンボーディング"),
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		// 未認証の場合は /login へリダイレクト
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
		// 既にオンボーディング完了済みの場合は /dashboard へリダイレクト
		if (context.session.user.onboardingCompleted) {
			throw redirect({
				to: "/dashboard",
			});
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const form = useForm({
		defaultValues: {
			name: session?.user.name || "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			setIsSubmitting(true);

			try {
				const result = await authClient.updateUser({
					name: value.name,
					onboardingCompleted: true,
				});

				if (result.error) {
					setError(result.error.message || "更新に失敗しました");
					setIsSubmitting(false);
					return;
				}

				// 成功時は /dashboard へリダイレクト
				navigate({
					to: "/dashboard",
				});
			} catch (_err) {
				setError("予期せぬエラーが発生しました");
				setIsSubmitting(false);
			}
		},
		validators: {
			onSubmit: z.object({
				name: z
					.string()
					.min(1, "ユーザーネームを入力してください")
					.max(20, "20文字以内で入力してください"),
			}),
		},
	});

	// セッションがない場合のローディング（通常はloaderでリダイレクトされる）
	if (!session) {
		return <Loader />;
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-2 text-center font-bold text-3xl">ようこそ!</h1>
			<p className="mb-6 text-center text-base-content/70">
				ユーザーネームを設定してください
			</p>

			{error && (
				<Banner
					variant="error"
					onDismiss={() => setError(null)}
					className="mb-4"
				>
					{error}
				</Banner>
			)}

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<div>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>ユーザーネーム</Label>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
								/>
								<p className="text-base-content/60 text-sm">
									※後から変更可能です
								</p>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-error text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe>
					{(state) => (
						<Button
							type="submit"
							variant="primary"
							className="w-full"
							disabled={!state.canSubmit || isSubmitting}
						>
							{isSubmitting ? "保存中..." : "始める"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
