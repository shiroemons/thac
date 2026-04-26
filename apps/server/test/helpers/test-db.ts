import { PGlite } from "@electric-sql/pglite";
// @thac/dbからスキーマをインポート
import * as dbExports from "@thac/db";
import { createId } from "@thac/db";
import { pushSchema } from "drizzle-kit/api";
import { drizzle } from "drizzle-orm/pglite";

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
	genres: dbExports.genres,
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
	// 作品・ディスク
	releases: dbExports.releases,
	releaseCircles: dbExports.releaseCircles,
	discs: dbExports.discs,
	// トラック
	tracks: dbExports.tracks,
	trackCredits: dbExports.trackCredits,
	trackOfficialSongs: dbExports.trackOfficialSongs,
	trackDerivations: dbExports.trackDerivations,
	trackIsrcs: dbExports.trackIsrcs,
	trackGenres: dbExports.trackGenres,
	// タグ
	tags: dbExports.tags,
	trackTags: dbExports.trackTags,
	// 出版物
	trackPublications: dbExports.trackPublications,
	releasePublications: dbExports.releasePublications,
	// 識別子（JANコード）
	releaseJanCodes: dbExports.releaseJanCodes,
	// クレジットロール
	trackCreditRoles: dbExports.trackCreditRoles,
	// アルバム申請
	albumRequests: dbExports.albumRequests,
};

/**
 * テスト用インメモリ PostgreSQL DB を作成し、スキーマを適用
 */
export async function createTestDatabase() {
	const client = new PGlite();
	const db = drizzle({ client, schema });

	// スキーマをプッシュ（マイグレーション不要）
	// PGliteはpg_trgm拡張をサポートしないため、
	// gin_trgm_opsを含むステートメントをスキップして個別実行する
	const push = await pushSchema(schema, db);
	for (const stmt of push.statementsToExecute) {
		if (stmt.includes("gin_trgm_ops") || stmt.includes("pg_trgm")) continue;
		await client.exec(stmt);
	}

	return { db, client };
}

export type TestDb = Awaited<ReturnType<typeof createTestDatabase>>["db"];

/**
 * 全テーブルのデータをクリア（TRUNCATE CASCADE使用）
 */
export async function truncateAllTables(client: PGlite) {
	// テーブル名一覧を取得
	const result = await client.query<{ tablename: string }>(
		"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_drizzle%'",
	);

	if (result.rows.length > 0) {
		const tableNames = result.rows.map((r) => `"${r.tablename}"`).join(", ");
		await client.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
	}
}

// ============================================================================
// テスト用タグデータ作成ヘルパー関数
// ============================================================================

/**
 * テスト用タグを作成
 */
export async function createTestTag(
	db: TestDb,
	data?: Partial<typeof dbExports.tags.$inferInsert>,
) {
	const tag = {
		id: data?.id ?? createId.tag(),
		name: data?.name ?? `test-tag-${Date.now()}`,
		attributes: data?.attributes ?? null,
		createdAt: data?.createdAt ?? new Date(),
		updatedAt: data?.updatedAt ?? new Date(),
	};
	await db.insert(dbExports.tags).values(tag);
	return tag;
}

/**
 * トラックにタグを追加
 */
export async function addTagToTrack(
	db: TestDb,
	trackId: string,
	tagId: string,
	position: number,
	isLocked = false,
) {
	await db.insert(dbExports.trackTags).values({
		trackId,
		tagId,
		position,
		isLocked,
		createdAt: new Date(),
	});
}
