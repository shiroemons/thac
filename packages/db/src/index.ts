import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// リトライ機能付きfetch
const fetchWithRetry = async (
	input: string | URL | Request,
	init?: RequestInit,
): Promise<Response> => {
	const maxRetries = 3;
	const baseDelay = 1000; // 1秒

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fetch(input, init);
		} catch (error) {
			const isLastAttempt = attempt === maxRetries - 1;
			if (isLastAttempt) {
				throw error;
			}

			// 指数バックオフで待機
			const delay = baseDelay * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// TypeScript用（到達しない）
	throw new Error("Unexpected: all retries exhausted");
};

// 遅延初期化: ブラウザ側でのモジュールロード時にDBクライアントを初期化しない
type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;
let _db: DrizzleDB | null = null;

function getDb(): DrizzleDB {
	if (!_db) {
		const client = createClient({
			url: process.env.DATABASE_URL || "",
			authToken: process.env.DATABASE_AUTH_TOKEN,
			fetch: fetchWithRetry,
		});
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
	desc,
	eq,
	inArray,
	isNull,
	like,
	max,
	or,
	sql,
} from "drizzle-orm";
// Re-export all schemas and validation
export * from "./schema";
// Re-export ID generation utilities
export { createId } from "./utils/id";
