import { createServerFn } from "@tanstack/react-start";
import type { TrackDetail } from "@/lib/api-client";
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

// SSR時にCookieを転送してトラック詳細を取得するサーバー関数
// Note: TanStack Start v1.141ではミドルウェア使用時にデータ入力の型定義ができないため、
// 型アサーションを使用しています
const getTrackFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async (ctx) => {
		// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
		const trackId = (ctx as any).data as string | undefined;
		// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
		const ssrHeaders = (ctx as any).context?.ssrHeaders as Headers | undefined;

		if (!trackId) {
			throw new Error("trackId is required");
		}

		// SSR時のCookieを取得
		const cookie = ssrHeaders?.get("cookie");

		// API呼び出しを直接実行
		const API_BASE_URL = getApiBaseUrl();
		const res = await fetch(`${API_BASE_URL}/api/admin/tracks/${trackId}`, {
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

		return res.json() as Promise<TrackDetail>;
	});

// 型安全なラッパー関数
export async function getTrack(trackId: string): Promise<TrackDetail> {
	// biome-ignore lint/suspicious/noExplicitAny: TanStack Startの型定義制限を回避
	return (getTrackFn as any)({ data: trackId });
}
