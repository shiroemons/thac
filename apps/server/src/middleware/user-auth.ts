import { auth } from "@thac/auth";
import type { Context, Next } from "hono";

export type User = {
	id: string;
	name: string;
	email: string;
	role: string | null;
};

export type UserAuthContext = {
	Variables: {
		user: User;
	};
};

/**
 * ログイン必須APIへのアクセス制御ミドルウェア
 *
 * - セッションからユーザー情報を取得
 * - 未認証リクエストに401ステータスを返却
 * - 認証済みユーザーのみ後続処理へ進行を許可
 */
export async function requireUserMiddleware(c: Context, next: Next) {
	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		// ユーザー情報をコンテキストに設定
		c.set("user", session.user as User);

		return next();
	} catch (error) {
		console.error("User auth middleware error:", error);
		return c.json({ error: "Unauthorized" }, 401);
	}
}
