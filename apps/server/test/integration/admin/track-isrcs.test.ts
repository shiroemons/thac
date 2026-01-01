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
	trackIsrcs,
	tracks,
} from "@thac/db";
import { trackIsrcsRouter } from "../../../src/routes/admin/tracks/isrcs";
import { createTestTrack } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface IsrcResponse {
	id: string;
	trackId: string;
	isrc: string;
	isPrimary: boolean;
}

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
}

describe("Admin Track ISRCs API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackIsrcsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:trackId/isrcs - ISRC一覧取得", () => {
		test("存在しないトラックは404を返す", async () => {
			const res = await app.request("/tr_nonexistent/isrcs");
			expect(res.status).toBe(404);
		});

		test("ISRCがない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/isrcs");
			expect(res.status).toBe(200);

			const json = (await res.json()) as IsrcResponse[];
			expect(json).toEqual([]);
		});

		test("ISRC一覧を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values([
				{
					id: "isrc_001",
					trackId: "tr_test_001",
					isrc: "JPXX01234567",
					isPrimary: true,
				},
				{
					id: "isrc_002",
					trackId: "tr_test_001",
					isrc: "JPXX09876543",
					isPrimary: false,
				},
			]);

			const res = await app.request("/tr_test_001/isrcs");
			expect(res.status).toBe(200);

			const json = (await res.json()) as IsrcResponse[];
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:trackId/isrcs - ISRC追加", () => {
		test("存在しないトラックは404を返す", async () => {
			const res = await app.request("/tr_nonexistent/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "isrc_001",
					isrc: "JPXX01234567",
					isPrimary: true,
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しいISRCを追加できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "isrc_001",
					isrc: "JPXX01234567",
					isPrimary: true,
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as IsrcResponse;
			expect(json.id).toBe("isrc_001");
			expect(json.isrc).toBe("JPXX01234567");
			expect(json.isPrimary).toBe(true);
		});

		test("ID重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values({
				id: "isrc_001",
				trackId: "tr_test_001",
				isrc: "JPXX01234567",
				isPrimary: true,
			});

			const res = await app.request("/tr_test_001/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "isrc_001",
					isrc: "JPXX09999999",
					isPrimary: false,
				}),
			});

			expect(res.status).toBe(409);
		});

		test("同一トラックで同じISRCの重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values({
				id: "isrc_001",
				trackId: "tr_test_001",
				isrc: "JPXX01234567",
				isPrimary: false,
			});

			const res = await app.request("/tr_test_001/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "isrc_002",
					isrc: "JPXX01234567",
					isPrimary: false,
				}),
			});

			expect(res.status).toBe(409);
		});

		test("同一トラック内で複数のprimaryは409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values({
				id: "isrc_001",
				trackId: "tr_test_001",
				isrc: "JPXX01234567",
				isPrimary: true,
			});

			const res = await app.request("/tr_test_001/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "isrc_002",
					isrc: "JPXX09876543",
					isPrimary: true,
				}),
			});

			expect(res.status).toBe(409);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/isrcs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					// id missing
					isrc: "JPXX01234567",
					isPrimary: true,
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:trackId/isrcs/:id - ISRC更新", () => {
		test("存在しないISRCは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/isrcs/isrc_nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isPrimary: false }),
			});

			expect(res.status).toBe(404);
		});

		test("isPrimaryを更新できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values({
				id: "isrc_001",
				trackId: "tr_test_001",
				isrc: "JPXX01234567",
				isPrimary: false,
			});

			const res = await app.request("/tr_test_001/isrcs/isrc_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isPrimary: true }),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as IsrcResponse;
			expect(json.isPrimary).toBe(true);
		});

		test("他にprimaryがある場合はprimaryへの変更は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values([
				{
					id: "isrc_001",
					trackId: "tr_test_001",
					isrc: "JPXX01234567",
					isPrimary: true,
				},
				{
					id: "isrc_002",
					trackId: "tr_test_001",
					isrc: "JPXX09876543",
					isPrimary: false,
				},
			]);

			const res = await app.request("/tr_test_001/isrcs/isrc_002", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isPrimary: true }),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:trackId/isrcs/:id - ISRC削除", () => {
		test("存在しないISRCは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/isrcs/isrc_nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});

		test("ISRCを削除できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(trackIsrcs).values({
				id: "isrc_001",
				trackId: "tr_test_001",
				isrc: "JPXX01234567",
				isPrimary: true,
			});

			const res = await app.request("/tr_test_001/isrcs/isrc_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("isrc_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_test_001/isrcs");
			const isrcs = (await checkRes.json()) as IsrcResponse[];
			expect(isrcs).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackIsrcsRouter, { user: null });
			const res = await unauthApp.request("/tr_test_001/isrcs");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackIsrcsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/isrcs");
			expect(res.status).toBe(403);
		});
	});
});
