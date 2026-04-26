import { Hono } from "hono";
import type { AdminContext, User } from "../../src/middleware/admin-auth";
import type { UserAuthContext } from "../../src/middleware/user-auth";
import {
	createTestAuthMiddleware,
	createTestUserAuthMiddleware,
} from "./test-auth";

export interface TestAppOptions {
	/** ユーザー情報を上書き（nullで未認証、undefinedでデフォルト管理者） */
	user?: Partial<User> | null;
}

/**
 * テスト用のHonoアプリを作成（管理者向け）
 * @param router - テスト対象のルーター
 * @param options - テストオプション
 */
export function createTestAdminApp(
	router: Hono<AdminContext>,
	options?: TestAppOptions,
) {
	const app = new Hono<AdminContext>();

	// テスト用認証ミドルウェアを適用（レート制限はスキップ）
	app.use("/*", createTestAuthMiddleware(options?.user));

	// ルーターをマウント
	app.route("/", router);

	return app;
}

/**
 * テスト用のHonoアプリを作成（ユーザー認証向け）
 * @param router - テスト対象のルーター
 * @param options - テストオプション
 */
export function createTestUserApp(
	router: Hono<UserAuthContext>,
	options?: TestAppOptions,
) {
	const app = new Hono<UserAuthContext>();

	// テスト用ユーザー認証ミドルウェアを適用（レート制限はスキップ）
	app.use("/*", createTestUserAuthMiddleware(options?.user));

	// ルーターをマウント
	app.route("/", router);

	return app;
}
