import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// 遅延初期化: ブラウザ側でのモジュールロード時にDBクライアントを初期化しない
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
let _db: DrizzleDB | null = null;

// テスト用DB注入機能
// biome-ignore lint/suspicious/noExplicitAny: テスト用の汎用DB型
let _testDb: any = null;

/**
 * テスト用DBを設定する（テストでのみ使用）
 * @param testDb - drizzle-orm/pglite等で作成したテスト用DBインスタンス
 */
// biome-ignore lint/suspicious/noExplicitAny: テスト用の汎用DB型
export function __setTestDatabase(testDb: any): void {
	_testDb = testDb;
}

/**
 * DB状態をリセットする（テストでのみ使用）
 */
export function __resetDatabase(): void {
	_db = null;
	_testDb = null;
}

function getDb(): DrizzleDB {
	// テストDBが設定されている場合はそれを使用
	if (_testDb) {
		return _testDb as DrizzleDB;
	}

	if (!_db) {
		const client = postgres(
			process.env.DATABASE_URL || "postgresql://localhost:5432/thac",
		);
		_db = drizzle({ client, schema });
	}
	return _db;
}

// Proxyを使用して遅延初期化を実現
export const db = new Proxy({} as DrizzleDB, {
	get(_, prop) {
		return getDb()[prop as keyof DrizzleDB];
	},
});

// Re-export drizzle-orm operators
export {
	and,
	asc,
	count,
	countDistinct,
	desc,
	eq,
	gt,
	inArray,
	isNotNull,
	isNull,
	like,
	lt,
	max,
	ne,
	or,
	sql,
} from "drizzle-orm";
// Re-export all schemas and validation
export * from "./schema";
// Re-export ID generation utilities
export { createId } from "./utils/id";
