import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";

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
		const res = await fetch(`${API_BASE_URL}${endpoint}`, {
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				...(cookie ? { cookie } : {}),
			},
		});

		if (!res.ok) {
			const error = await res.json().catch(() => ({ error: "Unknown error" }));
			throw new Error(error.error || `HTTP ${res.status}`);
		}

		return res.json();
	});

/**
 * SSR時にCookieを転送してAPIを呼び出す汎用フェッチャー
 * @param endpoint - APIエンドポイント（例: "/api/admin/tracks/xxx"）
 */
export async function ssrFetch<T>(endpoint: string): Promise<T> {
	// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
	return (ssrFetchFn as any)({ data: endpoint });
}
