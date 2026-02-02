import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/user/_user/profile")({
	head: () => createPageHead("プロフィール編集"),
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = Route.useRouteContext();
	const { data: session, refetch } = authClient.useSession();

	const currentUser = session?.user ?? user;

	const [name, setName] = useState(currentUser.name ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// 文字数チェック
		if (name.trim().length > 20) {
			setError("名前は20文字以内で入力してください");
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.updateUser({
				name: name.trim() || undefined,
			});

			if (result.error) {
				setError(result.error.message ?? "更新に失敗しました");
			} else {
				setSuccess("プロフィールを更新しました");
				refetch();
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>プロフィール編集</CardTitle>
			</CardHeader>
			<CardContent>
				{error && (
					<Banner
						variant="error"
						onDismiss={() => setError(null)}
						className="mb-4"
					>
						{error}
					</Banner>
				)}

				{success && (
					<Banner
						variant="success"
						onDismiss={() => setSuccess(null)}
						className="mb-4"
					>
						{success}
					</Banner>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* 現在のアバター */}
					<div className="space-y-2">
						<Label>アバター</Label>
						<div className="flex items-center gap-4">
							<div className="avatar">
								<div className="w-16 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100">
									<img
										src={
											currentUser.image ||
											`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || "User")}&background=random`
										}
										alt="アバター"
									/>
								</div>
							</div>
							<p className="text-base-content/60 text-sm">
								アバターはログインに使用したサービス（Google、Discord、GitHub）から取得されます
							</p>
						</div>
					</div>

					{/* Name */}
					<div className="space-y-2">
						<Label htmlFor="name">名前</Label>
						<Input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="表示名を入力"
							maxLength={20}
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
						/>
						<p className="text-base-content/60 text-xs">
							他のユーザーに表示される名前です
						</p>
					</div>

					{/* Submit */}
					<div className="pt-4">
						<Button
							type="submit"
							variant="primary"
							disabled={isSubmitting}
							className="w-full sm:w-auto"
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
