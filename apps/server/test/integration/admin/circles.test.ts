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
import {
	type DeleteResponse,
	deleteRequest,
	expectBadRequest,
	expectConflict,
	expectCreated,
	expectEmptyList,
	expectForbidden,
	expectNotFound,
	expectPagination,
	expectSuccess,
	expectUnauthorized,
	type PaginatedResponse,
	postJson,
	putJson,
} from "../../helpers/test-response";

// エンティティ固有のレスポンス型
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

describe("Admin Circles API", () => {
	let testDb: ReturnType<typeof createTestDatabase>["db"];
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const result = createTestDatabase();
		testDb = result.db;
		sqlite = result.sqlite;
		__setTestDatabase(testDb);
		app = createTestAdminApp(circlesRouter);
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
			const res = await app.request("/");
			await expectEmptyList<CircleResponse>(res);
		});

		test("サークル一覧をページネーション付きで返す", async () => {
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
			const json = await expectSuccess<PaginatedResponse<CircleResponse>>(res);

			expectPagination(json, { total: 2, page: 1, limit: 10, length: 2 });
		});

		test("検索クエリでフィルタリングできる", async () => {
			const circle1 = createTestCircle({
				name: "Sound Horizon",
				nameInitial: "S",
			});
			const circle2 = createTestCircle({ name: "IOSYS", nameInitial: "I" });
			await testDb.insert(circles).values([circle1, circle2]);

			const res = await app.request("/?search=IOSYS");
			const json = await expectSuccess<PaginatedResponse<CircleResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("IOSYS");
		});

		test("頭文字でフィルタリングできる", async () => {
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
			const json = await expectSuccess<PaginatedResponse<CircleResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("あ行サークル");
		});

		test("ソート順を指定できる", async () => {
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
			const json = await expectSuccess<PaginatedResponse<CircleResponse>>(res);

			expect(json.data[0]?.name).toBe("Gamma Circle");
			expect(json.data[1]?.name).toBe("Beta Circle");
			expect(json.data[2]?.name).toBe("Alpha Circle");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するサークルを返す", async () => {
			const circle = createTestCircle({ name: "Test Circle" });
			await testDb.insert(circles).values(circle);

			const res = await app.request(`/${circle.id}`);
			const json = await expectSuccess<CircleResponse>(res);

			expect(json.id).toBe(circle.id);
			expect(json.name).toBe("Test Circle");
			expect(json.links).toBeDefined();
		});

		test("存在しないサークルは404を返す", async () => {
			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいサークルを作成できる", async () => {
			const circle = createTestCircle();
			const res = await app.request("/", postJson(circle));

			const json = await expectCreated<CircleResponse>(res);
			expect(json.id).toBe(circle.id);
			expect(json.name).toBe(circle.name);
		});

		test("latin/hiragana/katakanaの場合はnameInitialが必須", async () => {
			const circle = createTestCircle({
				nameInitial: null,
				initialScript: "latin",
			});
			const res = await app.request("/", postJson(circle));

			await expectBadRequest(res);
		});

		test("必須フィールドが欠けている場合は400を返す", async () => {
			const res = await app.request("/", postJson({ name: "Test" }));
			await expectBadRequest(res);
		});

		test("重複するIDは409を返す", async () => {
			const circle = createTestCircle();
			await testDb.insert(circles).values(circle);

			const duplicateCircle = createTestCircle({
				id: circle.id,
				name: "Different Name",
			});
			const res = await app.request("/", postJson(duplicateCircle));

			const json = await expectConflict(res);
			expect(json.error).toContain("ID");
		});

		test("重複する名前は409を返す", async () => {
			const circle = createTestCircle({ name: "Sound Horizon" });
			await testDb.insert(circles).values(circle);

			const duplicateCircle = createTestCircle({ name: "Sound Horizon" });
			const res = await app.request("/", postJson(duplicateCircle));

			await expectConflict(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("サークルを更新できる", async () => {
			const circle = createTestCircle({ name: "Original Circle" });
			await testDb.insert(circles).values(circle);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${circle.id}`);
			const existingCircle = await expectSuccess<CircleResponse>(getRes);

			const res = await app.request(
				`/${circle.id}`,
				putJson({
					name: "Updated Circle",
					updatedAt: existingCircle.updatedAt,
				}),
			);

			const json = await expectSuccess<CircleResponse>(res);
			expect(json.name).toBe("Updated Circle");
		});

		test("存在しないサークルは404を返す", async () => {
			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("他のサークルと重複する名前は409を返す", async () => {
			const circle1 = createTestCircle({ name: "Circle One" });
			const circle2 = createTestCircle({ name: "Circle Two" });
			await testDb.insert(circles).values([circle1, circle2]);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${circle2.id}`);
			const existingCircle = await expectSuccess<CircleResponse>(getRes);

			const res = await app.request(
				`/${circle2.id}`,
				putJson({
					name: "Circle One",
					updatedAt: existingCircle.updatedAt,
				}),
			);

			await expectConflict(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const circle = createTestCircle({ name: "Original Circle" });
			await testDb.insert(circles).values(circle);

			const res = await app.request(
				`/${circle.id}`,
				putJson({
					name: "Updated Circle",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			const json = await expectConflict(res);
			expect(json.error).toContain("更新");
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("サークルを削除できる", async () => {
			const circle = createTestCircle();
			await testDb.insert(circles).values(circle);

			const res = await app.request(`/${circle.id}`, deleteRequest());
			const json = await expectSuccess<DeleteResponse>(res);

			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${circle.id}`);
			await expectNotFound(getRes);
		});

		test("存在しないサークルは404を返す", async () => {
			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(circlesRouter, { user: null });
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(circlesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			await expectForbidden(res);
		});
	});
});
