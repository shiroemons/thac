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

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
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
			expect(res.status).toBe(404);
		});

		test("派生関係がない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/derivations");
			expect(res.status).toBe(200);

			const json = (await res.json()) as DerivationResponse[];
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as DerivationResponse[];
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as DerivationResponse[];
			expect(json).toHaveLength(2);
		});
	});

	describe("POST /:trackId/derivations - 派生関係追加", () => {
		test("存在しないトラック（子）は404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_parent" }));

			const res = await app.request("/tr_nonexistent/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("存在しない親トラックは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_child" }));

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_001",
					parentTrackId: "tr_nonexistent",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しい派生関係を追加できる", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_parent", name: "Parent" }),
					createTestTrack({ id: "tr_child", name: "Child" }),
				]);

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as DerivationResponse;
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

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_001",
					parentTrackId: "tr_parent",
					notes: "アレンジバージョン",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as DerivationResponse;
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

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_001",
					parentTrackId: "tr_parent",
				}),
			});

			expect(res.status).toBe(409);
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

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "deriv_002",
					parentTrackId: "tr_parent",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db
				.insert(tracks)
				.values([
					createTestTrack({ id: "tr_child" }),
					createTestTrack({ id: "tr_parent" }),
				]);

			const res = await app.request("/tr_child/derivations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					// id missing
					parentTrackId: "tr_parent",
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("DELETE /:trackId/derivations/:id - 派生関係削除", () => {
		test("存在しない派生関係は404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_child" }));

			const res = await app.request("/tr_child/derivations/deriv_nonexistent", {
				method: "DELETE",
			});
			expect(res.status).toBe(404);
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

			const res = await app.request("/tr_child/derivations/deriv_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("deriv_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_child/derivations");
			const derivations = (await checkRes.json()) as DerivationResponse[];
			expect(derivations).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackDerivationsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/tr_test_001/derivations");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackDerivationsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/derivations");
			expect(res.status).toBe(403);
		});
	});
});
