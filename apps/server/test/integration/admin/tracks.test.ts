/**
 * Admin Tracks API 統合テスト
 *
 * @description
 * スタンドアロントラック管理API（/admin/tracks）のCRUD操作、認証をテスト
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
import {
	__resetDatabase,
	__setTestDatabase,
	discs,
	releases,
	tracks,
} from "@thac/db";
import { tracksAdminRouter } from "../../../src/routes/admin/tracks";
import {
	createTestDisc,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// 型定義
interface TrackListResponse {
	data: Array<{
		id: string;
		releaseId: string | null;
		discId: string | null;
		trackNumber: number;
		name: string;
		releaseName: string | null;
		discNumber: number | null;
		creditCount: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface TrackDetailResponse {
	id: string;
	releaseId: string | null;
	discId: string | null;
	trackNumber: number;
	name: string;
	release: {
		id: string;
		name: string;
	} | null;
	disc: {
		id: string;
		discNumber: number;
	} | null;
	credits: Array<{
		id: string;
		creditName: string;
	}>;
	createdAt: string;
	updatedAt: string;
}

interface BatchDeleteResponse {
	success: boolean;
	deleted: string[];
	failed: Array<{ trackId: string; error: string }>;
}

// 共有テストデータベース
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

// ヘルパー: テスト用リリースを作成
async function setupTestRelease(
	overrides?: Parameters<typeof createTestRelease>[0],
) {
	const release = createTestRelease(overrides);
	await testDb.insert(releases).values(release);
	return release;
}

// ヘルパー: テスト用ディスクを作成
async function setupTestDisc(
	releaseId: string,
	overrides?: Partial<{ discNumber: number }>,
) {
	const disc = createTestDisc({ releaseId, ...overrides });
	await testDb.insert(discs).values(disc);
	return disc;
}

// ヘルパー: テスト用トラックを作成
async function setupTestTrack(
	releaseId: string,
	discId?: string,
	overrides?: Partial<{ trackNumber: number; name: string }>,
) {
	const track = createTestTrack({
		releaseId,
		discId: discId ?? null,
		...overrides,
	});
	await testDb.insert(tracks).values(track);
	return track;
}

describe("Admin Tracks API (Standalone)", () => {
	describe("GET / - 一覧取得", () => {
		test("トラックが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		test("トラック一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release = await setupTestRelease();
			await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
				name: "Track 1",
			});
			await setupTestTrack(release.id, undefined, {
				trackNumber: 2,
				name: "Track 2",
			});

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
			expect(json.page).toBe(1);
			expect(json.limit).toBe(10);
		});

		test("リリースIDでフィルタリングできる", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release1 = await setupTestRelease({ name: "Release 1" });
			const release2 = await setupTestRelease({ name: "Release 2" });
			await setupTestTrack(release1.id, undefined, {
				trackNumber: 1,
				name: "Track from Release 1",
			});
			await setupTestTrack(release2.id, undefined, {
				trackNumber: 1,
				name: "Track from Release 2",
			});

			const res = await app.request(`/?releaseId=${release1.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Track from Release 1");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release = await setupTestRelease();
			await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
				name: "紅魔館",
			});
			await setupTestTrack(release.id, undefined, {
				trackNumber: 2,
				name: "永遠亭",
			});

			const res = await app.request("/?search=紅魔");
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("紅魔館");
		});
	});

	describe("GET /:trackId - 個別取得", () => {
		test("存在するトラックを詳細情報付きで返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release = await setupTestRelease({ name: "Test Release" });
			const disc = await setupTestDisc(release.id, { discNumber: 1 });
			const track = await setupTestTrack(release.id, disc.id, {
				trackNumber: 1,
				name: "Test Track",
			});

			const res = await app.request(`/${track.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackDetailResponse;
			expect(json.id).toBe(track.id);
			expect(json.name).toBe("Test Track");
			expect(json.release?.name).toBe("Test Release");
			expect(json.disc?.discNumber).toBe(1);
		});

		test("存在しないトラックは404を返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /batch - 一括削除", () => {
		test("複数のトラックを一括削除できる", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release = await setupTestRelease();
			const track1 = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
			});
			const track2 = await setupTestTrack(release.id, undefined, {
				trackNumber: 2,
			});

			const res = await app.request("/batch", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ trackId: track1.id, releaseId: release.id },
						{ trackId: track2.id, releaseId: release.id },
					],
				}),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as BatchDeleteResponse;
			expect(json.success).toBe(true);
			expect(json.deleted.length).toBe(2);
		});

		test("空の配列は400を返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const res = await app.request("/batch", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ items: [] }),
			});

			expect(res.status).toBe(400);
		});

		test("存在しないトラックはfailedに含まれる", async () => {
			const app = createTestAdminApp(tracksAdminRouter);

			const release = await setupTestRelease();
			const track = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
			});

			const res = await app.request("/batch", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ trackId: track.id, releaseId: release.id },
						{ trackId: "nonexistent", releaseId: release.id },
					],
				}),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as BatchDeleteResponse;
			expect(json.success).toBe(false);
			expect(json.deleted.length).toBe(1);
			expect(json.failed.length).toBe(1);
			expect(json.failed[0]?.trackId).toBe("nonexistent");
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(tracksAdminRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});
