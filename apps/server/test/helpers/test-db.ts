import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @thac/dbからスキーマをインポート
import * as dbExports from "@thac/db";
import { drizzle } from "drizzle-orm/bun-sqlite";

// テーブル定義のみを抽出（関数やオペレータを除外）
// drizzleはテーブルオブジェクトの形式を期待
const schema = {
	// 認証関連
	user: dbExports.user,
	session: dbExports.session,
	account: dbExports.account,
	verification: dbExports.verification,
	// マスタデータ
	platforms: dbExports.platforms,
	aliasTypes: dbExports.aliasTypes,
	creditRoles: dbExports.creditRoles,
	officialWorkCategories: dbExports.officialWorkCategories,
	// アーティスト・サークル
	artists: dbExports.artists,
	artistAliases: dbExports.artistAliases,
	circles: dbExports.circles,
	circleLinks: dbExports.circleLinks,
	// 公式作品・楽曲
	officialWorks: dbExports.officialWorks,
	officialSongs: dbExports.officialSongs,
	officialWorkLinks: dbExports.officialWorkLinks,
	officialSongLinks: dbExports.officialSongLinks,
	// イベント
	eventSeries: dbExports.eventSeries,
	events: dbExports.events,
	eventDays: dbExports.eventDays,
	// リリース・ディスク
	releases: dbExports.releases,
	releaseCircles: dbExports.releaseCircles,
	discs: dbExports.discs,
	// トラック
	tracks: dbExports.tracks,
	trackCredits: dbExports.trackCredits,
	trackOfficialSongs: dbExports.trackOfficialSongs,
	trackDerivations: dbExports.trackDerivations,
	trackIsrcs: dbExports.trackIsrcs,
	// 出版物
	trackPublications: dbExports.trackPublications,
	releasePublications: dbExports.releasePublications,
	// 識別子（JANコード）
	releaseJanCodes: dbExports.releaseJanCodes,
};

/**
 * テスト用インメモリDBを作成し、マイグレーションを適用
 */
export function createTestDatabase() {
	const sqlite = new Database(":memory:");
	const db = drizzle(sqlite, { schema });

	// マイグレーションを適用
	applyMigrations(sqlite);

	return { db, sqlite };
}

/**
 * マイグレーションファイルを読み込んで適用
 */
function applyMigrations(sqlite: Database) {
	const migrationsDir = join(
		import.meta.dir,
		"../../../../packages/db/src/migrations",
	);

	const files = readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = readFileSync(join(migrationsDir, file), "utf-8");
		// `--> statement-breakpoint` で分割して各ステートメントを実行
		const statements = sql.split("--> statement-breakpoint");
		for (const stmt of statements) {
			const trimmed = stmt.trim();
			if (trimmed) {
				try {
					sqlite.run(trimmed);
				} catch (error) {
					const message = error instanceof Error ? error.message : "";
					// 許容するエラー:
					// - "already exists": CREATE時に既に存在
					// - "no such index": DROP時に存在しない
					// - "no such table": DROP時に存在しない
					const ignorableErrors = [
						"already exists",
						"no such index",
						"no such table",
					];
					if (!ignorableErrors.some((e) => message.includes(e))) {
						throw error;
					}
				}
			}
		}
	}
}

/**
 * 全テーブルのデータをクリア（外部キー制約を一時的に無効化）
 */
export function truncateAllTables(sqlite: Database) {
	sqlite.run("PRAGMA foreign_keys = OFF");

	const tables = sqlite
		.query<{ name: string }, []>(
			"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle%'",
		)
		.all();

	for (const { name } of tables) {
		sqlite.run(`DELETE FROM "${name}"`);
	}

	sqlite.run("PRAGMA foreign_keys = ON");
}
