/**
 * Admin Album Requests API 統合テスト
 *
 * @description
 * 管理者向けアルバム申請API（GET/PATCH）の認証、フィルタ、ページネーション、
 * 楽観的ロック、ステータス遷移をテスト
 */

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import type { PGlite } from "@electric-sql/pglite";
import {
	__resetDatabase,
	__setTestDatabase,
	albumRequests,
	db,
	releases,
	user,
} from "@thac/db";
import { albumRequestsAdminRouter } from "../../../src/routes/admin/album-requests/album-requests";
import {
	createTestAdminUser,
	createTestAlbumRequest,
	createTestRelease,
	createTestUser,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { defaultTestAdmin } from "../../helpers/test-auth";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	expectBadRequest,
	expectConflict,
	expectForbidden,
	expectNotFound,
	expectSuccess,
	expectUnauthorized,
	type PaginatedResponse,
	patchJson,
} from "../../helpers/test-response";

// レスポンスの型定義
interface AlbumRequestItem {
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
	submittedBy: { id: string; name: string; email: string } | null;
	existingRelease: {
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
	} | null;
}

interface AlbumRequestDetail extends AlbumRequestItem {
	reviewer: { id: string; name: string; email: string } | null;
}

interface AlbumRequestListResponse {
	data: AlbumRequestItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

interface PendingCountResponse {
	count: number;
}

describe("Admin Album Requests API", () => {
	let client: PGlite;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(async () => {
		const testDb = await createTestDatabase();
		client = testDb.client;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(albumRequestsAdminRouter);
	});

	beforeEach(async () => {
		await truncateAllTables(client);
	});

	afterAll(async () => {
		__resetDatabase();
		await client.close();
	});

	// テストデータ作成ヘルパー
	async function setupBaseUser() {
		const testUser = createTestUser({ id: "user_submitter_001" });
		await db.insert(user).values(testUser);
		return testUser;
	}

	async function setupAdminUser() {
		const adminUser = createTestAdminUser({ id: defaultTestAdmin.id });
		await db.insert(user).values(adminUser);
		return adminUser;
	}

	describe("GET / - アルバム申請一覧取得", () => {
		test("未認証 → 401を返す", async () => {
			const unauthApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: null,
			});
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("一般ユーザー → 403を返す", async () => {
			const nonAdminApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			await expectForbidden(res);
		});

		test("管理者: 全件取得（pagination 構造を持つ）", async () => {
			const submitter = await setupBaseUser();
			await db.insert(albumRequests).values([
				createTestAlbumRequest({
					id: "aq_001",
					userId: submitter.id,
					albumName: "アルバム1",
				}),
				createTestAlbumRequest({
					id: "aq_002",
					userId: submitter.id,
					albumName: "アルバム2",
				}),
			]);

			const res = await app.request("/");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			expect(json.data).toHaveLength(2);
			expect(json.pagination.total).toBe(2);
			expect(json.pagination.page).toBe(1);
			expect(json.pagination.totalPages).toBe(1);
		});

		test("status=pending フィルタ", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();

			await db.insert(albumRequests).values([
				createTestAlbumRequest({
					id: "aq_pending_001",
					userId: submitter.id,
					status: "pending",
				}),
				createTestAlbumRequest({
					id: "aq_approved_001",
					userId: submitter.id,
					status: "approved",
					reviewedByUserId: adminUser.id,
					reviewedAt: new Date(),
				}),
			]);

			const res = await app.request("/?status=pending");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0].id).toBe("aq_pending_001");
			expect(json.pagination.total).toBe(1);
		});

		test("status=approved フィルタ", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();

			await db.insert(albumRequests).values([
				createTestAlbumRequest({
					id: "aq_pending_001",
					userId: submitter.id,
					status: "pending",
				}),
				createTestAlbumRequest({
					id: "aq_approved_001",
					userId: submitter.id,
					status: "approved",
					reviewedByUserId: adminUser.id,
					reviewedAt: new Date(),
				}),
			]);

			const res = await app.request("/?status=approved");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0].id).toBe("aq_approved_001");
		});

		test("ページネーション: page=2, limit=2", async () => {
			const submitter = await setupBaseUser();

			// 5件作成
			await db.insert(albumRequests).values([
				createTestAlbumRequest({
					id: "aq_001",
					userId: submitter.id,
					albumName: "アルバム1",
				}),
				createTestAlbumRequest({
					id: "aq_002",
					userId: submitter.id,
					albumName: "アルバム2",
				}),
				createTestAlbumRequest({
					id: "aq_003",
					userId: submitter.id,
					albumName: "アルバム3",
				}),
				createTestAlbumRequest({
					id: "aq_004",
					userId: submitter.id,
					albumName: "アルバム4",
				}),
				createTestAlbumRequest({
					id: "aq_005",
					userId: submitter.id,
					albumName: "アルバム5",
				}),
			]);

			const res = await app.request("/?page=2&limit=2");
			const json = await expectSuccess<AlbumRequestListResponse>(res);

			expect(json.data).toHaveLength(2);
			expect(json.pagination.total).toBe(5);
			expect(json.pagination.page).toBe(2);
			expect(json.pagination.limit).toBe(2);
			expect(json.pagination.totalPages).toBe(3);
		});
	});

	describe("GET /pending-count - pending 件数取得", () => {
		test("未認証 → 401を返す", async () => {
			const unauthApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: null,
			});
			const res = await unauthApp.request("/pending-count");
			await expectUnauthorized(res);
		});

		test("管理者: pending 件数を返す", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();

			await db.insert(albumRequests).values([
				createTestAlbumRequest({
					id: "aq_pending_001",
					userId: submitter.id,
					status: "pending",
				}),
				createTestAlbumRequest({
					id: "aq_pending_002",
					userId: submitter.id,
					status: "pending",
				}),
				createTestAlbumRequest({
					id: "aq_approved_001",
					userId: submitter.id,
					status: "approved",
					reviewedByUserId: adminUser.id,
					reviewedAt: new Date(),
				}),
			]);

			const res = await app.request("/pending-count");
			const json = await expectSuccess<PendingCountResponse>(res);

			expect(json.count).toBe(2);
		});

		test("Cache-Control ヘッダが private, max-age=30 であること", async () => {
			const res = await app.request("/pending-count");
			expect(res.status).toBe(200);
			expect(res.headers.get("Cache-Control")).toBe("private, max-age=30");
		});
	});

	describe("GET /:id - アルバム申請詳細取得", () => {
		test("未認証 → 401を返す", async () => {
			const unauthApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: null,
			});
			const res = await unauthApp.request("/aq_nonexistent_999");
			await expectUnauthorized(res);
		});

		test("存在しない id → 404を返す", async () => {
			const res = await app.request("/aq_nonexistent_999");
			await expectNotFound(res);
		});

		test("管理者: submittedBy / reviewer / existingRelease がネストされた形で返る", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();
			const release = createTestRelease({ id: "rel_test_detail_001" });
			await db.insert(releases).values(release);

			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_detail_001",
					userId: submitter.id,
					requestType: "existing",
					existingReleaseId: "rel_test_detail_001",
					albumName: null,
					status: "approved",
					reviewedByUserId: adminUser.id,
					reviewedAt: new Date(),
					reviewerNotes: "確認済み",
				}),
			);

			const res = await app.request("/aq_detail_001");
			const json = await expectSuccess<AlbumRequestDetail>(res);

			// submittedBy がネストされている
			expect(json.submittedBy?.id).toBe(submitter.id);
			expect(json.submittedBy?.name).toBe(submitter.name);

			// reviewer がネストされている
			expect(json.reviewer?.id).toBe(adminUser.id);

			// existingRelease がネストされている
			expect(json.existingRelease?.id).toBe("rel_test_detail_001");

			// reviewerNotes が含まれる
			expect(json.reviewerNotes).toBe("確認済み");
		});

		test("管理者: pending 申請の詳細（reviewer.id は null）", async () => {
			const submitter = await setupBaseUser();

			await db.insert(albumRequests).values(
				createTestAlbumRequest({
					id: "aq_pending_detail_001",
					userId: submitter.id,
					status: "pending",
				}),
			);

			const res = await app.request("/aq_pending_detail_001");
			const json = await expectSuccess<AlbumRequestDetail>(res);

			// reviewer は leftJoin で null → Drizzle は { id: null, ... } として返す
			expect(json.reviewer?.id ?? null).toBeNull();
			expect(json.status).toBe("pending");
		});
	});

	describe("PATCH /:id - アルバム申請ステータス更新", () => {
		test("未認証 → 401を返す", async () => {
			const unauthApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: null,
			});
			const res = await unauthApp.request(
				"/aq_nonexistent_999",
				patchJson({
					status: "approved",
					updatedAt: new Date().toISOString(),
				}),
			);
			await expectUnauthorized(res);
		});

		test("一般ユーザー → 403を返す", async () => {
			const nonAdminApp = createTestAdminApp(albumRequestsAdminRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request(
				"/aq_nonexistent_999",
				patchJson({
					status: "approved",
					updatedAt: new Date().toISOString(),
				}),
			);
			await expectForbidden(res);
		});

		test("存在しない id → 404を返す", async () => {
			const res = await app.request(
				"/aq_nonexistent_999",
				patchJson({
					status: "approved",
					updatedAt: new Date().toISOString(),
				}),
			);
			await expectNotFound(res);
		});

		test("status=approved + reviewerNotes → 200、DB に reviewedAt/reviewedByUserId/reviewerNotes/status が記録", async () => {
			const submitter = await setupBaseUser();
			await setupAdminUser();

			const request = createTestAlbumRequest({
				id: "aq_to_approve_001",
				userId: submitter.id,
				status: "pending",
			});
			await db.insert(albumRequests).values(request);

			// 現在のupdatedAtを取得
			const current = await db.select().from(albumRequests).limit(1);
			const currentUpdatedAt = current[0].updatedAt;

			const res = await app.request(
				"/aq_to_approve_001",
				patchJson({
					status: "approved",
					reviewerNotes: "内容確認しました",
					updatedAt: currentUpdatedAt.toISOString(),
				}),
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as {
				status: string;
				reviewerNotes: string | null;
				reviewedAt: string | null;
				reviewedByUserId: string | null;
			};

			expect(json.status).toBe("approved");
			expect(json.reviewerNotes).toBe("内容確認しました");
			expect(json.reviewedAt).not.toBeNull();
			expect(json.reviewedByUserId).toBe(defaultTestAdmin.id);
		});

		test("status=rejected → 200", async () => {
			const submitter = await setupBaseUser();
			await setupAdminUser();

			const request = createTestAlbumRequest({
				id: "aq_to_reject_001",
				userId: submitter.id,
				status: "pending",
			});
			await db.insert(albumRequests).values(request);

			const current = await db.select().from(albumRequests).limit(1);
			const currentUpdatedAt = current[0].updatedAt;

			const res = await app.request(
				"/aq_to_reject_001",
				patchJson({
					status: "rejected",
					reviewerNotes: "情報が不足しています",
					updatedAt: currentUpdatedAt.toISOString(),
				}),
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as { status: string };
			expect(json.status).toBe("rejected");
		});

		test("不正な status 値（pending など）→ 400", async () => {
			const submitter = await setupBaseUser();

			const request = createTestAlbumRequest({
				id: "aq_invalid_status_001",
				userId: submitter.id,
				status: "pending",
			});
			await db.insert(albumRequests).values(request);

			const current = await db.select().from(albumRequests).limit(1);
			const currentUpdatedAt = current[0].updatedAt;

			const res = await app.request(
				"/aq_invalid_status_001",
				patchJson({
					status: "pending",
					updatedAt: currentUpdatedAt.toISOString(),
				}),
			);

			await expectBadRequest(res);
		});

		test("楽観的ロック競合: updatedAt を古い値で送る → 409", async () => {
			const submitter = await setupBaseUser();

			const request = createTestAlbumRequest({
				id: "aq_conflict_001",
				userId: submitter.id,
				status: "pending",
			});
			await db.insert(albumRequests).values(request);

			// 古い updatedAt を使って競合を発生させる
			const oldUpdatedAt = new Date(Date.now() - 60_000).toISOString();

			const res = await app.request(
				"/aq_conflict_001",
				patchJson({
					status: "approved",
					updatedAt: oldUpdatedAt,
				}),
			);

			await expectConflict(res);
		});

		test("既に approved のレコードを再度更新 → 400（既に処理済みです）", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();

			const request = createTestAlbumRequest({
				id: "aq_already_approved_001",
				userId: submitter.id,
				status: "approved",
				reviewedByUserId: adminUser.id,
				reviewedAt: new Date(),
			});
			await db.insert(albumRequests).values(request);

			const current = await db.select().from(albumRequests).limit(1);
			const currentUpdatedAt = current[0].updatedAt;

			const res = await app.request(
				"/aq_already_approved_001",
				patchJson({
					status: "rejected",
					updatedAt: currentUpdatedAt.toISOString(),
				}),
			);

			const json = await expectBadRequest(res);
			expect(json.error).toContain("処理済み");
		});

		test("既に rejected のレコードを再度更新 → 400", async () => {
			const submitter = await setupBaseUser();
			const adminUser = await setupAdminUser();

			const request = createTestAlbumRequest({
				id: "aq_already_rejected_001",
				userId: submitter.id,
				status: "rejected",
				reviewedByUserId: adminUser.id,
				reviewedAt: new Date(),
			});
			await db.insert(albumRequests).values(request);

			const current = await db.select().from(albumRequests).limit(1);
			const currentUpdatedAt = current[0].updatedAt;

			const res = await app.request(
				"/aq_already_rejected_001",
				patchJson({
					status: "approved",
					updatedAt: currentUpdatedAt.toISOString(),
				}),
			);

			await expectBadRequest(res);
		});
	});
});
