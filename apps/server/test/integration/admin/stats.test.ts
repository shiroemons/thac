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
	db,
	eventSeries,
	events,
	platforms,
} from "@thac/db";
import { statsRouter } from "../../../src/routes/admin/stats";
import { createTestArtist, createTestCircle } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface StatsResponse {
	users: number;
	platforms: number;
	aliasTypes: number;
	creditRoles: number;
	officialWorkCategories: number;
	officialWorks: number;
	officialSongs: number;
	artists: number;
	artistAliases: number;
	circles: number;
	events: number;
	eventSeries: number;
	releases: number;
	tracks: number;
}

describe("Admin Stats API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(statsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET / - 統計情報取得", () => {
		test("空のデータベースでは全てのカウントが0を返す", async () => {
			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as StatsResponse;
			expect(json.users).toBe(0);
			expect(json.platforms).toBe(0);
			expect(json.artists).toBe(0);
			expect(json.circles).toBe(0);
			expect(json.events).toBe(0);
			expect(json.eventSeries).toBe(0);
			expect(json.releases).toBe(0);
			expect(json.tracks).toBe(0);
		});

		test("データが存在する場合は正しいカウントを返す", async () => {
			// テストデータを挿入
			await db
				.insert(artists)
				.values([
					createTestArtist({ name: "Artist 1" }),
					createTestArtist({ name: "Artist 2" }),
				]);
			await db
				.insert(circles)
				.values([
					createTestCircle({ name: "Circle 1" }),
					createTestCircle({ name: "Circle 2" }),
					createTestCircle({ name: "Circle 3" }),
				]);
			await db.insert(platforms).values({
				code: "test_platform",
				name: "Test Platform",
				sortOrder: 1,
			});

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as StatsResponse;
			expect(json.artists).toBe(2);
			expect(json.circles).toBe(3);
			expect(json.platforms).toBe(1);
		});

		test("イベント関連のカウントを正しく返す", async () => {
			// イベントシリーズを作成
			await db.insert(eventSeries).values({
				id: "es_test_001",
				name: "Test Event Series",
				sortOrder: 1,
			});
			// イベントを作成
			await db.insert(events).values([
				{
					id: "ev_test_001",
					name: "Test Event 1",
					eventSeriesId: "es_test_001",
					totalDays: 2,
				},
				{
					id: "ev_test_002",
					name: "Test Event 2",
					eventSeriesId: "es_test_001",
					totalDays: 1,
				},
			]);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as StatsResponse;
			expect(json.eventSeries).toBe(1);
			expect(json.events).toBe(2);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(statsRouter, { user: null });
			const res = await unauthApp.request("/");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(statsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			expect(res.status).toBe(403);
		});
	});
});
