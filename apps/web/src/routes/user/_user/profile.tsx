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

/**
 * 画像URLのバリデーション
 * - 空文字は許可
 * - HTTPSスキームのみ許可
 * - 無効なURLはエラー
 */
function validateImageUrl(url: string): string | null {
	if (!url.trim()) {
		return null; // 空は許可
	}

	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") {
			return "画像URLはHTTPSのみ使用できます";
		}
		return null;
	} catch {
		return "有効なURLを入力してください";
	}
}

function ProfilePage() {
	const { user } = Route.useRouteContext();
	const { data: session, refetch } = authClient.useSession();

	const currentUser = session?.user ?? user;

	const [name, setName] = useState(currentUser.name ?? "");
	const [image, setImage] = useState(currentUser.image ?? "");
	const [imageError, setImageError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleImageChange = (value: string) => {
		setImage(value);
		setImageError(validateImageUrl(value));
	};

	const isValidImageUrl = !imageError && image.trim();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		// 文字数チェック
		if (name.trim().length > 20) {
			setError("名前は20文字以内で入力してください");
			return;
		}
		if (image.trim().length > 500) {
			setError("画像URLは500文字以内で入力してください");
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.updateUser({
				name: name.trim() || undefined,
				image: image.trim() || undefined,
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

					{/* Avatar URL */}
					<div className="space-y-2">
						<Label htmlFor="image">アイコンURL</Label>
						<Input
							id="image"
							type="url"
							value={image}
							onChange={(e) => handleImageChange(e.target.value)}
							placeholder="https://example.com/avatar.png"
							maxLength={500}
							autoComplete="off"
							data-1p-ignore
							data-lpignore="true"
							data-form-type="other"
							className={imageError ? "input-error" : ""}
						/>
						{imageError ? (
							<p className="text-error text-xs">{imageError}</p>
						) : (
							<p className="text-base-content/60 text-xs">
								プロフィール画像のURLを入力してください（HTTPSのみ）
							</p>
						)}
					</div>

					{/* Preview */}
					{isValidImageUrl && (
						<div className="space-y-2">
							<Label>プレビュー</Label>
							<div className="flex items-center gap-4">
								<div className="avatar">
									<div className="w-16 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100">
										<img
											src={image}
											alt="アイコンプレビュー"
											onError={(e) => {
												e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random`;
											}}
										/>
									</div>
								</div>
								<span className="text-base-content/70 text-sm">
									{name || "名前未設定"}
								</span>
							</div>
						</div>
					)}

					{/* Submit */}
					<div className="pt-4">
						<Button
							type="submit"
							variant="primary"
							disabled={isSubmitting || !!imageError}
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
