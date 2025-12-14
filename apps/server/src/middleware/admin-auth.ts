import { auth } from "@thac/auth";
import type { Context, Next } from "hono";

export type User = {
	id: string;
	name: string;
	email: string;
	role: string | null;
};

export type AdminContext = {
	Variables: {
		user: User;
	};
};

/**
 * 管理者APIへのアクセス制御ミドルウェア
 *
 * - セッションからユーザー情報を取得
 * - 未認証リクエストに401ステータスを返却
 * - 非管理者ユーザーに403ステータスを返却
 * - 管理者ロールを持つユーザーのみ後続処理へ進行を許可
 */
export async function adminAuthMiddleware(c: Context, next: Next) {
	try {
		const session = await auth.api.getSession({
			headers: c.req.raw.headers,
		});

		if (!session?.user) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		if (session.user.role !== "admin") {
			return c.json({ error: "Forbidden" }, 403);
		}

		// ユーザー情報をコンテキストに設定
		c.set("user", session.user as User);

		return next();
	} catch (error) {
		console.error("Admin auth middleware error:", error);
		return c.json({ error: "Unauthorized" }, 401);
	}
}
