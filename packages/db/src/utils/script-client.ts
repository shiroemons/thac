import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolveSslConfig } from "./ssl";

/**
 * seed/truncateスクリプト用の共通DBクライアントを作成する
 * - dotenvで環境変数を読み込み
 * - SSL自動検出（localhost → false、リモート → "require"）
 */
export function createScriptClient() {
	// 環境変数の読み込み優先順位:
	// 1. 既に設定済みの環境変数（devbox, Docker等）
	// 2. apps/server/.env（ローカル開発用フォールバック）
	dotenv.config({
		path: "../../apps/server/.env",
	});

	const url = process.env.DATABASE_URL || "postgresql://localhost:5432/thac";
	const client = postgres(url, {
		max: 3,
		idle_timeout: 10,
		connect_timeout: 10,
		ssl: resolveSslConfig(url),
		connection: {
			application_name: "thac-script",
			statement_timeout: 300000, // 5 minutes for bulk operations
		},
	});

	const db = drizzle({ client });

	return { client, db };
}
