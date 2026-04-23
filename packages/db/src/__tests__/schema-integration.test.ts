/**
 * Schema Integration Tests
 *
 * PGlite（インメモリPostgreSQL）を使用してスキーマの統合テストを行う。
 * - スキーマのプッシュ
 * - 基本的なCRUD操作
 * - 外部キー制約の検証
 * - real型フィールドの数値精度検証
 */

import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { pushSchema } from "drizzle-kit/api";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { __resetDatabase, __setTestDatabase } from "../index";
import {
	artistAliases,
	artists,
	circleLinks,
	circles,
} from "../schema/artist-circle";
import { eventDays, eventSeries, events } from "../schema/event";
import { genres, trackGenres } from "../schema/genre";
import { releaseJanCodes, trackIsrcs } from "../schema/identifier";
import {
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	platforms,
} from "../schema/master";
import {
	officialSongLinks,
	officialSongs,
	officialWorkLinks,
	officialWorks,
} from "../schema/official";
import { releasePublications, trackPublications } from "../schema/publication";
import { discs, releaseCircles, releases } from "../schema/release";
import { tags, trackTags } from "../schema/tag";
import { trackCreditRoles, trackCredits, tracks } from "../schema/track";
import {
	trackDerivations,
	trackOfficialSongs,
} from "../schema/track-relations";
import { createId } from "../utils/id";

/**
 * drizzle のクエリビルダ（thenable）を明示的にPromiseに変換するヘルパー。
 * bun:test の expect().rejects がthenableを正しくハンドリングしない場合に使用。
 */
// biome-ignore lint/suspicious/noExplicitAny: テスト用ヘルパー
async function execute(query: PromiseLike<any>): Promise<any> {
	return query;
}

/**
 * 配列の最初の要素を取得し、存在しない場合はテストを失敗させるヘルパー。
 * non-null assertion（!）を避けつつ型安全にアクセスするために使用。
 */
function firstRow<T>(rows: T[]): T {
	expect(rows).toHaveLength(1);
	// biome-ignore lint/style/noNonNullAssertion: toHaveLengthで存在確認済み
	return rows[0]!;
}

// スキーマオブジェクト（テーブル定義のみ。pushSchemaに渡す用）
const schema = {
	platforms,
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	genres,
	artists,
	artistAliases,
	circles,
	circleLinks,
	officialWorks,
	officialSongs,
	officialWorkLinks,
	officialSongLinks,
	eventSeries,
	events,
	eventDays,
	releases,
	releaseCircles,
	discs,
	tracks,
	trackCredits,
	trackCreditRoles,
	trackOfficialSongs,
	trackDerivations,
	trackIsrcs,
	trackGenres,
	tags,
	trackTags,
	trackPublications,
	releasePublications,
	releaseJanCodes,
};

let client: PGlite;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
	client = new PGlite();
	db = drizzle({ client, schema });

	// スキーマをプッシュ
	// PGliteはpg_trgm拡張をサポートしないため、
	// gin_trgm_opsを含むステートメントをスキップして個別実行する
	// biome-ignore lint/suspicious/noExplicitAny: pushSchemaの型不一致をキャスト
	const push = await pushSchema(schema, db as any);
	for (const stmt of push.statementsToExecute) {
		if (stmt.includes("gin_trgm_ops") || stmt.includes("pg_trgm")) continue;
		await client.exec(stmt);
	}

	// テスト用DBを注入
	__setTestDatabase(db);
});

afterEach(async () => {
	// 全テーブルをトランケート（テスト間の分離）
	const result = await client.query<{ tablename: string }>(
		"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_drizzle%'",
	);
	if (result.rows.length > 0) {
		const tableNames = result.rows.map((r) => `"${r.tablename}"`).join(", ");
		await client.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
	}
});

afterAll(async () => {
	__resetDatabase();
	await client.close();
});

// ============================================================================
// スキーマプッシュの検証
// ============================================================================

describe("schema push", () => {
	test("全テーブルが作成されていること", async () => {
		const result = await client.query<{ tablename: string }>(
			"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_drizzle%' ORDER BY tablename",
		);
		const tableNames = result.rows.map((r) => r.tablename).sort();

		// 主要テーブルが存在することを確認
		expect(tableNames).toContain("platforms");
		expect(tableNames).toContain("alias_types");
		expect(tableNames).toContain("credit_roles");
		expect(tableNames).toContain("official_work_categories");
		expect(tableNames).toContain("artists");
		expect(tableNames).toContain("artist_aliases");
		expect(tableNames).toContain("circles");
		expect(tableNames).toContain("circle_links");
		expect(tableNames).toContain("official_works");
		expect(tableNames).toContain("official_songs");
		expect(tableNames).toContain("official_work_links");
		expect(tableNames).toContain("official_song_links");
		expect(tableNames).toContain("event_series");
		expect(tableNames).toContain("events");
		expect(tableNames).toContain("event_days");
		expect(tableNames).toContain("releases");
		expect(tableNames).toContain("release_circles");
		expect(tableNames).toContain("discs");
		expect(tableNames).toContain("tracks");
		expect(tableNames).toContain("track_credits");
		expect(tableNames).toContain("track_credit_roles");
		expect(tableNames).toContain("track_official_songs");
		expect(tableNames).toContain("track_derivations");
		expect(tableNames).toContain("track_isrcs");
		expect(tableNames).toContain("track_genres");
		expect(tableNames).toContain("tags");
		expect(tableNames).toContain("track_tags");
		expect(tableNames).toContain("track_publications");
		expect(tableNames).toContain("release_publications");
		expect(tableNames).toContain("release_jan_codes");
		expect(tableNames).toContain("genres");
	});
});

// ============================================================================
// マスタテーブルのCRUD操作
// ============================================================================

describe("master tables CRUD", () => {
	test("platforms: insert -> select -> update -> delete", async () => {
		// Insert
		await db.insert(platforms).values({
			code: "spotify",
			name: "Spotify",
			category: "streaming",
			urlPattern: "https://open.spotify.com/{id}",
		});

		// Select
		const inserted = firstRow(
			await db.select().from(platforms).where(eq(platforms.code, "spotify")),
		);
		expect(inserted.code).toBe("spotify");
		expect(inserted.name).toBe("Spotify");
		expect(inserted.category).toBe("streaming");
		expect(inserted.urlPattern).toBe("https://open.spotify.com/{id}");
		expect(inserted.sortOrder).toBe(0);
		expect(inserted.createdAt).toBeInstanceOf(Date);
		expect(inserted.updatedAt).toBeInstanceOf(Date);

		// Update
		await db
			.update(platforms)
			.set({ name: "Spotify Premium", category: "music" })
			.where(eq(platforms.code, "spotify"));

		const updated = firstRow(
			await db.select().from(platforms).where(eq(platforms.code, "spotify")),
		);
		expect(updated.name).toBe("Spotify Premium");
		expect(updated.category).toBe("music");

		// Delete
		await db.delete(platforms).where(eq(platforms.code, "spotify"));
		const remaining = await db
			.select()
			.from(platforms)
			.where(eq(platforms.code, "spotify"));
		expect(remaining).toHaveLength(0);
	});

	test("aliasTypes: insert -> select", async () => {
		await db.insert(aliasTypes).values({
			code: "stage_name",
			label: "ステージネーム",
			description: "ステージ上で使用する名前",
		});

		const row = firstRow(
			await db
				.select()
				.from(aliasTypes)
				.where(eq(aliasTypes.code, "stage_name")),
		);
		expect(row.code).toBe("stage_name");
		expect(row.label).toBe("ステージネーム");
		expect(row.description).toBe("ステージ上で使用する名前");
	});

	test("creditRoles: insert -> select", async () => {
		await db.insert(creditRoles).values({
			code: "vocal",
			label: "ボーカル",
		});

		const row = firstRow(
			await db.select().from(creditRoles).where(eq(creditRoles.code, "vocal")),
		);
		expect(row.code).toBe("vocal");
		expect(row.label).toBe("ボーカル");
		expect(row.description).toBeNull();
	});

	test("officialWorkCategories: insert -> select", async () => {
		await db.insert(officialWorkCategories).values({
			code: "game",
			name: "ゲーム作品",
		});

		const row = firstRow(
			await db
				.select()
				.from(officialWorkCategories)
				.where(eq(officialWorkCategories.code, "game")),
		);
		expect(row.code).toBe("game");
		expect(row.name).toBe("ゲーム作品");
	});
});

// ============================================================================
// アーティスト・サークルのCRUD操作
// ============================================================================

describe("artist and circle CRUD", () => {
	test("artists: insert -> select -> update -> delete", async () => {
		const artistId = createId.artist();

		await db.insert(artists).values({
			id: artistId,
			name: "ZUN",
			nameJa: "ZUN",
			initialScript: "latin",
			nameInitial: "Z",
		});

		const inserted = firstRow(
			await db.select().from(artists).where(eq(artists.id, artistId)),
		);
		expect(inserted.name).toBe("ZUN");
		expect(inserted.nameJa).toBe("ZUN");
		expect(inserted.initialScript).toBe("latin");
		expect(inserted.nameInitial).toBe("Z");

		// Update
		await db
			.update(artists)
			.set({ nameEn: "ZUN", sortName: "ZUN" })
			.where(eq(artists.id, artistId));

		const updated = firstRow(
			await db.select().from(artists).where(eq(artists.id, artistId)),
		);
		expect(updated.nameEn).toBe("ZUN");
		expect(updated.sortName).toBe("ZUN");

		// Delete
		await db.delete(artists).where(eq(artists.id, artistId));
		const remaining = await db
			.select()
			.from(artists)
			.where(eq(artists.id, artistId));
		expect(remaining).toHaveLength(0);
	});

	test("circles: insert -> select", async () => {
		const circleId = createId.circle();

		await db.insert(circles).values({
			id: circleId,
			name: "上海アリス幻樂団",
			nameEn: "Team Shanghai Alice",
			initialScript: "kanji",
		});

		const row = firstRow(
			await db.select().from(circles).where(eq(circles.id, circleId)),
		);
		expect(row.name).toBe("上海アリス幻樂団");
		expect(row.nameEn).toBe("Team Shanghai Alice");
		expect(row.initialScript).toBe("kanji");
	});
});

// ============================================================================
// リリース・トラックのCRUD操作
// ============================================================================

describe("release and track CRUD", () => {
	test("releases: insert -> select", async () => {
		const releaseId = createId.release();

		await db.insert(releases).values({
			id: releaseId,
			name: "東方紅魔郷",
			releaseDate: "2002-08-11",
			releaseYear: 2002,
			releaseMonth: 8,
			releaseDay: 11,
			releaseType: "album",
		});

		const row = firstRow(
			await db.select().from(releases).where(eq(releases.id, releaseId)),
		);
		expect(row.name).toBe("東方紅魔郷");
		expect(row.releaseDate).toBe("2002-08-11");
		expect(row.releaseYear).toBe(2002);
		expect(row.releaseMonth).toBe(8);
		expect(row.releaseDay).toBe(11);
		expect(row.releaseType).toBe("album");
	});

	test("tracks: insert -> select with release FK", async () => {
		const releaseId = createId.release();
		const trackId = createId.track();

		await db.insert(releases).values({
			id: releaseId,
			name: "Test Release",
		});

		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "紅より儚い永遠",
			nameJa: "紅より儚い永遠",
		});

		const row = firstRow(
			await db.select().from(tracks).where(eq(tracks.id, trackId)),
		);
		expect(row.name).toBe("紅より儚い永遠");
		expect(row.releaseId).toBe(releaseId);
		expect(row.trackNumber).toBe(1);
	});
});

// ============================================================================
// 外部キー制約の検証
// ============================================================================

describe("foreign key constraints", () => {
	test("artistAliases: artistIdがアーティストに存在しない場合はエラー", async () => {
		const aliasId = createId.artistAlias();

		await expect(
			execute(
				db.insert(artistAliases).values({
					id: aliasId,
					artistId: "non_existent_artist_id",
					name: "ゴーストアーティスト",
					initialScript: "katakana",
				}),
			),
		).rejects.toThrow();
	});

	test("artistAliases: 有効なartistIdの場合は正常にinsertできる", async () => {
		const artistId = createId.artist();
		const aliasId = createId.artistAlias();

		await db.insert(artists).values({
			id: artistId,
			name: "Test Artist",
			initialScript: "latin",
		});

		await db.insert(artistAliases).values({
			id: aliasId,
			artistId,
			name: "Test Alias",
			initialScript: "latin",
		});

		const row = firstRow(
			await db
				.select()
				.from(artistAliases)
				.where(eq(artistAliases.id, aliasId)),
		);
		expect(row.artistId).toBe(artistId);
		expect(row.name).toBe("Test Alias");
	});

	test("circleLinks: circleIdとplatformCodeの外部キー制約", async () => {
		const circleId = createId.circle();
		const linkId = createId.circleLink();

		// circleが存在しない場合はエラー
		await expect(
			execute(
				db.insert(circleLinks).values({
					id: linkId,
					circleId: "non_existent_circle",
					platformCode: "non_existent_platform",
					url: "https://example.com",
				}),
			),
		).rejects.toThrow();

		// 正常系: circle + platform を先に作成
		await db.insert(circles).values({
			id: circleId,
			name: "Test Circle",
			initialScript: "latin",
		});
		await db.insert(platforms).values({
			code: "twitter",
			name: "Twitter",
		});

		await db.insert(circleLinks).values({
			id: linkId,
			circleId,
			platformCode: "twitter",
			url: "https://twitter.com/testcircle",
		});

		const row = firstRow(
			await db.select().from(circleLinks).where(eq(circleLinks.id, linkId)),
		);
		expect(row.circleId).toBe(circleId);
		expect(row.platformCode).toBe("twitter");
	});

	test("tracks: 存在しないreleaseIdを参照するとエラー", async () => {
		const trackId = createId.track();

		await expect(
			execute(
				db.insert(tracks).values({
					id: trackId,
					releaseId: "non_existent_release",
					trackNumber: 1,
					name: "Ghost Track",
				}),
			),
		).rejects.toThrow();
	});

	test("discs: releaseId外部キー制約", async () => {
		const discId = createId.disc();

		// 存在しないreleaseIdの場合はエラー
		await expect(
			execute(
				db.insert(discs).values({
					id: discId,
					releaseId: "non_existent_release",
					discNumber: 1,
				}),
			),
		).rejects.toThrow();
	});

	test("cascade delete: release削除時にtracksも削除される", async () => {
		const releaseId = createId.release();
		const trackId = createId.track();

		await db.insert(releases).values({
			id: releaseId,
			name: "Cascade Test Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Cascade Test Track",
		});

		// releaseを削除
		await db.delete(releases).where(eq(releases.id, releaseId));

		// trackも削除されていることを確認
		const remainingTracks = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, trackId));
		expect(remainingTracks).toHaveLength(0);
	});

	test("cascade delete: artist削除時にartistAliasesも削除される", async () => {
		const artistId = createId.artist();
		const aliasId = createId.artistAlias();

		await db.insert(artists).values({
			id: artistId,
			name: "Cascade Artist",
			initialScript: "latin",
		});
		await db.insert(artistAliases).values({
			id: aliasId,
			artistId,
			name: "Cascade Alias",
			initialScript: "latin",
		});

		// artistを削除
		await db.delete(artists).where(eq(artists.id, artistId));

		// aliasも削除されていることを確認
		const remainingAliases = await db
			.select()
			.from(artistAliases)
			.where(eq(artistAliases.id, aliasId));
		expect(remainingAliases).toHaveLength(0);
	});

	test("restrict: artistが参照されている場合のtrackCreditsのrestrict制約", async () => {
		const artistId = createId.artist();
		const releaseId = createId.release();
		const trackId = createId.track();
		const creditId = createId.trackCredit();

		await db.insert(artists).values({
			id: artistId,
			name: "Restrict Artist",
			initialScript: "latin",
		});
		await db.insert(releases).values({
			id: releaseId,
			name: "Restrict Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Restrict Track",
		});
		await db.insert(trackCredits).values({
			id: creditId,
			trackId,
			artistId,
			creditName: "Restrict Artist Credit",
		});

		// restrictにより、参照されているartistは削除できない
		await expect(
			execute(db.delete(artists).where(eq(artists.id, artistId))),
		).rejects.toThrow();
	});

	test("officialWorks: categoryCode外部キー制約", async () => {
		// 存在しないcategoryCodeの場合はエラー
		await expect(
			execute(
				db.insert(officialWorks).values({
					id: "ow_test",
					categoryCode: "non_existent_category",
					name: "Test Work",
					nameJa: "テスト作品",
				}),
			),
		).rejects.toThrow();
	});
});

// ============================================================================
// real型フィールドの数値精度検証
// ============================================================================

describe("real type fields", () => {
	test("officialWorks.numberInSeries: 整数値を格納・取得できる", async () => {
		await db.insert(officialWorkCategories).values({
			code: "game",
			name: "ゲーム作品",
		});

		await db.insert(officialWorks).values({
			id: "ow_int_test",
			categoryCode: "game",
			name: "東方紅魔郷",
			nameJa: "東方紅魔郷",
			numberInSeries: 6,
		});

		const row = firstRow(
			await db
				.select()
				.from(officialWorks)
				.where(eq(officialWorks.id, "ow_int_test")),
		);
		expect(row.numberInSeries).toBe(6);
		expect(typeof row.numberInSeries).toBe("number");
	});

	test("officialWorks.numberInSeries: 小数値を格納・取得できる", async () => {
		await db.insert(officialWorkCategories).values({
			code: "music",
			name: "音楽作品",
		});

		await db.insert(officialWorks).values({
			id: "ow_decimal_test",
			categoryCode: "music",
			name: "東方文花帖",
			nameJa: "東方文花帖",
			numberInSeries: 9.5,
		});

		const row = firstRow(
			await db
				.select()
				.from(officialWorks)
				.where(eq(officialWorks.id, "ow_decimal_test")),
		);
		expect(row.numberInSeries).toBeCloseTo(9.5, 5);
		expect(typeof row.numberInSeries).toBe("number");
	});

	test("officialWorks.numberInSeries: nullを格納・取得できる", async () => {
		await db.insert(officialWorkCategories).values({
			code: "other",
			name: "その他",
		});

		await db.insert(officialWorks).values({
			id: "ow_null_test",
			categoryCode: "other",
			name: "Null Test",
			nameJa: "ヌルテスト",
			numberInSeries: null,
		});

		const row = firstRow(
			await db
				.select()
				.from(officialWorks)
				.where(eq(officialWorks.id, "ow_null_test")),
		);
		expect(row.numberInSeries).toBeNull();
	});

	test("trackOfficialSongs.startSecond/endSecond: 小数値を格納・取得できる", async () => {
		const releaseId = createId.release();
		const trackId = createId.track();
		const tosId = createId.trackOfficialSong();

		await db.insert(releases).values({
			id: releaseId,
			name: "Real Type Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Real Type Track",
		});

		await db.insert(trackOfficialSongs).values({
			id: tosId,
			trackId,
			customSongName: "Test Song",
			startSecond: 30.5,
			endSecond: 120.75,
		});

		const row = firstRow(
			await db
				.select()
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.id, tosId)),
		);

		expect(row.startSecond).toBeCloseTo(30.5, 5);
		expect(row.endSecond).toBeCloseTo(120.75, 5);
		expect(typeof row.startSecond).toBe("number");
		expect(typeof row.endSecond).toBe("number");
	});

	test("trackOfficialSongs.startSecond/endSecond: 0を格納・取得できる", async () => {
		const releaseId = createId.release();
		const trackId = createId.track();
		const tosId = createId.trackOfficialSong();

		await db.insert(releases).values({
			id: releaseId,
			name: "Zero Test Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Zero Test Track",
		});

		await db.insert(trackOfficialSongs).values({
			id: tosId,
			trackId,
			customSongName: "Zero Test Song",
			startSecond: 0,
			endSecond: 0,
		});

		const row = firstRow(
			await db
				.select()
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.id, tosId)),
		);

		expect(row.startSecond).toBe(0);
		expect(row.endSecond).toBe(0);
	});

	test("trackOfficialSongs.startSecond/endSecond: nullを格納・取得できる", async () => {
		const releaseId = createId.release();
		const trackId = createId.track();
		const tosId = createId.trackOfficialSong();

		await db.insert(releases).values({
			id: releaseId,
			name: "Null Second Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Null Second Track",
		});

		await db.insert(trackOfficialSongs).values({
			id: tosId,
			trackId,
			customSongName: "Null Second Song",
			startSecond: null,
			endSecond: null,
		});

		const row = firstRow(
			await db
				.select()
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.id, tosId)),
		);

		expect(row.startSecond).toBeNull();
		expect(row.endSecond).toBeNull();
	});
});

// ============================================================================
// __setTestDatabase / __resetDatabase の検証
// ============================================================================

describe("__setTestDatabase and __resetDatabase", () => {
	test("__setTestDatabase で注入されたDBがdb proxyから使用される", async () => {
		// 既にbeforeAllで設定済み。db proxy経由でinsert/selectできることを確認
		const { db: proxyDb } = await import("../index");

		await db.insert(platforms).values({
			code: "proxy_test",
			name: "Proxy Test Platform",
		});

		const rows = await proxyDb
			.select()
			.from(platforms)
			.where(eq(platforms.code, "proxy_test"));
		expect(rows).toHaveLength(1);
		const row = firstRow(rows);
		expect(row.name).toBe("Proxy Test Platform");
	});
});

// ============================================================================
// 複合的なデータ操作（リレーション構築）
// ============================================================================

describe("complex relational operations", () => {
	test("event -> release -> disc -> track の階層構造を構築できる", async () => {
		const esId = createId.eventSeries();
		const evId = createId.event();
		const edId = createId.eventDay();
		const releaseId = createId.release();
		const discId = createId.disc();
		const trackId = createId.track();

		// イベントシリーズ -> イベント -> イベント日
		await db.insert(eventSeries).values({
			id: esId,
			name: "コミックマーケット",
		});
		await db.insert(events).values({
			id: evId,
			eventSeriesId: esId,
			name: "コミックマーケット100",
			edition: 100,
		});
		await db.insert(eventDays).values({
			id: edId,
			eventId: evId,
			dayNumber: 1,
			date: "2022-08-13",
		});

		// リリース -> ディスク -> トラック
		await db.insert(releases).values({
			id: releaseId,
			name: "Test Album",
			eventId: evId,
			eventDayId: edId,
		});
		await db.insert(discs).values({
			id: discId,
			releaseId,
			discNumber: 1,
			discName: "Disc 1",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			discId,
			trackNumber: 1,
			name: "Track 1",
			eventId: evId,
			eventDayId: edId,
		});

		// 全データが正しく取得できることを確認
		const track = firstRow(
			await db.select().from(tracks).where(eq(tracks.id, trackId)),
		);
		expect(track.releaseId).toBe(releaseId);
		expect(track.discId).toBe(discId);
		expect(track.eventId).toBe(evId);
		expect(track.eventDayId).toBe(edId);
	});

	test("track -> trackCredits -> trackCreditRoles の関連を構築できる", async () => {
		const artistId = createId.artist();
		const releaseId = createId.release();
		const trackId = createId.track();
		const creditId = createId.trackCredit();

		await db.insert(creditRoles).values({
			code: "vocal",
			label: "ボーカル",
		});
		await db.insert(artists).values({
			id: artistId,
			name: "Credit Test Artist",
			initialScript: "latin",
		});
		await db.insert(releases).values({
			id: releaseId,
			name: "Credit Test Release",
		});
		await db.insert(tracks).values({
			id: trackId,
			releaseId,
			trackNumber: 1,
			name: "Credit Test Track",
		});
		await db.insert(trackCredits).values({
			id: creditId,
			trackId,
			artistId,
			creditName: "Credit Test Artist",
		});
		await db.insert(trackCreditRoles).values({
			trackCreditId: creditId,
			roleCode: "vocal",
			rolePosition: 1,
		});

		// creditRolesを取得して確認
		const role = firstRow(
			await db
				.select()
				.from(trackCreditRoles)
				.where(eq(trackCreditRoles.trackCreditId, creditId)),
		);
		expect(role.trackCreditId).toBe(creditId);
		expect(role.roleCode).toBe("vocal");
		expect(role.rolePosition).toBe(1);
	});

	test("release -> releaseCircles の多対多関連を構築できる", async () => {
		const circleId = createId.circle();
		const releaseId = createId.release();

		await db.insert(circles).values({
			id: circleId,
			name: "RC Test Circle",
			initialScript: "latin",
		});
		await db.insert(releases).values({
			id: releaseId,
			name: "RC Test Release",
		});
		await db.insert(releaseCircles).values({
			releaseId,
			circleId,
			participationType: "host",
			position: 1,
		});

		const rc = firstRow(
			await db
				.select()
				.from(releaseCircles)
				.where(eq(releaseCircles.releaseId, releaseId)),
		);
		expect(rc.circleId).toBe(circleId);
		expect(rc.participationType).toBe("host");
	});

	test("officialWork -> officialSong -> officialSongLink の階層構造を構築できる", async () => {
		await db.insert(officialWorkCategories).values({
			code: "game",
			name: "ゲーム作品",
		});
		await db.insert(platforms).values({
			code: "youtube",
			name: "YouTube",
		});

		await db.insert(officialWorks).values({
			id: "ow_chain_test",
			categoryCode: "game",
			name: "Chain Test Work",
			nameJa: "チェーンテスト作品",
			numberInSeries: 6,
		});
		await db.insert(officialSongs).values({
			id: "os_chain_test",
			officialWorkId: "ow_chain_test",
			trackNumber: 1,
			name: "Chain Test Song",
			nameJa: "チェーンテスト曲",
		});

		const linkId = createId.officialSongLink();
		await db.insert(officialSongLinks).values({
			id: linkId,
			officialSongId: "os_chain_test",
			platformCode: "youtube",
			url: "https://youtube.com/watch?v=test",
		});

		const link = firstRow(
			await db
				.select()
				.from(officialSongLinks)
				.where(eq(officialSongLinks.id, linkId)),
		);
		expect(link.officialSongId).toBe("os_chain_test");
		expect(link.platformCode).toBe("youtube");
		expect(link.url).toBe("https://youtube.com/watch?v=test");
	});
});
