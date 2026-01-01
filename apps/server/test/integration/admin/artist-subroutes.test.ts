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
import { artistCirclesRouter } from "../../../src/routes/admin/artists/circles";
import { artistTracksRouter } from "../../../src/routes/admin/artists/tracks";
import {
	createTestArtist,
	createTestCircle,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface ArtistCircleResponse {
	circleId: string;
	circleName: string;
	releaseCount: number;
	participationTypes: string[];
}

interface ArtistTracksResult {
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

describe("Admin Artist Subroutes API", () => {
	let sqlite: Database;
	let circlesApp: ReturnType<typeof createTestAdminApp>;
	let tracksApp: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);

		// 複合ルーターを作成
		const combinedCirclesRouter = new Hono<AdminContext>();
		combinedCirclesRouter.route("/", artistCirclesRouter);
		circlesApp = createTestAdminApp(combinedCirclesRouter);

		const combinedTracksRouter = new Hono<AdminContext>();
		combinedTracksRouter.route("/", artistTracksRouter);
		tracksApp = createTestAdminApp(combinedTracksRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:artistId/circles - アーティストの参加サークル一覧取得", () => {
		test("関連データがない場合は空配列を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));

			const res = await circlesApp.request("/ar_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistCircleResponse[];
			expect(json).toEqual([]);
		});

		test("アーティストに関連するサークルを返す", async () => {
			// 基本データを作成
			await db
				.insert(artists)
				.values(createTestArtist({ id: "ar_test_001", name: "Test Artist" }));
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

			// トラッククレジットを追加
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Test Artist",
			});

			const res = await circlesApp.request("/ar_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistCircleResponse[];
			expect(json).toHaveLength(1);
			expect(json[0]?.circleId).toBe("ci_test_001");
			expect(json[0]?.circleName).toBe("Test Circle");
			expect(json[0]?.releaseCount).toBe(1);
			expect(json[0]?.participationTypes).toContain("host");
		});

		test("複数のサークルに参加している場合すべて返す", async () => {
			await db
				.insert(artists)
				.values(
					createTestArtist({ id: "ar_test_001", name: "Multi-Circle Artist" }),
				);
			await db
				.insert(circles)
				.values([
					createTestCircle({ id: "ci_test_001", name: "Circle A" }),
					createTestCircle({ id: "ci_test_002", name: "Circle B" }),
				]);
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001", name: "Release A" }),
					createTestRelease({ id: "rel_test_002", name: "Release B" }),
				]);
			await db.insert(tracks).values([
				createTestTrack({
					id: "tr_test_001",
					releaseId: "rel_test_001",
					name: "Track A",
				}),
				createTestTrack({
					id: "tr_test_002",
					releaseId: "rel_test_002",
					name: "Track B",
				}),
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
					participationType: "guest",
					position: 1,
				},
			]);
			await db.insert(trackCredits).values([
				{
					id: "tc_test_001",
					trackId: "tr_test_001",
					artistId: "ar_test_001",
					creditName: "Artist",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					creditName: "Artist",
				},
			]);

			const res = await circlesApp.request("/ar_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistCircleResponse[];
			expect(json).toHaveLength(2);
		});
	});

	describe("GET /:artistId/tracks - アーティストの関連楽曲取得", () => {
		test("関連楽曲がない場合は空の結果を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));

			const res = await tracksApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistTracksResult;
			expect(json.totalUniqueTrackCount).toBe(0);
			expect(json.tracks).toEqual([]);
			expect(json.byRole).toEqual({});
		});

		test("アーティストの関連楽曲を返す", async () => {
			await db
				.insert(artists)
				.values(createTestArtist({ id: "ar_test_001", name: "Test Artist" }));
			await db.insert(releases).values(
				createTestRelease({
					id: "rel_test_001",
					name: "Test Release",
					releaseDate: "2024-06-01",
				}),
			);
			await db.insert(tracks).values(
				createTestTrack({
					id: "tr_test_001",
					releaseId: "rel_test_001",
					name: "Test Track",
					trackNumber: 1,
				}),
			);
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Test Artist",
			});

			const res = await tracksApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistTracksResult;
			expect(json.totalUniqueTrackCount).toBe(1);
			expect(json.tracks).toHaveLength(1);
			expect(json.tracks[0]?.name).toBe("Test Track");
			expect(json.tracks[0]?.release?.name).toBe("Test Release");
			expect(json.statistics.releaseCount).toBe(1);
		});

		test("役割別のカウントを返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
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
				{ code: "composer", label: "Composer", sortOrder: 1 },
				{ code: "lyricist", label: "Lyricist", sortOrder: 2 },
			]);
			await db.insert(trackCredits).values([
				{
					id: "tc_test_001",
					trackId: "tr_test_001",
					artistId: "ar_test_001",
					creditName: "Artist",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					creditName: "Artist",
				},
			]);
			await db.insert(trackCreditRoles).values([
				{ trackCreditId: "tc_test_001", roleCode: "composer", rolePosition: 1 },
				{ trackCreditId: "tc_test_002", roleCode: "composer", rolePosition: 1 },
				{ trackCreditId: "tc_test_002", roleCode: "lyricist", rolePosition: 2 },
			]);

			const res = await tracksApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistTracksResult;
			expect(json.byRole.composer).toBe(2); // 2トラックで作曲
			expect(json.byRole.lyricist).toBe(1); // 1トラックで作詞
		});

		test("サークル名を含むリリース情報を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
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
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});

			const res = await tracksApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistTracksResult;
			expect(json.tracks[0]?.release?.circleNames).toBe("Test Circle");
		});

		test("統計情報（活動期間）を返す", async () => {
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001", releaseDate: "2020-01-01" }),
					createTestRelease({ id: "rel_test_002", releaseDate: "2024-12-01" }),
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
					creditName: "Artist",
				},
				{
					id: "tc_test_002",
					trackId: "tr_test_002",
					artistId: "ar_test_001",
					creditName: "Artist",
				},
			]);

			const res = await tracksApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ArtistTracksResult;
			expect(json.statistics.releaseCount).toBe(2);
			expect(json.statistics.earliestReleaseDate).toBe("2020-01-01");
			expect(json.statistics.latestReleaseDate).toBe("2024-12-01");
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", artistCirclesRouter);
			const unauthApp = createTestAdminApp(combinedRouter, { user: null });

			const res = await unauthApp.request("/ar_test_001/circles");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", artistTracksRouter);
			const nonAdminApp = createTestAdminApp(combinedRouter, {
				user: { role: "user" },
			});

			const res = await nonAdminApp.request("/ar_test_001/tracks");
			expect(res.status).toBe(403);
		});
	});
});
