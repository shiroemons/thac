import { auth } from "@thac/auth";
import type { Context, Next } from "hono";

/**
 * オプショナル認証で使用するユーザー型
 * セッションが存在しない場合は null となる
 */
export type OptionalUser = {
	id: string;
	name: string;
	email: string;
	role: string | null;
} | null;

/**
 * オプショナル認証ミドルウェアのコンテキスト型
 * user プロパティは null の可能性がある
 */
export type OptionalAuthContext = {
	Variables: {
		user: OptionalUser;
	};
};

/**
 * オプショナル認証ミドルウェア
 *
 * - セッションがあればユーザー情報をコンテキストに設定
 * - セッションがなくてもエラーにせず、null を設定して後続処理へ進行
 * - 認証が必須ではない公開APIで、ログインユーザーには追加情報を提供したい場合に使用
 *
 * 使用例:
 * ```typescript
 * app.get("/api/items", optionalAuthMiddleware, (c) => {
 *   const user = c.get("user");
 *   if (user) {
 *     // 認証済みユーザー向けの処理
 *   } else {
 *     // 未認証ユーザー向けの処理
 *   }
 * });
 * ```
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
	try {
		// Better-Auth のセッション取得を試行
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (session?.user) {
			// セッションが存在する場合、ユーザー情報をコンテキストに設定
			c.set("user", session.user as NonNullable<OptionalUser>);
		} else {
			// セッションが存在しない場合、null を設定
			// エラーにはせず、後続処理へ進行を許可
			c.set("user", null);
		}

		return next();
	} catch (error) {
		// セッション取得中にエラーが発生した場合
		// ログに記録し、user を null に設定して処理を継続
		console.error("Optional auth middleware error:", error);
		c.set("user", null);
		return next();
	}
}
