import type { Database } from "bun:sqlite";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import {
	__resetDatabase,
	__setTestDatabase,
	artistAliases,
	artists,
	circles,
	creditRoles,
	db,
	releaseCircles,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../src/middleware/admin-auth";
import { aliasCirclesRouter } from "../../../src/routes/admin/artist-aliases/circles";
import { aliasTracksRouter } from "../../../src/routes/admin/artist-aliases/tracks";
import {
	createTestArtist,
	createTestArtistAlias,
	createTestCircle,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface AliasCircleResponse {
	circleId: string;
	circleName: string;
	releaseCount: number;
	participationTypes: string[];
}

interface AliasTracksResult {
	totalUniqueTrackCount: number;
	byRole: Record<string, number>;
	tracks: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		trackNumber: number;
		release: {
			id: string;
			name: string;
			releaseDate: string | null;
			circleNames: string | null;
		} | null;
	}>;
	statistics: {
		releaseCount: number;
		earliestReleaseDate: string | null;
		latestReleaseDate: string | null;
	};
}

describe("Admin Artist Alias Subroutes API", () => {
	let sqlite: Database;
	let circlesApp: ReturnType<typeof createTestAdminApp>;
	let tracksApp: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);

		// 複合ルーターを作成
		const combinedCirclesRouter = new Hono<AdminContext>();
		combinedCirclesRouter.route("/", aliasCirclesRouter);
		circlesApp = createTestAdminApp(combinedCirclesRouter);

		const combinedTracksRouter = new Hono<AdminContext>();
		combinedTracksRouter.route("/", aliasTracksRouter);
		tracksApp = createTestAdminApp(combinedTracksRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:aliasId/circles - アーティスト名義の参加サークル一覧取得", () => {
		test("関連データがない場合は空配列を返す", async () => {
			// アーティストと別名を作成
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
					name: "Test Alias",
				}),
			);

			const res = await circlesApp.request("/aa_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasCircleResponse[];
			expect(json).toEqual([]);
		});

		test("名義に関連するサークルを返す", async () => {
			// 基本データを作成
			await db
				.insert(artists)
				.values(createTestArtist({ id: "ar_test_001", name: "Main Artist" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
					name: "Alias Name",
				}),
			);
			await db
				.insert(circles)
				.values(createTestCircle({ id: "ci_test_001", name: "Test Circle" }));
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			// サークルとリリースを関連付け
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			// トラッククレジット（別名義で参加）を追加
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				artistAliasId: "aa_test_001",
				creditName: "Alias Name",
			});

			const res = await circlesApp.request("/aa_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasCircleResponse[];
			expect(json).toHaveLength(1);
			expect(json[0]?.circleId).toBe("ci_test_001");
			expect(json[0]?.circleName).toBe("Test Circle");
			expect(json[0]?.releaseCount).toBe(1);
			expect(json[0]?.participationTypes).toContain("host");
		});

		test("同じアーティストでも異なる名義は分離される", async () => {
			// アーティストと2つの別名を作成
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values([
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
					name: "Alias A",
				}),
				createTestArtistAlias({
					id: "aa_test_002",
					artistId: "ar_test_001",
					name: "Alias B",
				}),
			]);
			await db
				.insert(circles)
				.values([
					createTestCircle({ id: "ci_test_001", name: "Circle A" }),
					createTestCircle({ id: "ci_test_002", name: "Circle B" }),
				]);
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001" }),
					createTestRelease({ id: "rel_test_002" }),
				]);
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
					createTestTrack({ id: "tr_test_002", releaseId: "rel_test_002" }),
				]);
			await db.insert(releaseCircles).values([
				{
					releaseId: "rel_test_001",
					circleId: "ci_test_001",
					participationType: "host",
					position: 1,
				},
				{
					releaseId: "rel_test_002",
					circleId: "ci_test_002",
					participationType: "host",
					position: 1,
				},
			]);
			await db.insert(trackCredits).values([
				{
					id: "tc_test_001",
					trackId: "tr_test_001",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias A",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_002",
					creditName: "Alias B",
				},
			]);

			// Alias A のサークル（Circle A のみ）
			const resA = await circlesApp.request("/aa_test_001/circles");
			const jsonA = (await resA.json()) as AliasCircleResponse[];
			expect(jsonA).toHaveLength(1);
			expect(jsonA[0]?.circleName).toBe("Circle A");

			// Alias B のサークル（Circle B のみ）
			const resB = await circlesApp.request("/aa_test_002/circles");
			const jsonB = (await resB.json()) as AliasCircleResponse[];
			expect(jsonB).toHaveLength(1);
			expect(jsonB[0]?.circleName).toBe("Circle B");
		});
	});

	describe("GET /:aliasId/tracks - アーティスト名義の関連楽曲取得", () => {
		test("関連楽曲がない場合は空の結果を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
				}),
			);

			const res = await tracksApp.request("/aa_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTracksResult;
			expect(json.totalUniqueTrackCount).toBe(0);
			expect(json.tracks).toEqual([]);
			expect(json.byRole).toEqual({});
		});

		test("名義で参加した楽曲を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
					name: "Solo Project",
				}),
			);
			await db.insert(releases).values(
				createTestRelease({
					id: "rel_test_001",
					name: "Test Album",
					releaseDate: "2024-06-01",
				}),
			);
			await db.insert(tracks).values(
				createTestTrack({
					id: "tr_test_001",
					releaseId: "rel_test_001",
					name: "Track 1",
					trackNumber: 1,
				}),
			);
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				artistAliasId: "aa_test_001",
				creditName: "Solo Project",
			});

			const res = await tracksApp.request("/aa_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTracksResult;
			expect(json.totalUniqueTrackCount).toBe(1);
			expect(json.tracks).toHaveLength(1);
			expect(json.tracks[0]?.name).toBe("Track 1");
			expect(json.tracks[0]?.release?.name).toBe("Test Album");
		});

		test("役割別のカウントを返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
				}),
			);
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(tracks).values([
				createTestTrack({
					id: "tr_test_001",
					releaseId: "rel_test_001",
					name: "Track 1",
				}),
				createTestTrack({
					id: "tr_test_002",
					releaseId: "rel_test_001",
					name: "Track 2",
				}),
			]);
			await db.insert(creditRoles).values([
				{ code: "vocal", label: "Vocal", sortOrder: 1 },
				{ code: "guitar", label: "Guitar", sortOrder: 2 },
			]);
			await db.insert(trackCredits).values([
				{
					id: "tc_test_001",
					trackId: "tr_test_001",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias",
				},
			]);
			await db.insert(trackCreditRoles).values([
				{ trackCreditId: "tc_test_001", roleCode: "vocal", rolePosition: 1 },
				{ trackCreditId: "tc_test_002", roleCode: "vocal", rolePosition: 1 },
				{ trackCreditId: "tc_test_002", roleCode: "guitar", rolePosition: 2 },
			]);

			const res = await tracksApp.request("/aa_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTracksResult;
			expect(json.byRole.vocal).toBe(2);
			expect(json.byRole.guitar).toBe(1);
		});

		test("統計情報（活動期間）を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
				}),
			);
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001", releaseDate: "2022-03-15" }),
					createTestRelease({ id: "rel_test_002", releaseDate: "2024-08-20" }),
				]);
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
					createTestTrack({ id: "tr_test_002", releaseId: "rel_test_002" }),
				]);
			await db.insert(trackCredits).values([
				{
					id: "tc_test_001",
					trackId: "tr_test_001",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias",
				},
			]);

			const res = await tracksApp.request("/aa_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTracksResult;
			expect(json.statistics.releaseCount).toBe(2);
			expect(json.statistics.earliestReleaseDate).toBe("2022-03-15");
			expect(json.statistics.latestReleaseDate).toBe("2024-08-20");
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", aliasCirclesRouter);
			const unauthApp = createTestAdminApp(combinedRouter, { user: null });

			const res = await unauthApp.request("/aa_test_001/circles");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", aliasTracksRouter);
			const nonAdminApp = createTestAdminApp(combinedRouter, {
				user: { role: "user" },
			});

			const res = await nonAdminApp.request("/aa_test_001/tracks");
			expect(res.status).toBe(403);
		});
	});
});
