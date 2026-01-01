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
import { circleArtistsRouter } from "../../../src/routes/admin/circles/artists";
import { circleReleasesRouter } from "../../../src/routes/admin/circles/releases";
import {
	createTestArtist,
	createTestCircle,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface CircleArtistResponse {
	artistId: string;
	artistName: string;
	trackCount: number;
	releaseCount: number;
	roles: string[];
}

interface CircleArtistsResult {
	artists: CircleArtistResponse[];
	statistics: {
		totalArtistCount: number;
		totalTrackCount: number;
		releaseCount: number;
		earliestReleaseDate: string | null;
		latestReleaseDate: string | null;
	};
}

interface CircleReleaseGroup {
	participationType: string;
	releases: Array<{
		id: string;
		name: string;
		releaseDate: string | null;
		releaseType: string | null;
	}>;
}

describe("Admin Circle Subroutes API", () => {
	let sqlite: Database;
	let artistsApp: ReturnType<typeof createTestAdminApp>;
	let releasesApp: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);

		// 複合ルーターを作成（circleArtistsRouterとcircleReleasesRouterを統合）
		const combinedArtistsRouter = new Hono<AdminContext>();
		combinedArtistsRouter.route("/", circleArtistsRouter);
		artistsApp = createTestAdminApp(combinedArtistsRouter);

		const combinedReleasesRouter = new Hono<AdminContext>();
		combinedReleasesRouter.route("/", circleReleasesRouter);
		releasesApp = createTestAdminApp(combinedReleasesRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:circleId/artists - サークルの参加アーティスト一覧取得", () => {
		test("関連データがない場合は空の結果を返す", async () => {
			// サークルを作成
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await artistsApp.request("/ci_test_001/artists");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleArtistsResult;
			expect(json.artists).toEqual([]);
			expect(json.statistics.totalArtistCount).toBe(0);
			expect(json.statistics.totalTrackCount).toBe(0);
		});

		test("サークルに関連するアーティストを返す", async () => {
			// 基本データを作成
			const circle = createTestCircle({ id: "ci_test_001" });
			const artist = createTestArtist({
				id: "ar_test_001",
				name: "Test Artist",
			});
			const release = createTestRelease({
				id: "rel_test_001",
				releaseDate: "2024-01-01",
			});
			const track = createTestTrack({
				id: "tr_test_001",
				releaseId: "rel_test_001",
			});

			await db.insert(circles).values(circle);
			await db.insert(artists).values(artist);
			await db.insert(releases).values(release);
			await db.insert(tracks).values(track);

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

			const res = await artistsApp.request("/ci_test_001/artists");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleArtistsResult;
			expect(json.artists).toHaveLength(1);
			expect(json.artists[0]?.artistId).toBe("ar_test_001");
			expect(json.artists[0]?.artistName).toBe("Test Artist");
			expect(json.statistics.totalArtistCount).toBe(1);
			expect(json.statistics.totalTrackCount).toBe(1);
			expect(json.statistics.releaseCount).toBe(1);
		});

		test("アーティストの役割情報を返す", async () => {
			// 基本データを作成
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db
				.insert(artists)
				.values(
					createTestArtist({ id: "ar_test_001", name: "Composer Artist" }),
				);
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

			// クレジットロールマスターを追加
			await db.insert(creditRoles).values([
				{ code: "composer", label: "Composer", sortOrder: 1 },
				{ code: "arranger", label: "Arranger", sortOrder: 2 },
			]);

			// トラッククレジットと役割を追加
			await db.insert(trackCredits).values({
				id: "tc_test_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Composer Artist",
			});
			await db.insert(trackCreditRoles).values([
				{ trackCreditId: "tc_test_001", roleCode: "composer", rolePosition: 1 },
				{ trackCreditId: "tc_test_001", roleCode: "arranger", rolePosition: 2 },
			]);

			const res = await artistsApp.request("/ci_test_001/artists");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleArtistsResult;
			expect(json.artists).toHaveLength(1);
			expect(json.artists[0]?.roles).toContain("composer");
			expect(json.artists[0]?.roles).toContain("arranger");
		});

		test("複数のリリースにまたがるアーティスト統計を返す", async () => {
			// 基本データを作成
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db
				.insert(artists)
				.values(
					createTestArtist({ id: "ar_test_001", name: "Multi-Release Artist" }),
				);
			await db.insert(releases).values([
				createTestRelease({
					id: "rel_test_001",
					name: "Release 1",
					releaseDate: "2024-01-01",
				}),
				createTestRelease({
					id: "rel_test_002",
					name: "Release 2",
					releaseDate: "2024-06-01",
				}),
			]);
			await db.insert(tracks).values([
				createTestTrack({
					id: "tr_test_001",
					releaseId: "rel_test_001",
					name: "Track 1",
				}),
				createTestTrack({
					id: "tr_test_002",
					releaseId: "rel_test_002",
					name: "Track 2",
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
					circleId: "ci_test_001",
					participationType: "host",
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

			const res = await artistsApp.request("/ci_test_001/artists");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleArtistsResult;
			expect(json.artists[0]?.trackCount).toBe(2);
			expect(json.artists[0]?.releaseCount).toBe(2);
			expect(json.statistics.earliestReleaseDate).toBe("2024-01-01");
			expect(json.statistics.latestReleaseDate).toBe("2024-06-01");
		});
	});

	describe("GET /:circleId/releases - サークルのリリース一覧取得", () => {
		test("関連リリースがない場合は空配列を返す", async () => {
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await releasesApp.request("/ci_test_001/releases");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleReleaseGroup[];
			expect(json).toEqual([]);
		});

		test("参加形態別にグループ化されたリリースを返す", async () => {
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releases).values([
				createTestRelease({
					id: "rel_test_001",
					name: "Host Release",
					releaseDate: "2024-01-01",
				}),
				createTestRelease({
					id: "rel_test_002",
					name: "Guest Release",
					releaseDate: "2024-02-01",
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
					circleId: "ci_test_001",
					participationType: "guest",
					position: 1,
				},
			]);

			const res = await releasesApp.request("/ci_test_001/releases");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleReleaseGroup[];
			expect(json).toHaveLength(2);

			const hostGroup = json.find((g) => g.participationType === "host");
			const guestGroup = json.find((g) => g.participationType === "guest");

			expect(hostGroup?.releases).toHaveLength(1);
			expect(hostGroup?.releases[0]?.name).toBe("Host Release");
			expect(guestGroup?.releases).toHaveLength(1);
			expect(guestGroup?.releases[0]?.name).toBe("Guest Release");
		});

		test("同一参加形態で複数のリリースを返す", async () => {
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releases).values([
				createTestRelease({
					id: "rel_test_001",
					name: "Release 1",
					releaseDate: "2024-01-01",
				}),
				createTestRelease({
					id: "rel_test_002",
					name: "Release 2",
					releaseDate: "2024-06-01",
				}),
				createTestRelease({
					id: "rel_test_003",
					name: "Release 3",
					releaseDate: "2024-12-01",
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
					circleId: "ci_test_001",
					participationType: "host",
					position: 2,
				},
				{
					releaseId: "rel_test_003",
					circleId: "ci_test_001",
					participationType: "host",
					position: 3,
				},
			]);

			const res = await releasesApp.request("/ci_test_001/releases");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleReleaseGroup[];
			expect(json).toHaveLength(1);

			const hostGroup = json.find((g) => g.participationType === "host");
			expect(hostGroup?.releases).toHaveLength(3);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", circleArtistsRouter);
			const unauthApp = createTestAdminApp(combinedRouter, { user: null });

			const res = await unauthApp.request("/ci_test_001/artists");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const combinedRouter = new Hono<AdminContext>();
			combinedRouter.route("/", circleArtistsRouter);
			const nonAdminApp = createTestAdminApp(combinedRouter, {
				user: { role: "user" },
			});

			const res = await nonAdminApp.request("/ci_test_001/artists");
			expect(res.status).toBe(403);
		});
	});
});
