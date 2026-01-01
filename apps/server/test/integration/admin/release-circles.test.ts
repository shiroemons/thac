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
	circles,
	db,
	releaseCircles,
	releases,
} from "@thac/db";
import { releaseCirclesRouter } from "../../../src/routes/admin/releases/release-circles";
import { createTestCircle, createTestRelease } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface ReleaseCircleResponse {
	releaseId: string;
	circleId: string;
	participationType: string;
	position: number;
	circle?: {
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
	};
}

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
}

describe("Admin Release Circles API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(releaseCirclesRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:releaseId/circles - 作品の関連サークル一覧取得", () => {
		test("存在しないリリースは404を返す", async () => {
			const res = await app.request("/rel_nonexistent/circles");
			expect(res.status).toBe(404);
		});

		test("関連サークルがない場合は空配列を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseCircleResponse[];
			expect(json).toEqual([]);
		});

		test("関連サークルをサークル情報付きで返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(circles)
				.values(createTestCircle({ id: "ci_test_001", name: "Test Circle" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request("/rel_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseCircleResponse[];
			expect(json).toHaveLength(1);
			expect(json[0]?.circleId).toBe("ci_test_001");
			expect(json[0]?.participationType).toBe("host");
			expect(json[0]?.circle?.name).toBe("Test Circle");
		});

		test("position順にソートして返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(circles)
				.values([
					createTestCircle({ id: "ci_test_001", name: "Circle A" }),
					createTestCircle({ id: "ci_test_002", name: "Circle B" }),
					createTestCircle({ id: "ci_test_003", name: "Circle C" }),
				]);
			await db.insert(releaseCircles).values([
				{
					releaseId: "rel_test_001",
					circleId: "ci_test_002",
					participationType: "host",
					position: 2,
				},
				{
					releaseId: "rel_test_001",
					circleId: "ci_test_001",
					participationType: "host",
					position: 1,
				},
				{
					releaseId: "rel_test_001",
					circleId: "ci_test_003",
					participationType: "host",
					position: 3,
				},
			]);

			const res = await app.request("/rel_test_001/circles");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseCircleResponse[];
			expect(json[0]?.circle?.name).toBe("Circle A");
			expect(json[1]?.circle?.name).toBe("Circle B");
			expect(json[2]?.circle?.name).toBe("Circle C");
		});
	});

	describe("POST /:releaseId/circles - サークル関連付け追加", () => {
		test("存在しないリリースは404を返す", async () => {
			const res = await app.request("/rel_nonexistent/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "host",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("存在しないサークルは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_nonexistent",
					participationType: "host",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しい関連付けを作成できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "host",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as ReleaseCircleResponse;
			expect(json.releaseId).toBe("rel_test_001");
			expect(json.circleId).toBe("ci_test_001");
			expect(json.participationType).toBe("host");
		});

		test("positionが自動設定される", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(circles)
				.values([
					createTestCircle({ id: "ci_test_001" }),
					createTestCircle({ id: "ci_test_002" }),
				]);

			// 1つ目を追加
			await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "host",
				}),
			});

			// 2つ目を追加（position自動設定）
			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_002",
					participationType: "guest",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as ReleaseCircleResponse;
			expect(json.position).toBeGreaterThan(0);
		});

		test("同一リリース・サークル・参加形態の重複は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "host",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("同じサークルでも異なる参加形態は追加可能", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "guest",
				}),
			});

			expect(res.status).toBe(201);
		});

		test("無効な参加形態は400を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await app.request("/rel_test_001/circles", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					circleId: "ci_test_001",
					participationType: "invalid_type",
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("PATCH /:releaseId/circles/:circleId - 関連付け更新", () => {
		test("participationTypeクエリパラメータがない場合は400を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request("/rel_test_001/circles/ci_test_001", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ position: 2 }),
			});

			expect(res.status).toBe(400);
		});

		test("存在しない関連付けは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await app.request(
				"/rel_test_001/circles/ci_test_001?participationType=host",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ position: 2 }),
				},
			);

			expect(res.status).toBe(404);
		});

		test("positionを更新できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request(
				"/rel_test_001/circles/ci_test_001?participationType=host",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ position: 5 }),
				},
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as ReleaseCircleResponse;
			expect(json.position).toBe(5);
		});
	});

	describe("DELETE /:releaseId/circles/:circleId - 関連付け解除", () => {
		test("participationTypeクエリパラメータがない場合は400を返す", async () => {
			const res = await app.request("/rel_test_001/circles/ci_test_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(400);
		});

		test("存在しない関連付けは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));

			const res = await app.request(
				"/rel_test_001/circles/ci_test_001?participationType=host",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(404);
		});

		test("関連付けを削除できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(circles).values(createTestCircle({ id: "ci_test_001" }));
			await db.insert(releaseCircles).values({
				releaseId: "rel_test_001",
				circleId: "ci_test_001",
				participationType: "host",
				position: 1,
			});

			const res = await app.request(
				"/rel_test_001/circles/ci_test_001?participationType=host",
				{
					method: "DELETE",
				},
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const checkRes = await app.request("/rel_test_001/circles");
			const remainingCircles =
				(await checkRes.json()) as ReleaseCircleResponse[];
			expect(remainingCircles).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(releaseCirclesRouter, {
				user: null,
			});
			const res = await unauthApp.request("/rel_test_001/circles");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(releaseCirclesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/rel_test_001/circles");
			expect(res.status).toBe(403);
		});
	});
});
