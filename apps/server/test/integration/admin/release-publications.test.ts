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
	releasePublications,
	releases,
} from "@thac/db";
import { releasePublicationsRouter } from "../../../src/routes/admin/releases/publications";
import { createTestPlatform, createTestRelease } from "../../helpers/fixtures";
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
	releaseId: string;
	platformCode: string;
	url: string;
	platform?: {
		code: string;
		name: string;
		category: string | null;
	} | null;
}

describe("Admin Release Publications API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(releasePublicationsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:releaseId/publications - 公開リンク一覧取得", () => {
		test("存在しないリリースは404を返す", async () => {
			const res = await app.request("/rel_nonexistent/publications");
			await expectNotFound(res);
		});

		test("公開リンクがない場合は空配列を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/publications");
			const json = await expectSuccess<PublicationResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("公開リンク一覧をプラットフォーム情報付きで返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify", name: "Spotify" }));
			await db.insert(releasePublications).values({
				id: "pub_001",
				releaseId: "rel_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/test",
			});

			const res = await app.request("/rel_test_001/publications");
			const json = await expectSuccess<PublicationResponse[]>(res);
			expect(json).toHaveLength(1);
			expect(json[0]?.platformCode).toBe("spotify");
			expect(json[0]?.platform?.name).toBe("Spotify");
		});
	});

	describe("POST /:releaseId/publications - 公開リンク追加", () => {
		test("存在しないリリースは404を返す", async () => {
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request(
				"/rel_nonexistent/publications",
				postJson({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			);
			await expectNotFound(res);
		});

		test("存在しないプラットフォームは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/publications",
				postJson({
					id: "pub_001",
					platformCode: "nonexistent",
					url: "https://example.com/test",
				}),
			);
			await expectNotFound(res);
		});

		test("新しい公開リンクを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify", name: "Spotify" }));

			const res = await app.request(
				"/rel_test_001/publications",
				postJson({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			);

			const json = await expectCreated<PublicationResponse>(res);
			expect(json.id).toBe("pub_001");
			expect(json.url).toBe("https://open.spotify.com/album/test");
		});

		test("ID重複は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(releasePublications).values({
				id: "pub_001",
				releaseId: "rel_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/test1",
			});

			const res = await app.request(
				"/rel_test_001/publications",
				postJson({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test2",
				}),
			);

			await expectConflict(res);
		});

		test("URL重複は409を返す", async () => {
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001" }),
					createTestRelease({ id: "rel_test_002" }),
				]);
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(releasePublications).values({
				id: "pub_001",
				releaseId: "rel_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/same",
			});

			// 異なるリリースで同じURLを追加しようとする
			const res = await app.request(
				"/rel_test_002/publications",
				postJson({
					id: "pub_002",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/same",
				}),
			);

			await expectConflict(res);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request(
				"/rel_test_001/publications",
				postJson({
					// id missing
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:releaseId/publications/:id - 公開リンク更新", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/publications/pub_nonexistent",
				putJson({
					url: "https://open.spotify.com/album/updated",
				}),
			);

			await expectNotFound(res);
		});

		test("URLを更新できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(releasePublications).values({
				id: "pub_001",
				releaseId: "rel_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/old",
			});

			const res = await app.request(
				"/rel_test_001/publications/pub_001",
				putJson({
					url: "https://open.spotify.com/album/new",
				}),
			);

			const json = await expectSuccess<PublicationResponse>(res);
			expect(json.url).toBe("https://open.spotify.com/album/new");
		});

		test("他と重複するURLへの更新は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(releasePublications).values([
				{
					id: "pub_001",
					releaseId: "rel_test_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/first",
				},
				{
					id: "pub_002",
					releaseId: "rel_test_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/second",
				},
			]);

			const res = await app.request(
				"/rel_test_001/publications/pub_002",
				putJson({
					url: "https://open.spotify.com/album/first",
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:releaseId/publications/:id - 公開リンク削除", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/publications/pub_nonexistent",
				deleteRequest(),
			);

			await expectNotFound(res);
		});

		test("公開リンクを削除できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));
			await db.insert(releasePublications).values({
				id: "pub_001",
				releaseId: "rel_test_001",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/test",
			});

			const res = await app.request(
				"/rel_test_001/publications/pub_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
			expect(json.id).toBe("pub_001");

			// 削除されたことを確認
			const checkRes = await app.request("/rel_test_001/publications");
			const pubs = await expectSuccess<PublicationResponse[]>(checkRes);
			expect(pubs).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(releasePublicationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/rel_test_001/publications");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(releasePublicationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/rel_test_001/publications");
			await expectForbidden(res);
		});
	});
});
