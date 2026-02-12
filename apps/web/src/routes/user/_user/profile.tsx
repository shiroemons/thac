import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/user/_user/profile")({
	head: () => createPageHead("プロフィール"),
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = Route.useRouteContext();
	const { data: session, refetch } = authClient.useSession();

	const currentUser = session?.user ?? user;

	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleStartEdit = () => {
		setEditName(currentUser.name ?? "");
		setIsEditing(true);
		setError(null);
		setSuccess(null);
	};

	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditName("");
	};

	const handleSave = async () => {
		if (isSubmitting) return;

		if (editName.trim().length > 20) {
			setError("名前は20文字以内で入力してください");
			return;
		}

		if (editName.trim() === (currentUser.name ?? "")) {
			handleCancelEdit();
			return;
		}

		setIsSubmitting(true);

		try {
			const result = await authClient.updateUser({
				name: editName.trim() || undefined,
			});

			if (result.error) {
				setError(result.error.message ?? "更新に失敗しました");
			} else {
				refetch();
				setIsEditing(false);
				setEditName("");
				setSuccess("プロフィールを更新しました");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSave();
		} else if (e.key === "Escape") {
			handleCancelEdit();
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>プロフィール</CardTitle>
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

				<div className="space-y-6">
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
					{!isEditing ? (
						<div className="space-y-2">
							<Label>名前</Label>
							<div className="flex items-center gap-2">
								{currentUser.name ? (
									<p className="text-base-content">{currentUser.name}</p>
								) : (
									<p className="text-base-content/40">未設定</p>
								)}
								<button
									type="button"
									className="btn btn-ghost btn-sm btn-square"
									onClick={handleStartEdit}
								>
									<Pencil className="h-4 w-4" />
								</button>
							</div>
							<p className="text-base-content/60 text-xs">
								他のユーザーに表示される名前です
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<Label htmlFor="name">名前</Label>
							<div className="flex items-center gap-2">
								<Input
									id="name"
									type="text"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="表示名を入力"
									maxLength={20}
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
									disabled={isSubmitting}
								/>
								<button
									type="button"
									className="btn btn-primary btn-sm btn-square"
									onClick={handleSave}
									disabled={isSubmitting}
								>
									{isSubmitting ? (
										<span className="loading loading-spinner loading-xs" />
									) : (
										<Check className="h-4 w-4" />
									)}
								</button>
								<button
									type="button"
									className="btn btn-ghost btn-sm btn-square"
									onClick={handleCancelEdit}
									disabled={isSubmitting}
								>
									<X className="h-4 w-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
