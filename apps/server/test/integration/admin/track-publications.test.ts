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

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
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
			expect(res.status).toBe(404);
		});

		test("公開リンクがない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/publications");
			expect(res.status).toBe(200);

			const json = (await res.json()) as PublicationResponse[];
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as PublicationResponse[];
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as PublicationResponse[];
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:trackId/publications - 公開リンク追加", () => {
		test("存在しないトラックは404を返す", async () => {
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request("/tr_nonexistent/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("存在しないプラットフォームは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "tpub_001",
					platformCode: "nonexistent",
					url: "https://example.com/track/test123",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しい公開リンクを追加できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify", name: "Spotify" }));

			const res = await app.request("/tr_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as PublicationResponse;
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

			const res = await app.request("/tr_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "tpub_001",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/different",
				}),
			});

			expect(res.status).toBe(409);
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
			const res = await app.request("/tr_test_002/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "tpub_002",
					platformCode: "spotify",
					url: "https://open.spotify.com/track/same",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(platforms)
				.values(createTestPlatform({ code: "spotify" }));

			const res = await app.request("/tr_test_001/publications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					// id missing
					platformCode: "spotify",
					url: "https://open.spotify.com/track/test123",
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:trackId/publications/:id - 公開リンク更新", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/publications/tpub_nonexistent",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						url: "https://example.com/new-url",
					}),
				},
			);

			expect(res.status).toBe(404);
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

			const res = await app.request("/tr_test_001/publications/tpub_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: "https://open.spotify.com/track/new",
				}),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as PublicationResponse;
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

			const res = await app.request("/tr_test_001/publications/tpub_002", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: "https://open.spotify.com/track/first",
				}),
			});

			expect(res.status).toBe(409);
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

			const res = await app.request("/tr_test_001/publications/tpub_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: "https://open.spotify.com/track/same",
				}),
			});

			expect(res.status).toBe(200);
		});
	});

	describe("DELETE /:trackId/publications/:id - 公開リンク削除", () => {
		test("存在しない公開リンクは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/publications/tpub_nonexistent",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(404);
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

			const res = await app.request("/tr_test_001/publications/tpub_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("tpub_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_test_001/publications");
			const publications = (await checkRes.json()) as PublicationResponse[];
			expect(publications).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackPublicationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/tr_test_001/publications");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackPublicationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/publications");
			expect(res.status).toBe(403);
		});
	});
});
