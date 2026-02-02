import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link2, Link2Off, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { createPageHead } from "@/lib/head";

// サポートするソーシャルプロバイダ
const SOCIAL_PROVIDERS = [
	{ id: "google", name: "Google", icon: GoogleIcon },
	{ id: "discord", name: "Discord", icon: DiscordIcon },
	{ id: "github", name: "GitHub", icon: GitHubIcon },
] as const;

type ProviderId = (typeof SOCIAL_PROVIDERS)[number]["id"];

// アカウント型定義
type Account = {
	providerId: string;
	accountId: string;
};

export const Route = createFileRoute("/user/_user/settings")({
	head: () => createPageHead("設定"),
	component: SettingsPage,
});

function SettingsPage() {
	const navigate = useNavigate();
	const [accounts, setAccounts] = useState<Account[] | null>(null);

	// アカウント一覧を取得
	const fetchAccounts = useCallback(async () => {
		const result = await authClient.listAccounts();
		if (result.data) {
			setAccounts(result.data);
		}
	}, []);

	// 初期ロード
	useEffect(() => {
		fetchAccounts();
	}, [fetchAccounts]);

	const [isLinking, setIsLinking] = useState<ProviderId | null>(null);
	const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// アカウント削除ダイアログの状態
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// 連携済みプロバイダIDのSet
	const linkedProviderIds = new Set(
		accounts?.map((account) => account.providerId) ?? [],
	);

	// 連携追加
	const handleLinkProvider = useCallback(async (providerId: ProviderId) => {
		setError(null);
		setSuccess(null);
		setIsLinking(providerId);

		try {
			const result = await authClient.linkSocial({
				provider: providerId,
				callbackURL: window.location.href,
			});

			if (result.error) {
				setError(result.error.message ?? "連携に失敗しました");
			}
			// 成功時はリダイレクトされるため、ここには到達しない
		} catch (err) {
			setError(err instanceof Error ? err.message : "連携に失敗しました");
		} finally {
			setIsLinking(null);
		}
	}, []);

	// 連携解除
	const handleUnlinkProvider = useCallback(
		async (providerId: string) => {
			// 最低1つのプロバイダが必要
			if ((accounts?.length ?? 0) <= 1) {
				setError(
					"最低1つの認証方法が必要です。別のアカウントを連携してから解除してください。",
				);
				return;
			}

			setError(null);
			setSuccess(null);
			setIsUnlinking(providerId);

			try {
				const result = await authClient.unlinkAccount({
					providerId,
				});

				if (result.error) {
					setError(result.error.message ?? "連携解除に失敗しました");
				} else {
					setSuccess("連携を解除しました");
					fetchAccounts();
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "連携解除に失敗しました");
			} finally {
				setIsUnlinking(null);
			}
		},
		[accounts, fetchAccounts],
	);

	// アカウント削除
	const handleDeleteAccount = useCallback(async () => {
		setError(null);
		setIsDeleting(true);

		try {
			const result = await authClient.deleteUser();

			if (result.error) {
				setError(result.error.message ?? "アカウント削除に失敗しました");
				setShowDeleteDialog(false);
			} else {
				// 削除成功後、ログインページへリダイレクト
				navigate({ to: "/login" });
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "アカウント削除に失敗しました",
			);
			setShowDeleteDialog(false);
		} finally {
			setIsDeleting(false);
		}
	}, [navigate]);

	return (
		<div className="space-y-6">
			{/* エラー/成功メッセージ */}
			{error && (
				<Banner variant="error" onDismiss={() => setError(null)}>
					{error}
				</Banner>
			)}

			{success && (
				<Banner variant="success" onDismiss={() => setSuccess(null)}>
					{success}
				</Banner>
			)}

			{/* 連携中のアカウント */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						連携中のアカウント
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{SOCIAL_PROVIDERS.map((provider) => {
							const isLinked = linkedProviderIds.has(provider.id);
							const IconComponent = provider.icon;

							return (
								<div
									key={provider.id}
									className="flex items-center justify-between rounded-lg border border-base-300 p-3"
								>
									<div className="flex items-center gap-3">
										<IconComponent className="h-6 w-6" />
										<span className="font-medium">{provider.name}</span>
										{isLinked && (
											<span className="badge badge-success badge-sm">
												連携中
											</span>
										)}
									</div>

									{isLinked ? (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleUnlinkProvider(provider.id)}
											disabled={isUnlinking === provider.id}
										>
											{isUnlinking === provider.id ? (
												<span className="loading loading-spinner loading-xs" />
											) : (
												<Link2Off className="h-4 w-4" />
											)}
											<span className="ml-1">解除</span>
										</Button>
									) : (
										<Button
											variant="outline"
											size="sm"
											onClick={() => handleLinkProvider(provider.id)}
											disabled={isLinking === provider.id}
										>
											{isLinking === provider.id ? (
												<span className="loading loading-spinner loading-xs" />
											) : (
												<Link2 className="h-4 w-4" />
											)}
											<span className="ml-1">連携</span>
										</Button>
									)}
								</div>
							);
						})}
					</div>

					<p className="mt-4 text-base-content/60 text-xs">
						複数のアカウントを連携することで、どのサービスからでもログインできます。
					</p>
				</CardContent>
			</Card>

			{/* 危険な操作 */}
			<Card className="border-error/30">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-error">
						<Trash2 className="h-5 w-5" />
						危険な操作
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<p className="text-base-content/70 text-sm">
							アカウントを削除すると、すべてのデータが完全に削除されます。
							この操作は取り消すことができません。
						</p>
						<Button
							variant="destructive"
							onClick={() => setShowDeleteDialog(true)}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							アカウントを削除
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				title="アカウントを削除しますか？"
				description={
					<>
						この操作は取り消すことができません。
						<br />
						アカウントに関連するすべてのデータが完全に削除されます。
					</>
				}
				confirmLabel="削除する"
				cancelLabel="キャンセル"
				onConfirm={handleDeleteAccount}
				isLoading={isDeleting}
				variant="danger"
			/>
		</div>
	);
}

// ソーシャルプロバイダアイコン
function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-label="Google">
			<title>Google</title>
			<path
				fill="currentColor"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="currentColor"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="currentColor"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="currentColor"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	);
}

function DiscordIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-label="Discord">
			<title>Discord</title>
			<path
				fill="currentColor"
				d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
			/>
		</svg>
	);
}

function GitHubIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-label="GitHub">
			<title>GitHub</title>
			<path
				fill="currentColor"
				d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
			/>
		</svg>
	);
}
