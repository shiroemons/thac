import type { Context, Next } from "hono";
import type { User } from "../../src/middleware/admin-auth";

/**
 * テスト用のデフォルト管理者ユーザー
 */
export const defaultTestAdmin: User = {
	id: "test-admin-id",
	name: "Test Admin",
	email: "admin@test.com",
	role: "admin",
};

/**
 * テスト用の認証モックミドルウェアを作成
 * @param userOverride - ユーザー情報を上書き（nullで未認証）
 */
export function createTestAuthMiddleware(userOverride?: Partial<User> | null) {
	return async function testAuthMiddleware(c: Context, next: Next) {
		// nullの場合は未認証
		if (userOverride === null) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		const user = { ...defaultTestAdmin, ...userOverride };

		// 管理者ロールでない場合は403
		if (user.role !== "admin") {
			return c.json({ error: "Forbidden" }, 403);
		}

		// ユーザー情報をコンテキストに設定
		c.set("user", user);
		return next();
	};
}
