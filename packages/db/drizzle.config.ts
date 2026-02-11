import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolveSslConfig } from "./src/utils/ssl";

// 環境変数の読み込み優先順位:
// 1. 既に設定済みの環境変数（devbox, Docker等）
// 2. apps/server/.env（ローカル開発用フォールバック）
dotenv.config({
	path: "../../apps/server/.env",
});

const dbUrl = process.env.DATABASE_URL || "postgresql://localhost:5432/thac";

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: dbUrl,
		ssl: resolveSslConfig(dbUrl),
	},
});
