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
	releases,
	trackDerivations,
	tracks,
} from "@thac/db";
import { trackDerivationsRouter } from "../../../src/routes/admin/tracks/derivations";
import { createTestRelease, createTestTrack } from "../../helpers/fixtures";
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
} from "../../helpers/test-response";

// レスポンスの型定義
interface DerivationResponse {
	id: string;
	childTrackId: string;
	parentTrackId: string;
	notes: string | null;
	parentTrack?: {
		id: string;
		name: string;
		releaseName?: string | null;
	} | null;
}

describe("Admin Track Derivations API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackDerivationsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:trackId/derivations - 派生関係一覧取得", () => {
		test("存在しないトラックは404を返す", async () => {
			const res = await app.request("/tr_nonexistent/derivations");
			await expectNotFound(res);
		});

		test("派生関係がない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/derivations");
			const json = await expectSuccess<DerivationResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("派生関係を親トラック情報付きで返す", async () => {
			await db
				.insert(releases)
				.values(
					createTestRelease({ id: "rel_test_001", name: "Parent Release" }),
				);
			await db.insert(tracks).values([
				createTestTrack({
					id: "tr_parent",
					releaseId: "rel_test_001",
					name: "Parent Track",
				}),
				createTestTrack({ id: "tr_child", name: "Child Track" }),
			]);
			await db.insert(trackDerivations).values({
				id: "deriv_001",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});

			const res = await app.request("/tr_child/derivations");
			const json = await expectSuccess<DerivationResponse[]>(res);
			expect(json).toHaveLength(1);
			expect(json[0]?.parentTrackId).toBe("tr_parent");
			expect(json[0]?.parentTrack?.name).toBe("Parent Track");
			expect(json[0]?.parentTrack?.releaseName).toBe("Parent Release");
		});

		test("複数の派生元を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent_1", name: "Parent 1" }),
					createTestTrack({ id: "tr_parent_2", name: "Parent 2" }),
					createTestTrack({ id: "tr_child", name: "Child Track" }),
				]);
			await db.insert(trackDerivations).values([
				{
					id: "deriv_001",
					childTrackId: "tr_child",
					parentTrackId: "tr_parent_1",
				},
				{
					id: "deriv_002",
					childTrackId: "tr_child",
					parentTrackId: "tr_parent_2",
				},
			]);

			const res = await app.request("/tr_child/derivations");
			const json = await expectSuccess<DerivationResponse[]>(res);
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:trackId/derivations - 派生関係追加", () => {
		test("存在しないトラック（子）は404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_parent" }));

			const res = await app.request(
				"/tr_nonexistent/derivations",
				postJson({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			);
			await expectNotFound(res);
		});

		test("存在しない親トラックは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_child" }));

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					id: "deriv_001",
					parentTrackId: "tr_nonexistent",
				}),
			);
			await expectNotFound(res);
		});

		test("新しい派生関係を追加できる", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent", name: "Parent" }),
					createTestTrack({ id: "tr_child", name: "Child" }),
				]);

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			);

			const json = await expectCreated<DerivationResponse>(res);
			expect(json.id).toBe("deriv_001");
			expect(json.childTrackId).toBe("tr_child");
			expect(json.parentTrackId).toBe("tr_parent");
		});

		test("メモ付きで派生関係を追加できる", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent" }),
					createTestTrack({ id: "tr_child" }),
				]);

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					id: "deriv_001",
					parentTrackId: "tr_parent",
					notes: "アレンジバージョン",
				}),
			);

			const json = await expectCreated<DerivationResponse>(res);
			expect(json.notes).toBe("アレンジバージョン");
		});

		test("ID重複は409を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent" }),
					createTestTrack({ id: "tr_child" }),
				]);
			await db.insert(trackDerivations).values({
				id: "deriv_001",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			);

			await expectConflict(res);
		});

		test("同一子・親の重複は409を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent" }),
					createTestTrack({ id: "tr_child" }),
				]);
			await db.insert(trackDerivations).values({
				id: "deriv_001",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					id: "deriv_002",
					parentTrackId: "tr_parent",
				}),
			);

			await expectConflict(res);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_child" }),
					createTestTrack({ id: "tr_parent" }),
				]);

			const res = await app.request(
				"/tr_child/derivations",
				postJson({
					// id missing
					parentTrackId: "tr_parent",
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toBeDefined();
		});
	});

	describe("DELETE /:trackId/derivations/:id - 派生関係削除", () => {
		test("存在しない派生関係は404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_child" }));

			const res = await app.request(
				"/tr_child/derivations/deriv_nonexistent",
				deleteRequest(),
			);
			await expectNotFound(res);
		});

		test("派生関係を削除できる", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent" }),
					createTestTrack({ id: "tr_child" }),
				]);
			await db.insert(trackDerivations).values({
				id: "deriv_001",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});

			const res = await app.request(
				"/tr_child/derivations/deriv_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
			expect(json.id).toBe("deriv_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_child/derivations");
			const derivations = await expectSuccess<DerivationResponse[]>(checkRes);
			expect(derivations).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackDerivationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/tr_test_001/derivations");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackDerivationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/derivations");
			await expectForbidden(res);
		});
	});
});
