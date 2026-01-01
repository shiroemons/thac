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
	creditRoles,
	db,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { trackCreditRolesRouter } from "../../../src/routes/admin/releases/track-credit-roles";
import {
	createTestArtist,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface CreditRoleResponse {
	trackCreditId: string;
	roleCode: string;
	rolePosition: number;
	role?: {
		code: string;
		label: string;
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

describe("Admin Track Credit Roles API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackCreditRolesRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	// テストデータ作成ヘルパー
	async function setupTestData() {
		await db.insert(releases).values(createTestRelease({ id: "rel_test_001" }));
		await db
			.insert(tracks)
			.values(
				createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
			);
		await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
		await db.insert(creditRoles).values([
			{ code: "composer", label: "Composer", sortOrder: 1 },
			{ code: "arranger", label: "Arranger", sortOrder: 2 },
			{ code: "lyricist", label: "Lyricist", sortOrder: 3 },
		]);
		await db.insert(trackCredits).values({
			id: "tc_001",
			trackId: "tr_test_001",
			artistId: "ar_test_001",
			creditName: "Test Artist",
		});
	}

	describe("POST /:releaseId/tracks/:trackId/credits/:creditId/roles - 役割追加", () => {
		test("存在しないクレジットは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(creditRoles).values({
				code: "composer",
				label: "Composer",
				sortOrder: 1,
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_nonexistent/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "composer",
						rolePosition: 1,
					}),
				},
			);
			expect(res.status).toBe(404);
		});

		test("存在しない役割マスターは400を返す", async () => {
			await setupTestData();

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "nonexistent_role",
						rolePosition: 1,
					}),
				},
			);
			expect(res.status).toBe(400);
		});

		test("新しい役割を追加できる", async () => {
			await setupTestData();

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "composer",
						rolePosition: 1,
					}),
				},
			);

			expect(res.status).toBe(201);
			const json = (await res.json()) as CreditRoleResponse;
			expect(json.roleCode).toBe("composer");
			expect(json.rolePosition).toBe(1);
			expect(json.role?.label).toBe("Composer");
		});

		test("複数の役割を追加できる", async () => {
			await setupTestData();

			// 1つ目の役割
			await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "composer",
						rolePosition: 1,
					}),
				},
			);

			// 2つ目の役割
			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "arranger",
						rolePosition: 2,
					}),
				},
			);

			expect(res.status).toBe(201);
			const json = (await res.json()) as CreditRoleResponse;
			expect(json.roleCode).toBe("arranger");
		});

		test("同一クレジット・役割・順序の重複は409を返す", async () => {
			await setupTestData();
			await db.insert(trackCreditRoles).values({
				trackCreditId: "tc_001",
				roleCode: "composer",
				rolePosition: 1,
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "composer",
						rolePosition: 1,
					}),
				},
			);

			expect(res.status).toBe(409);
		});

		test("同じ役割でも異なる順序は追加可能", async () => {
			await setupTestData();
			await db.insert(trackCreditRoles).values({
				trackCreditId: "tc_001",
				roleCode: "composer",
				rolePosition: 1,
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roleCode: "composer",
						rolePosition: 2,
					}),
				},
			);

			expect(res.status).toBe(201);
		});

		test("バリデーションエラーは400を返す", async () => {
			await setupTestData();

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						// roleCode missing
						rolePosition: 1,
					}),
				},
			);

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("DELETE /:releaseId/tracks/:trackId/credits/:creditId/roles/:roleCode/:rolePosition - 役割削除", () => {
		test("存在しないクレジットは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_nonexistent/roles/composer/1",
				{
					method: "DELETE",
				},
			);
			expect(res.status).toBe(404);
		});

		test("存在しない役割は404を返す", async () => {
			await setupTestData();

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles/composer/1",
				{
					method: "DELETE",
				},
			);
			expect(res.status).toBe(404);
		});

		test("役割を削除できる", async () => {
			await setupTestData();
			await db.insert(trackCreditRoles).values({
				trackCreditId: "tc_001",
				roleCode: "composer",
				rolePosition: 1,
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles/composer/1",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("composer");
		});

		test("不正なrolePositionは400を返す", async () => {
			await setupTestData();

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles/composer/invalid",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(400);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackCreditRolesRouter, {
				user: null,
			});
			const res = await unauthApp.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ roleCode: "composer", rolePosition: 1 }),
				},
			);
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackCreditRolesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001/roles",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ roleCode: "composer", rolePosition: 1 }),
				},
			);
			expect(res.status).toBe(403);
		});
	});
});
