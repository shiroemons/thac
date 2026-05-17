/**
 * User Album Requests API 統合テスト
 *
 * @description
 * ユーザー向けアルバム申請API（POST /api/user/album-requests, GET /api/user/album-requests）の
 * 認証、バリデーション、DB永続化をテスト
 */

import type { PGlite } from "@electric-sql/pglite";
import {
	__resetDatabase,
	__setTestDatabase,
	albumRequests,
	db,
	releases,
	user,
} from "@thac/db";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { albumRequestsUserRouter } from "../../../src/routes/user/album-requests";
import {
	createTestAlbumRequest,
	createTestRelease,
	createTestUser,
} from "../../helpers/fixtures";
import { createTestUserApp } from "../../helpers/test-app";
import { defaultTestUser } from "../../helpers/test-auth";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	expectBadRequest,
	expectCreated,
	expectSuccess,
	expectUnauthorized,
	postJson,
} from "../../helpers/test-response";

// レスポンスの型定義
interface AlbumRequestResponse {
	id: string;
	requestType: string;
	albumName: string | null;
	circleName: string | null;
	referenceUrls: Array<{ url: string; label?: string }>;
	notes: string | null;
	status: string;
	reviewerNotes: string | null;
	reviewedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

interface AlbumRequestListResponse {
	items: AlbumRequestResponse[];
}

describe("User Album Requests API", () => {
	let client: PGlite;
	let app: ReturnType<typeof createTestUserApp>;

	beforeAll(async () => {
		const testDb = await createTestDatabase();
		client = testDb.client;
		__setTestDatabase(testDb.db);
		app = createTestUserApp(albumRequestsUserRouter);
	});

	beforeEach(async () => {
		await truncateAllTables(client);
	});

	afterAll(async () => {
		__resetDatabase();
		await client.close();
	});

	describe("POST / - アルバム申請作成", () => {
		test("未ログイン → 401を返す", async () => {
			const unauthApp = createTestUserApp(albumRequestsUserRouter, {
				user: null,
			});
			const res = await unauthApp.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "テストアルバム",
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);
			await expectUnauthorized(res);
		});

		test("新規リクエスト → 201 + DBにstatus=pendingで1行INSERT", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "新規テストアルバム",
					circleName: "テストサークル",
					referenceUrls: [
						{ url: "https://example.com/album", label: "公式サイト" },
					],
					notes: "テスト補足",
				}),
			);

			const json = await expectCreated<AlbumRequestResponse>(res);
			expect(json.requestType).toBe("new");
			expect(json.albumName).toBe("新規テストアルバム");
			expect(json.status).toBe("pending");

			// DBに1行あることを確認
			const rows = await db.select().from(albumRequests);
			expect(rows).toHaveLength(1);
			expect(rows[0].status).toBe("pending");
			expect(rows[0].userId).toBe(defaultTestUser.id);
		});

		test("既存アルバムへの追記リクエスト → 201", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));
			const release = createTestRelease({ id: "rel_test_existing_001" });
			await db.insert(releases).values(release);

			const res = await app.request(
				"/",
				postJson({
					requestType: "existing",
					existingReleaseId: "rel_test_existing_001",
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);

			const json = await expectCreated<AlbumRequestResponse>(res);
			expect(json.requestType).toBe("existing");
			expect(json.status).toBe("pending");
		});

		test("existing なのに existingReleaseId 未指定 → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "existing",
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);

			await expectBadRequest(res);
		});

		test("existing なのに existingReleaseId が DB に存在しない → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "existing",
					existingReleaseId: "rel_nonexistent_999",
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toContain("見つかりません");
		});

		test("referenceUrls 空配列 → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "テストアルバム",
					referenceUrls: [],
				}),
			);

			await expectBadRequest(res);
		});

		test("referenceUrls の URL が mailto: スキーム → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "テストアルバム",
					referenceUrls: [{ url: "mailto:test@example.com" }],
				}),
			);

			await expectBadRequest(res);
		});

		test("referenceUrls の URL が ftp:// スキーム → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "テストアルバム",
					referenceUrls: [{ url: "ftp://example.com/file" }],
				}),
			);

			await expectBadRequest(res);
		});

		test("referenceUrls が11件 → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const urls = Array.from({ length: 11 }, (_, i) => ({
				url: `https://example.com/${i + 1}`,
			}));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: "テストアルバム",
					referenceUrls: urls,
				}),
			);

			await expectBadRequest(res);
		});

		test("new なのに albumName 未指定 → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);

			await expectBadRequest(res);
		});

		test("albumName が 201 文字 → 400", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			const longName = "あ".repeat(201);

			const res = await app.request(
				"/",
				postJson({
					requestType: "new",
					albumName: longName,
					referenceUrls: [{ url: "https://example.com" }],
				}),
			);

			await expectBadRequest(res);
		});
	});

	describe("GET / - 自分のアルバム申請一覧取得", () => {
		test("未ログイン → 401を返す", async () => {
			const unauthApp = createTestUserApp(albumRequestsUserRouter, {
				user: null,
			});
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("ログイン済み → 自分の申請のみ返却（他ユーザーの申請が混ざらない）", async () => {
			// 自分のユーザーを作成
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			// 他のユーザーを作成
			const otherUser = createTestUser({ id: "user_other_001" });
			await db.insert(user).values(otherUser);

			// 自分の申請を2件作成
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_mine_001",
					userId: defaultTestUser.id,
					albumName: "自分のアルバム1",
				}),
			);
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_mine_002",
					userId: defaultTestUser.id,
					albumName: "自分のアルバム2",
				}),
			);

			// 他のユーザーの申請を1件作成
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_other_001",
					userId: otherUser.id,
					albumName: "他ユーザーのアルバム",
				}),
			);

			const res = await app.request("/");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			// 自分の2件のみが返る（他ユーザーのものは含まれない）
			expect(json.items).toHaveLength(2);
			const ids = json.items.map((item) => item.id);
			expect(ids).toContain("aq_mine_001");
			expect(ids).toContain("aq_mine_002");
			expect(ids).not.toContain("aq_other_001");
		});

		test("新着順（createdAt desc）で並ぶ", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));

			// 古い方を先に作成
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_old_001",
					userId: defaultTestUser.id,
					albumName: "古いアルバム",
				}),
			);
			// 少し待って新しい方を作成（createdAt が異なることを保証）
			await new Promise((resolve) => setTimeout(resolve, 10));
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_new_001",
					userId: defaultTestUser.id,
					albumName: "新しいアルバム",
				}),
			);

			const res = await app.request("/");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			expect(json.items).toHaveLength(2);
			// 新着順なので新しい方が先
			expect(json.items[0].id).toBe("aq_new_001");
			expect(json.items[1].id).toBe("aq_old_001");
		});

		test("existingRelease が JOIN された形で返る（existingReleaseId がある場合）", async () => {
			await db.insert(user).values(createTestUser({ id: defaultTestUser.id }));
			const release = createTestRelease({ id: "rel_test_join_001" });
			await db.insert(releases).values(release);

			// existing タイプの申請を作成
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_existing_001",
					userId: defaultTestUser.id,
					requestType: "existing",
					existingReleaseId: "rel_test_join_001",
					albumName: null,
				}),
			);

			// new タイプ（existingRelease が null になる）
			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_new_001",
					userId: defaultTestUser.id,
					requestType: "new",
					albumName: "新規アルバム",
				}),
			);

			const res = await app.request("/");
			const json = await expectSuccess<{
				items: Array<
					AlbumRequestResponse & {
						existingRelease: { id: string; name: string } | null;
					}
				>;
			}>(res);

			// existing タイプの申請の existingRelease が JOIN されている
			const existingItem = json.items.find((i) => i.id === "aq_existing_001");
			expect(existingItem?.existingRelease).not.toBeNull();
			expect(existingItem?.existingRelease?.id).toBe("rel_test_join_001");

			// new タイプの申請の existingRelease は null
			const newItem = json.items.find((i) => i.id === "aq_new_001");
			expect(newItem?.existingRelease).toBeNull();
		});
	});
});
