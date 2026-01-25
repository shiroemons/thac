import { Info, X } from "lucide-react";
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
				"alert alert-info transition-opacity duration-300",
				isFadingOut && "opacity-0",
				className,
			)}
		>
			{/* 情報アイコン */}
			<Info className="h-5 w-5 shrink-0" />

			{/* メッセージとアクションボタン */}
			<div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				{/* 説明テキスト */}
				<span className="text-sm">
					ログインすると詳細検索（年代、アーティスト、サークル等のフィルター）が利用できます
				</span>

				{/* アクションボタン */}
				{/* /login は新規登録フォームがデフォルト表示、サインインへの切り替えも可能 */}
				<div className="flex items-center gap-2">
					<Link
						to="/login"
						search={{ returnTo: returnToUrl || undefined }}
						className="btn btn-primary btn-sm"
					>
						ログイン / 新規登録
					</Link>
				</div>
			</div>

			{/* 閉じるボタン */}
			<button
				type="button"
				onClick={handleDismiss}
				className="btn btn-ghost btn-sm btn-circle"
				aria-label="閉じる"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
