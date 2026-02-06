import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * seed/truncateスクリプト用の共通DBクライアントを作成する
 * - dotenvで環境変数を読み込み
 * - SSL自動検出（localhost → false、リモート → "require"）
 */
export function createScriptClient() {
	dotenv.config({
		path: "../../apps/server/.env",
	});

	const url = process.env.DATABASE_URL || "postgresql://localhost:5432/thac";
	const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

	const client = postgres(url, {
		ssl: isLocal ? false : "require",
	});

	const db = drizzle({ client });

	return { client, db };
}
