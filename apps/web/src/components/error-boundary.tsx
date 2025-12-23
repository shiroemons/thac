import {
	ErrorComponent,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";
import { AlertTriangle, Clock, Home, RefreshCw } from "lucide-react";

// SSRタイムアウトエラーかどうかを判定
function isTimeoutError(error: Error): boolean {
	return (
		error.name === "SSRTimeoutError" ||
		error.message?.includes("timeout") ||
		error.message?.includes("AbortError")
	);
}

// SSR関連のエラーかどうかを判定
function isSSRError(error: Error): boolean {
	return (
		error.message?.includes("SSR") ||
		error.message?.includes("fetch failed") ||
		isTimeoutError(error)
	);
}

/**
 * グローバルエラーコンポーネント
 * ルーターのdefaultErrorComponentとして使用
 */
export function GlobalErrorComponent({ error }: ErrorComponentProps) {
	const router = useRouter();
	const isTimeout = isTimeoutError(error);
	const isSSR = isSSRError(error);

	// エラーログ出力
	console.error(`[${isSSR ? "SSR" : "Client"}] Error:`, {
		message: error.message,
		stack: error.stack,
		timestamp: new Date().toISOString(),
	});

	if (isTimeout) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
				<Clock className="mb-4 h-16 w-16 text-warning" />
				<h1 className="mb-2 font-bold text-2xl">
					読み込みがタイムアウトしました
				</h1>
				<p className="mb-6 max-w-md text-center text-base-content/70">
					サーバーの応答に時間がかかっています。しばらくしてから再度お試しください。
				</p>

				<div className="flex gap-4">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => router.invalidate()}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						再試行
					</button>
					<button
						type="button"
						className="btn btn-outline"
						onClick={() => router.navigate({ to: "/" })}
					>
						<Home className="mr-2 h-4 w-4" />
						ホームへ
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<AlertTriangle className="mb-4 h-16 w-16 text-error" />
			<h1 className="mb-2 font-bold text-2xl">エラーが発生しました</h1>
			<p className="mb-6 max-w-md text-center text-base-content/70">
				{error.message || "予期しないエラーが発生しました"}
			</p>

			<div className="flex gap-4">
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => router.invalidate()}
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					再試行
				</button>
				<button
					type="button"
					className="btn btn-outline"
					onClick={() => router.navigate({ to: "/" })}
				>
					<Home className="mr-2 h-4 w-4" />
					ホームへ
				</button>
			</div>

			{process.env.NODE_ENV === "development" && (
				<details className="mt-6 text-base-content/50 text-sm">
					<summary className="cursor-pointer">詳細情報</summary>
					<pre className="mt-2 max-w-xl overflow-auto rounded bg-base-200 p-4">
						{error.stack}
					</pre>
				</details>
			)}
		</div>
	);
}

/**
 * 認証エラー用コンポーネント
 * 特定のルートでerrorComponentとして使用可能
 */
export function UnauthorizedErrorComponent({ error }: ErrorComponentProps) {
	const router = useRouter();

	// 401/403エラーかどうかを判定
	const isAuthError =
		error.message?.includes("401") ||
		error.message?.includes("403") ||
		error.message?.includes("Unauthorized");

	if (isAuthError) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
				<AlertTriangle className="mb-4 h-16 w-16 text-warning" />
				<h1 className="mb-2 font-bold text-2xl">アクセス権限がありません</h1>
				<p className="mb-6 max-w-md text-center text-base-content/70">
					このページにアクセスするには、ログインが必要です。
				</p>

				<button
					type="button"
					className="btn btn-primary"
					onClick={() => router.navigate({ to: "/login" })}
				>
					ログインページへ
				</button>
			</div>
		);
	}

	// 認証エラー以外はデフォルトのエラーコンポーネントを表示
	return <ErrorComponent error={error} />;
}
