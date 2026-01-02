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
	db,
	platforms,
	trackPublications,
	tracks,
} from "@thac/db";
import { trackPublicationsRouter } from "../../../src/routes/admin/tracks/publications";
import { createTestPlatform, createTestTrack } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	type DeleteResponse,
	deleteRequest,
	expectBadRequest,
	expectConflict,
	expectCreated,
	expectForbidden,
	expectNotFound,
	expectSuccess,
	expectUnauthorized,
	postJson,
	putJson,
} from "../../helpers/test-response";

// レスポンスの型定義
interface PublicationResponse {
	id: string;
	trackId: string;
	platformCode: string;
	url: string;
	platform?: {
		code: string;
		name: string;
		category: string;
	} | null;
}

describe("Admin Track Publications API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackPublicationsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:trackId/publications - 公開リンク一覧取得", () => {
		test("存在しないトラックは404を返す", async () => {
			const res = await app.request("/tr_nonexistent/publications");
			await expectNotFound(res);
		});

		test("公開リンクがない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/publications");
			const json = await expectSuccess<PublicationResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("公開リンク一覧をプラットフォーム情報付きで返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(platforms).values(
				createTestPlatform({
					code: "spotify",
					name: "Spotify",
					category: "streaming",
				}),
			);
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/test123",
			});

			const res = await app.request("/tr_test_001/publications");
			const json = await expectSuccess<PublicationResponse[]>(res);
			expect(json).toHaveLength(1);
			expect(json[0]?.platformCode).toBe("spotify");
			expect(json[0]?.url).toBe("https://open.spotify.com/track/test123");
			expect(json[0]?.platform?.name).toBe("Spotify");
		});

		test("複数の公開リンクを返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(platforms).values([
				createTestPlatform({
					code: "spotify",
					name: "Spotify",
					category: "streaming",
				}),
				createTestPlatform({
					code: "apple_music",
					name: "Apple Music",
					category: "streaming",
				}),
			]);
			await db.insert(trackPublications).values([
				{
					id: "tpub_001",
					trackId: "tr_test_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				},
				{
					id: "tpub_002",
					trackId: "tr_test_001",
					platformCode: "apple_music",
					url: "https://music.apple.com/track/test456",
				},
			]);

			const res = await app.request("/tr_test_001/publications");
			const json = await expectSuccess<PublicationResponse[]>(res);
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:trackId/publications - 公開リンク追加", () => {
		test("存在しないトラックは404を返す", async () => {
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request(
				"/tr_nonexistent/publications",
				postJson({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			);
			await expectNotFound(res);
		});

		test("存在しないプラットフォームは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/publications",
				postJson({
					id: "tpub_001",
					platformCode: "nonexistent",
					url: "https://example.com/track/test123",
				}),
			);
			await expectNotFound(res);
		});

		test("新しい公開リンクを追加できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify", name: "Spotify" }));

			const res = await app.request(
				"/tr_test_001/publications",
				postJson({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			);

			const json = await expectCreated<PublicationResponse>(res);
			expect(json.id).toBe("tpub_001");
			expect(json.platformCode).toBe("spotify");
			expect(json.url).toBe("https://open.spotify.com/track/test123");
		});

		test("ID重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/original",
			});

			const res = await app.request(
				"/tr_test_001/publications",
				postJson({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/different",
				}),
			);

			await expectConflict(res);
		});

		test("URL重複は409を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_test_001" }),
					createTestTrack({ id: "tr_test_002" }),
				]);
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/same",
			});

			// 別のトラックでも同じURLは拒否される
			const res = await app.request(
				"/tr_test_002/publications",
				postJson({
					id: "tpub_002",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/same",
				}),
			);

			await expectConflict(res);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request(
				"/tr_test_001/publications",
				postJson({
					// id missing
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:trackId/publications/:id - 公開リンク更新", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/publications/tpub_nonexistent",
				putJson({
					url: "https://example.com/new-url",
				}),
			);

			await expectNotFound(res);
		});

		test("URLを更新できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/old",
			});

			const res = await app.request(
				"/tr_test_001/publications/tpub_001",
				putJson({
					url: "https://open.spotify.com/track/new",
				}),
			);

			const json = await expectSuccess<PublicationResponse>(res);
			expect(json.url).toBe("https://open.spotify.com/track/new");
		});

		test("更新時にURL重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values([
				{
					id: "tpub_001",
					trackId: "tr_test_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/first",
				},
				{
					id: "tpub_002",
					trackId: "tr_test_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/second",
				},
			]);

			const res = await app.request(
				"/tr_test_001/publications/tpub_002",
				putJson({
					url: "https://open.spotify.com/track/first",
				}),
			);

			await expectConflict(res);
		});

		test("同じURLへの更新は許可される", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/same",
			});

			const res = await app.request(
				"/tr_test_001/publications/tpub_001",
				putJson({
					url: "https://open.spotify.com/track/same",
				}),
			);

			await expectSuccess<PublicationResponse>(res);
		});
	});

	describe("DELETE /:trackId/publications/:id - 公開リンク削除", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/publications/tpub_nonexistent",
				deleteRequest(),
			);

			await expectNotFound(res);
		});

		test("公開リンクを削除できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(trackPublications).values({
				id: "tpub_001",
				trackId: "tr_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/track/test",
			});

			const res = await app.request(
				"/tr_test_001/publications/tpub_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
			expect(json.id).toBe("tpub_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_test_001/publications");
			const publications = await expectSuccess<PublicationResponse[]>(checkRes);
			expect(publications).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackPublicationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/tr_test_001/publications");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackPublicationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/publications");
			await expectForbidden(res);
		});
	});
});
