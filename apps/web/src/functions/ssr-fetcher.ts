import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";

// タイムアウト設定（ミリ秒）
const SSR_TIMEOUT = {
	DEFAULT: 5000, // 5秒（詳細ページ用）
	LIST: 10000, // 10秒（一覧ページ用）
} as const;

/**
 * SSRタイムアウトエラー
 */
export class SSRTimeoutError extends Error {
	constructor(endpoint: string, timeout: number) {
		super(`SSR fetch timeout after ${timeout}ms: ${endpoint}`);
		this.name = "SSRTimeoutError";
	}
}

/**
 * エンドポイントに応じたタイムアウト時間を取得
 * クエリパラメータがある場合は一覧APIと判断
 */
function getTimeoutForEndpoint(endpoint: string): number {
	if (endpoint.includes("?")) {
		return SSR_TIMEOUT.LIST;
	}
	return SSR_TIMEOUT.DEFAULT;
}

/**
 * パフォーマンスログを出力
 */
function logPerformance(
	endpoint: string,
	duration: number,
	isSSR: boolean,
	success: boolean,
) {
	const context = isSSR ? "SSR" : "Client";
	const status = success ? "" : " FAILED";
	const level = duration > 1000 ? "warn" : "info";

	console[level](`[${context}]${status} ${endpoint}: ${duration.toFixed(2)}ms`);
}

// SSR時はSERVER_URL（Docker内部通信用）、クライアント側はVITE_SERVER_URL（ブラウザ用）を使用
const getApiBaseUrl = () => {
	if (typeof window === "undefined") {
		return (
			process.env.SERVER_URL ||
			import.meta.env.VITE_SERVER_URL ||
			"http://localhost:3000"
		);
	}
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
};

// SSR時にCookieを転送してAPIを呼び出す汎用サーバー関数
// Note: TanStack Start v1.141ではミドルウェア使用時にデータ入力の型定義ができないため、
// 型アサーションを使用しています
const ssrFetchFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async (ctx) => {
		const startTime = performance.now();
		// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
		const endpoint = (ctx as any).data as string | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
		const ssrHeaders = (ctx as any).context?.ssrHeaders as Headers | undefined;

		if (!endpoint) {
			throw new Error("endpoint is required");
		}

		// SSR時のCookieを取得
		const cookie = ssrHeaders?.get("cookie");

		// API呼び出しを直接実行
		const API_BASE_URL = getApiBaseUrl();
		const timeout = getTimeoutForEndpoint(endpoint);
		const isSSR = typeof window === "undefined";

		// AbortControllerでタイムアウトを設定
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const res = await fetch(`${API_BASE_URL}${endpoint}`, {
				credentials: "include",
				signal: controller.signal,
				headers: {
					"Content-Type": "application/json",
					...(cookie ? { cookie } : {}),
				},
			});

			clearTimeout(timeoutId);
			const duration = performance.now() - startTime;
			logPerformance(endpoint, duration, isSSR, true);

			if (!res.ok) {
				const error = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				throw new Error(error.error || `HTTP ${res.status}`);
			}

			return res.json();
		} catch (error) {
			clearTimeout(timeoutId);
			const duration = performance.now() - startTime;

			// タイムアウトエラーの場合はSSRTimeoutErrorをスロー
			if (error instanceof Error && error.name === "AbortError") {
				logPerformance(endpoint, duration, isSSR, false);
				throw new SSRTimeoutError(endpoint, timeout);
			}

			logPerformance(endpoint, duration, isSSR, false);
			throw error;
		}
	});

/**
 * SSR時にCookieを転送してAPIを呼び出す汎用フェッチャー
 * @param endpoint - APIエンドポイント（例: "/api/admin/tracks/xxx"）
 */
export async function ssrFetch<T>(endpoint: string): Promise<T> {
	// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
	return (ssrFetchFn as any)({ data: endpoint });
}
