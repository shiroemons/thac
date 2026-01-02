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
	circleLinks,
	circles,
	db,
	eventDays,
	events,
	platforms,
} from "@thac/db";
import { exportRouter } from "../../../src/routes/admin/export";
import {
	createTestArtist,
	createTestArtistAlias,
	createTestCircle,
	createTestEvent,
	createTestPlatform,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	expectForbidden,
	expectUnauthorized,
} from "../../helpers/test-response";

describe("Admin Export API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(exportRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /artists - アーティストエクスポート", () => {
		test("全アーティストをTSV形式でエクスポートできる", async () => {
			await db
				.insert(artists)
				.values([
					createTestArtist({ name: "アーティストA" }),
					createTestArtist({ name: "アーティストB" }),
				]);

			const res = await app.request("/artists?format=tsv");

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain(
				"text/tab-separated-values",
			);
			expect(res.headers.get("Content-Disposition")).toContain("artists_");
			expect(res.headers.get("Content-Disposition")).toContain(".tsv");

			const tsv = await res.text();
			expect(tsv).toContain("id\tname\tnameJa");
			expect(tsv).toContain("アーティストA");
			expect(tsv).toContain("アーティストB");
		});

		test("全アーティストをJSON形式でエクスポートできる", async () => {
			await db
				.insert(artists)
				.values([
					createTestArtist({ name: "アーティストA" }),
					createTestArtist({ name: "アーティストB" }),
				]);

			const res = await app.request("/artists?format=json");

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("application/json");
			expect(res.headers.get("Content-Disposition")).toContain("artists_");
			expect(res.headers.get("Content-Disposition")).toContain(".json");

			const json = await res.json();
			expect(Array.isArray(json)).toBe(true);
			expect(json).toHaveLength(2);
			expect(json[0].name).toBe("アーティストA");
		});

		test("デフォルトはJSON形式", async () => {
			await db.insert(artists).values(createTestArtist({ name: "テスト" }));

			const res = await app.request("/artists");

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain("application/json");
		});

		test("検索条件を反映したエクスポートができる", async () => {
			await db
				.insert(artists)
				.values([
					createTestArtist({ name: "Alpha Artist" }),
					createTestArtist({ name: "Beta Artist" }),
				]);

			const res = await app.request("/artists?format=tsv&search=Alpha");
			const tsv = await res.text();

			expect(tsv).toContain("Alpha Artist");
			expect(tsv).not.toContain("Beta Artist");
		});

		test("頭文字フィルタを反映したエクスポートができる", async () => {
			await db
				.insert(artists)
				.values([
					createTestArtist({ name: "Latin", initialScript: "latin" }),
					createTestArtist({ name: "ひらがな", initialScript: "hiragana" }),
				]);

			const res = await app.request(
				"/artists?format=json&initialScript=hiragana",
			);
			const json = await res.json();

			expect(json).toHaveLength(1);
			expect(json[0].name).toBe("ひらがな");
		});

		test("関連データ（別名）を含めてエクスポートできる", async () => {
			const artist = createTestArtist({
				id: "ar_001",
				name: "テストアーティスト",
			});
			await db.insert(artists).values(artist);
			await db
				.insert(artistAliases)
				.values(createTestArtistAlias({ artistId: "ar_001", name: "別名義A" }));

			const res = await app.request(
				"/artists?format=json&includeRelations=true",
			);
			const json = await res.json();

			expect(json[0].aliases).toHaveLength(1);
			expect(json[0].aliases[0].name).toBe("別名義A");
		});

		test("データが存在しない場合はヘッダーのみを返す（TSV）", async () => {
			const res = await app.request("/artists?format=tsv");

			expect(res.status).toBe(200);
			const tsv = await res.text();
			expect(tsv).toBe(
				"id\tname\tnameJa\tnameEn\tsortName\tnameInitial\tinitialScript\tnotes\tcreatedAt\tupdatedAt",
			);
		});

		test("データが存在しない場合は空配列を返す（JSON）", async () => {
			const res = await app.request("/artists?format=json");

			expect(res.status).toBe(200);
			const json = await res.json();
			expect(json).toEqual([]);
		});
	});

	describe("GET /circles - サークルエクスポート", () => {
		test("全サークルをTSV形式でエクスポートできる", async () => {
			await db
				.insert(circles)
				.values([
					createTestCircle({ name: "サークルA" }),
					createTestCircle({ name: "サークルB" }),
				]);

			const res = await app.request("/circles?format=tsv");

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toContain(
				"text/tab-separated-values",
			);

			const tsv = await res.text();
			expect(tsv).toContain("サークルA");
			expect(tsv).toContain("サークルB");
		});

		test("関連データ（リンク）を含めてエクスポートできる", async () => {
			const platform = createTestPlatform({ code: "twitter" });
			await db.insert(platforms).values(platform);

			const circle = createTestCircle({ id: "ci_001", name: "テストサークル" });
			await db.insert(circles).values(circle);
			await db.insert(circleLinks).values({
				id: "cl_001",
				circleId: "ci_001",
				platformCode: "twitter",
				url: "https://twitter.com/test",
				isOfficial: true,
				isPrimary: true,
			});

			const res = await app.request(
				"/circles?format=json&includeRelations=true",
			);
			const json = await res.json();

			expect(json[0].links).toHaveLength(1);
			expect(json[0].links[0].url).toBe("https://twitter.com/test");
		});
	});

	describe("GET /events - イベントエクスポート", () => {
		test("全イベントをTSV形式でエクスポートできる", async () => {
			await db
				.insert(events)
				.values([
					createTestEvent({ name: "イベントA" }),
					createTestEvent({ name: "イベントB" }),
				]);

			const res = await app.request("/events?format=tsv");

			expect(res.status).toBe(200);
			const tsv = await res.text();
			expect(tsv).toContain("イベントA");
			expect(tsv).toContain("イベントB");
		});

		test("関連データ（日程）を含めてエクスポートできる", async () => {
			const event = createTestEvent({ id: "ev_001", name: "テストイベント" });
			await db.insert(events).values(event);
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_001",
				dayNumber: 1,
				date: "2024-08-10",
			});

			const res = await app.request(
				"/events?format=json&includeRelations=true",
			);
			const json = await res.json();

			expect(json[0].eventDays).toHaveLength(1);
			expect(json[0].eventDays[0].date).toBe("2024-08-10");
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(exportRouter, { user: null });
			const res = await unauthApp.request("/artists");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(exportRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/artists");
			await expectForbidden(res);
		});
	});
});
