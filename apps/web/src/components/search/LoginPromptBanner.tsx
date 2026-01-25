import { LogIn, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

/**
 * セッションストレージのキー
 * バナーが閉じられたかどうかを記録
 */
const STORAGE_KEY = "search-login-banner-dismissed";

interface LoginPromptBannerProps {
	/** カスタムクラス名 */
	className?: string;
}

/**
 * ログイン促進バナー
 *
 * 未ログインユーザーに詳細検索機能の利用を促すバナー
 * - セッションストレージで表示状態を管理
 * - 閉じた後はセッション中は再表示しない
 * - 現在のURLをreturnToパラメータとして保持
 */
export function LoginPromptBanner({ className }: LoginPromptBannerProps) {
	// バナーの表示状態
	const [isVisible, setIsVisible] = useState(false);
	// フェードアウト中かどうか
	const [isFadingOut, setIsFadingOut] = useState(false);
	// returnTo パラメータ用のURL
	const [returnToUrl, setReturnToUrl] = useState("");

	// 初期化処理（クライアントサイドのみ）
	useEffect(() => {
		// セッションストレージを確認して、まだ閉じられていなければ表示
		const isDismissed = sessionStorage.getItem(STORAGE_KEY) === "true";
		if (!isDismissed) {
			setIsVisible(true);
		}

		// 現在のURLをreturnToパラメータ用に設定（エンコードはTanStack Routerが行う）
		const currentUrl = window.location.pathname + window.location.search;
		setReturnToUrl(currentUrl);
	}, []);

	// バナーを閉じる処理
	const handleDismiss = useCallback(() => {
		// フェードアウトアニメーションを開始
		setIsFadingOut(true);

		// アニメーション完了後に非表示にして、セッションストレージに記録
		setTimeout(() => {
			setIsVisible(false);
			sessionStorage.setItem(STORAGE_KEY, "true");
		}, 300);
	}, []);

	// 非表示の場合は何もレンダリングしない
	if (!isVisible) {
		return null;
	}

	return (
		<div
			role="alert"
			aria-live="polite"
			className={cn(
				// グラスモーフィズムベース
				"glass-card relative overflow-hidden rounded-xl",
				// レイアウト
				"flex items-center gap-3 p-4 sm:gap-4 sm:p-5",
				// アニメーション
				"transition-all duration-300",
				isFadingOut && "translate-y-[-8px] opacity-0",
				className,
			)}
		>
			{/* 背景グラデーション装飾 */}
			<div className="gradient-mesh pointer-events-none absolute inset-0 opacity-60" />

			{/* アイコン */}
			<div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:size-11">
				<Sparkles className="size-5 text-primary sm:size-6" />
			</div>

			{/* メッセージとアクションボタン */}
			<div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
				{/* 説明テキスト */}
				<div className="min-w-0 flex-1">
					<p className="text-sm leading-relaxed text-base-content/90 sm:text-base">
						<span className="font-medium text-base-content">
							ログインすると詳細検索
						</span>
						<span className="hidden sm:inline">
							（年代、アーティスト、サークル等のフィルター）
						</span>
						<span className="sm:hidden">機能</span>
						が利用できます
					</p>
				</div>

				{/* アクションボタン */}
				{/* /login は新規登録フォームがデフォルト表示、サインインへの切り替えも可能 */}
				<Link
					to="/login"
					search={{ returnTo: returnToUrl || undefined }}
					className={cn(
						"btn btn-primary btn-sm gap-2 shadow-md",
						"hover:shadow-lg hover:shadow-primary/25",
						"transition-all duration-200",
						"shrink-0 sm:btn-md",
					)}
				>
					<LogIn className="size-4" />
					<span>ログイン / 新規登録</span>
				</Link>
			</div>

			{/* 閉じるボタン */}
			<button
				type="button"
				onClick={handleDismiss}
				className={cn(
					"btn btn-ghost btn-sm btn-circle",
					"relative z-10 shrink-0",
					"text-base-content/50 hover:bg-base-content/10 hover:text-base-content/80",
					"transition-colors duration-200",
				)}
				aria-label="閉じる"
			>
				<X className="size-4" />
			</button>
		</div>
	);
}
