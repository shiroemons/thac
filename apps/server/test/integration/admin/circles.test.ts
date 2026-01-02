/**
 * Admin Circles API 統合テスト
 *
 * @description
 * サークル管理APIのCRUD操作、認証、楽観的ロックをテスト
 */

import type { Database } from "bun:sqlite";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { __resetDatabase, __setTestDatabase, circles } from "@thac/db";
import { circlesRouter } from "../../../src/routes/admin/circles";
import { createTestCircle } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// 型定義
interface ListResponse {
	data: Array<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		sortName: string | null;
		nameInitial: string | null;
		initialScript: string;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface CircleResponse {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
	links?: Array<unknown>;
}

interface ErrorResponse {
	error: string;
	details?: Record<string, string[]>;
}

describe("Admin Circles API", () => {
	let testDb: ReturnType<typeof createTestDatabase>["db"];
	let sqlite: Database;

	beforeAll(() => {
		const result = createTestDatabase();
		testDb = result.db;
		sqlite = result.sqlite;
		__setTestDatabase(testDb);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET / - 一覧取得", () => {
		test("サークルが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		test("サークル一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			// テストデータを挿入
			const circle1 = createTestCircle({
				name: "Alpha Circle",
				nameInitial: "A",
			});
			const circle2 = createTestCircle({
				name: "Beta Circle",
				nameInitial: "B",
			});
			await testDb.insert(circles).values([circle1, circle2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
			expect(json.page).toBe(1);
			expect(json.limit).toBe(10);
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle1 = createTestCircle({
				name: "Sound Horizon",
				nameInitial: "S",
			});
			const circle2 = createTestCircle({ name: "IOSYS", nameInitial: "I" });
			await testDb.insert(circles).values([circle1, circle2]);

			const res = await app.request("/?search=IOSYS");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("IOSYS");
		});

		test("頭文字でフィルタリングできる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle1 = createTestCircle({
				name: "あ行サークル",
				nameInitial: "あ",
				initialScript: "hiragana",
			});
			const circle2 = createTestCircle({
				name: "Latin Circle",
				nameInitial: "L",
			});
			await testDb.insert(circles).values([circle1, circle2]);

			const res = await app.request("/?initialScript=hiragana");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("あ行サークル");
		});

		test("ソート順を指定できる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle1 = createTestCircle({
				name: "Alpha Circle",
				nameInitial: "A",
			});
			const circle2 = createTestCircle({
				name: "Beta Circle",
				nameInitial: "B",
			});
			const circle3 = createTestCircle({
				name: "Gamma Circle",
				nameInitial: "G",
			});
			await testDb.insert(circles).values([circle1, circle2, circle3]);

			const res = await app.request("/?sortBy=name&sortOrder=desc");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ListResponse;
			expect(json.data[0]?.name).toBe("Gamma Circle");
			expect(json.data[1]?.name).toBe("Beta Circle");
			expect(json.data[2]?.name).toBe("Alpha Circle");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するサークルを返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle({ name: "Test Circle" });
			await testDb.insert(circles).values(circle);

			const res = await app.request(`/${circle.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as CircleResponse;
			expect(json.id).toBe(circle.id);
			expect(json.name).toBe("Test Circle");
			expect(json.links).toBeDefined();
		});

		test("存在しないサークルは404を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいサークルを作成できる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle();
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(circle),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as CircleResponse;
			expect(json.id).toBe(circle.id);
			expect(json.name).toBe(circle.name);
		});

		test("latin/hiragana/katakanaの場合はnameInitialが必須", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle({
				nameInitial: null,
				initialScript: "latin",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(circle),
			});

			expect(res.status).toBe(400);
		});

		test("必須フィールドが欠けている場合は400を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Test" }),
			});

			expect(res.status).toBe(400);
		});

		test("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle();
			await testDb.insert(circles).values(circle);

			const duplicateCircle = createTestCircle({
				id: circle.id,
				name: "Different Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateCircle),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("ID");
		});

		test("重複する名前は409を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle({ name: "Sound Horizon" });
			await testDb.insert(circles).values(circle);

			const duplicateCircle = createTestCircle({ name: "Sound Horizon" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateCircle),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("サークルを更新できる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle({ name: "Original Circle" });
			await testDb.insert(circles).values(circle);

			// 最新のupdatedAtを取得
			const res = await app.request(`/${circle.id}`);
			const existingCircle = (await res.json()) as CircleResponse;

			const updateRes = await app.request(`/${circle.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated Circle",
					updatedAt: existingCircle.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as CircleResponse;
			expect(json.name).toBe("Updated Circle");
		});

		test("存在しないサークルは404を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		test("他のサークルと重複する名前は409を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle1 = createTestCircle({ name: "Circle One" });
			const circle2 = createTestCircle({ name: "Circle Two" });
			await testDb.insert(circles).values([circle1, circle2]);

			// 最新のupdatedAtを取得
			const res = await app.request(`/${circle2.id}`);
			const existingCircle = (await res.json()) as CircleResponse;

			const updateRes = await app.request(`/${circle2.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Circle One",
					updatedAt: existingCircle.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(409);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle({ name: "Original Circle" });
			await testDb.insert(circles).values(circle);

			// 古いタイムスタンプで更新を試みる
			const res = await app.request(`/${circle.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated Circle",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("更新");
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("サークルを削除できる", async () => {
			const app = createTestAdminApp(circlesRouter);

			const circle = createTestCircle();
			await testDb.insert(circles).values(circle);

			const res = await app.request(`/${circle.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as { success: boolean; id: string };
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${circle.id}`);
			expect(getRes.status).toBe(404);
		});

		test("存在しないサークルは404を返す", async () => {
			const app = createTestAdminApp(circlesRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(circlesRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(circlesRouter, { user: { role: "user" } });

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});
