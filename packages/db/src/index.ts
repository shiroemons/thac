import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { resolveSslConfig } from "./utils/ssl";

// 遅延初期化: ブラウザ側でのモジュールロード時にDBクライアントを初期化しない
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
type PostgresClient = ReturnType<typeof postgres>;
let _db: DrizzleDB | null = null;
let _sql: PostgresClient | null = null;

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
	_sql = null;
	_testDb = null;
}

function getDb(): DrizzleDB {
	// テストDBが設定されている場合はそれを使用
	if (_testDb) {
		return _testDb as DrizzleDB;
	}

	if (!_db) {
		const url = process.env.DATABASE_URL || "postgresql://localhost:5432/thac";
		const client = postgres(url, {
			max: Number(process.env.DB_POOL_MAX) || 10,
			idle_timeout: 20,
			connect_timeout: 10,
			ssl: resolveSslConfig(url),
			onnotice: (notice) => console.warn("[PostgreSQL Notice]", notice.message),
			connection: {
				application_name: "thac-server",
				statement_timeout: 30000, // 30 seconds
			},
		});
		_sql = client;
		_db = drizzle({ client, schema });
	}
	return _db;
}

/**
 * DB接続をクリーンアップする（graceful shutdown用）
 * 複数回呼び出しても安全
 */
export async function cleanup(): Promise<void> {
	if (_sql) {
		const client = _sql;
		_sql = null;
		_db = null;
		try {
			await client.end({ timeout: 5 });
		} catch {
			// シャットダウン中のエラーは無視
		}
	}
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
	ilike,
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
