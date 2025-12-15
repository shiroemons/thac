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

const client = createClient({
	url: process.env.DATABASE_URL || "",
	authToken: process.env.DATABASE_AUTH_TOKEN,
	fetch: fetchWithRetry,
});

export const db = drizzle({ client, schema });

// Re-export drizzle-orm operators
export { and, asc, count, desc, eq, like, or, sql } from "drizzle-orm";
// Re-export all schemas and validation
export * from "./schema";
