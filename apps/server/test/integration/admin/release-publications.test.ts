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

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
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
			expect(res.status).toBe(404);
		});

		test("公開リンクがない場合は空配列を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/publications");
			expect(res.status).toBe(200);

			const json = (await res.json()) as PublicationResponse[];
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as PublicationResponse[];
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

			const res = await app.request("/rel_nonexistent/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("存在しないプラットフォームは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "pub_001",
					platformCode: "nonexistent",
					url: "https://example.com/test",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しい公開リンクを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify", name: "Spotify" }));

			const res = await app.request("/rel_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as PublicationResponse;
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

			const res = await app.request("/rel_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "pub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test2",
				}),
			});

			expect(res.status).toBe(409);
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
			const res = await app.request("/rel_test_002/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "pub_002",
					platformCode: "spotify",
					url: "https://open.spotify.com/album/same",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request("/rel_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					// id missing
					platformCode: "spotify",
					url: "https://open.spotify.com/album/test",
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
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
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						url: "https://open.spotify.com/album/updated",
					}),
				},
			);

			expect(res.status).toBe(404);
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

			const res = await app.request("/rel_test_001/publications/pub_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: "https://open.spotify.com/album/new",
				}),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as PublicationResponse;
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

			const res = await app.request("/rel_test_001/publications/pub_002", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: "https://open.spotify.com/album/first",
				}),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:releaseId/publications/:id - 公開リンク削除", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/publications/pub_nonexistent",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(404);
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

			const res = await app.request("/rel_test_001/publications/pub_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("pub_001");

			// 削除されたことを確認
			const checkRes = await app.request("/rel_test_001/publications");
			const pubs = (await checkRes.json()) as PublicationResponse[];
			expect(pubs).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(releasePublicationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/rel_test_001/publications");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(releasePublicationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/rel_test_001/publications");
			expect(res.status).toBe(403);
		});
	});
});
