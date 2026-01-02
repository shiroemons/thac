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
	releaseJanCodes,
	releases,
} from "@thac/db";
import { releaseJanCodesRouter } from "../../../src/routes/admin/releases/jan-codes";
import { createTestRelease } from "../../helpers/fixtures";
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
interface JanCodeResponse {
	id: string;
	releaseId: string;
	janCode: string;
	isPrimary: boolean;
}

describe("Admin JAN Codes API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(releaseJanCodesRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:releaseId/jan-codes - JANコード一覧取得", () => {
		test("存在しないリリースは404を返す", async () => {
			const res = await app.request("/rel_nonexistent/jan-codes");
			await expectNotFound(res);
		});

		test("JANコードがない場合は空配列を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/jan-codes");
			const json = await expectSuccess<JanCodeResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("JANコード一覧を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values([
				{
					id: "jan_001",
					releaseId: "rel_test_001",
					janCode: "4988001234567",
					isPrimary: true,
				},
				{
					id: "jan_002",
					releaseId: "rel_test_001",
					janCode: "4988009876543",
					isPrimary: false,
				},
			]);

			const res = await app.request("/rel_test_001/jan-codes");
			const json = await expectSuccess<JanCodeResponse[]>(res);
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:releaseId/jan-codes - JANコード追加", () => {
		test("存在しないリリースは404を返す", async () => {
			const res = await app.request(
				"/rel_nonexistent/jan-codes",
				postJson({
					id: "jan_001",
					janCode: "4988001234567",
					isPrimary: true,
				}),
			);
			await expectNotFound(res);
		});

		test("新しいJANコードを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/jan-codes",
				postJson({
					id: "jan_001",
					janCode: "4988001234567",
					isPrimary: true,
				}),
			);

			const json = await expectCreated<JanCodeResponse>(res);
			expect(json.id).toBe("jan_001");
			expect(json.janCode).toBe("4988001234567");
			expect(json.isPrimary).toBe(true);
		});

		test("ID重複は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: true,
			});

			const res = await app.request(
				"/rel_test_001/jan-codes",
				postJson({
					id: "jan_001",
					janCode: "4988009999999",
					isPrimary: false,
				}),
			);

			await expectConflict(res);
		});

		test("JANコードのグローバル重複は409を返す", async () => {
			await db
				.insert(releases)
				.values([
					createTestRelease({ id: "rel_test_001" }),
					createTestRelease({ id: "rel_test_002" }),
				]);
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: true,
			});

			// 異なるリリースで同じJANコードを追加しようとする
			const res = await app.request(
				"/rel_test_002/jan-codes",
				postJson({
					id: "jan_002",
					janCode: "4988001234567",
					isPrimary: true,
				}),
			);

			await expectConflict(res);
		});

		test("同一リリース内で複数のprimaryは409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: true,
			});

			const res = await app.request(
				"/rel_test_001/jan-codes",
				postJson({
					id: "jan_002",
					janCode: "4988009876543",
					isPrimary: true,
				}),
			);

			await expectConflict(res);
		});

		test("同一リリース内で非primaryは複数追加可能", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: false,
			});

			const res = await app.request(
				"/rel_test_001/jan-codes",
				postJson({
					id: "jan_002",
					janCode: "4988009876543",
					isPrimary: false,
				}),
			);

			await expectCreated<JanCodeResponse>(res);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/jan-codes",
				postJson({
					// id missing
					janCode: "4988001234567",
					isPrimary: true,
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:releaseId/jan-codes/:id - JANコード更新", () => {
		test("存在しないJANコードは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/jan-codes/jan_nonexistent",
				putJson({ isPrimary: false }),
			);

			await expectNotFound(res);
		});

		test("isPrimaryを更新できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: false,
			});

			const res = await app.request(
				"/rel_test_001/jan-codes/jan_001",
				putJson({ isPrimary: true }),
			);

			const json = await expectSuccess<JanCodeResponse>(res);
			expect(json.isPrimary).toBe(true);
		});

		test("他にprimaryがある場合はprimaryへの変更は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values([
				{
					id: "jan_001",
					releaseId: "rel_test_001",
					janCode: "4988001234567",
					isPrimary: true,
				},
				{
					id: "jan_002",
					releaseId: "rel_test_001",
					janCode: "4988009876543",
					isPrimary: false,
				},
			]);

			const res = await app.request(
				"/rel_test_001/jan-codes/jan_002",
				putJson({ isPrimary: true }),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:releaseId/jan-codes/:id - JANコード削除", () => {
		test("存在しないJANコードは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/jan-codes/jan_nonexistent",
				deleteRequest(),
			);

			await expectNotFound(res);
		});

		test("JANコードを削除できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(releaseJanCodes).values({
				id: "jan_001",
				releaseId: "rel_test_001",
				janCode: "4988001234567",
				isPrimary: true,
			});

			const res = await app.request(
				"/rel_test_001/jan-codes/jan_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
			expect(json.id).toBe("jan_001");

			// 削除されたことを確認
			const checkRes = await app.request("/rel_test_001/jan-codes");
			const codes = await expectSuccess<JanCodeResponse[]>(checkRes);
			expect(codes).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(releaseJanCodesRouter, {
				user: null,
			});
			const res = await unauthApp.request("/rel_test_001/jan-codes");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(releaseJanCodesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/rel_test_001/jan-codes");
			await expectForbidden(res);
		});
	});
});
