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

	// 欠落しているテーブルを先に作成
	createMissingTables(sqlite);

	// マイグレーションを適用
	applyMigrations(sqlite);

	return { db, sqlite };
}

/**
 * マイグレーションファイルに欠落しているテーブルを作成
 * NOTE: マイグレーション0007が欠落しているため、手動でテーブルを作成
 */
function createMissingTables(sqlite: Database) {
	// releases テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS releases (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT NOT NULL,
			name_ja TEXT,
			name_en TEXT,
			release_date TEXT,
			release_year INTEGER,
			release_month INTEGER,
			release_day INTEGER,
			release_type TEXT,
			event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
			event_day_id TEXT REFERENCES event_days(id) ON DELETE SET NULL,
			notes TEXT,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		)
	`);

	// discs テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS discs (
			id TEXT PRIMARY KEY NOT NULL,
			release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
			disc_number INTEGER NOT NULL,
			disc_name TEXT,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		)
	`);

	// release_circles テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS release_circles (
			release_id TEXT NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
			circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE RESTRICT,
			participation_type TEXT NOT NULL,
			position INTEGER DEFAULT 1,
			PRIMARY KEY (release_id, circle_id, participation_type)
		)
	`);

	// tracks テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS tracks (
			id TEXT PRIMARY KEY NOT NULL,
			release_id TEXT REFERENCES releases(id) ON DELETE CASCADE,
			disc_id TEXT REFERENCES discs(id) ON DELETE CASCADE,
			track_number INTEGER NOT NULL,
			name TEXT NOT NULL,
			name_ja TEXT,
			name_en TEXT,
			release_date TEXT,
			release_year INTEGER,
			release_month INTEGER,
			release_day INTEGER,
			event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
			event_day_id TEXT REFERENCES event_days(id) ON DELETE SET NULL,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		)
	`);

	// track_credits テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS track_credits (
			id TEXT PRIMARY KEY NOT NULL,
			track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
			artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE RESTRICT,
			credit_name TEXT NOT NULL,
			alias_type_code TEXT REFERENCES alias_types(code),
			credit_position INTEGER,
			artist_alias_id TEXT REFERENCES artist_aliases(id) ON DELETE SET NULL,
			created_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
			updated_at INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
		)
	`);

	// track_credit_roles テーブル
	sqlite.run(`
		CREATE TABLE IF NOT EXISTS track_credit_roles (
			track_credit_id TEXT NOT NULL REFERENCES track_credits(id) ON DELETE CASCADE,
			role_code TEXT NOT NULL REFERENCES credit_roles(code),
			role_position INTEGER NOT NULL DEFAULT 1,
			PRIMARY KEY (track_credit_id, role_code, role_position)
		)
	`);
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
