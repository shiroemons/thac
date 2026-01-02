/**
 * Admin Releases API 統合テスト
 *
 * @description
 * リリース・ディスク・トラック管理APIのCRUD操作、認証、楽観的ロックをテスト
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
import { releasesAdminRouter } from "../../../src/routes/admin/releases";
import {
	createTestDisc,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// 型定義
interface ReleaseListResponse {
	data: Array<{
		id: string;
		name: string;
		releaseDate: string | null;
		releaseType: string;
		discCount: number;
		trackCount: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface ReleaseResponse {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseType: string;
	discs: Array<{
		id: string;
		releaseId: string;
		discNumber: number;
		name: string | null;
	}>;
	createdAt: string;
	updatedAt: string;
}

interface DiscResponse {
	id: string;
	releaseId: string;
	discNumber: number;
	name: string | null;
	createdAt: string;
	updatedAt: string;
}

interface TrackResponse {
	id: string;
	releaseId: string | null;
	discId: string | null;
	trackNumber: number;
	name: string;
	createdAt: string;
	updatedAt: string;
}

interface DeleteResponse {
	success: boolean;
	id: string;
}

interface ErrorResponse {
	error: string;
	details?: Record<string, string[]>;
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
	overrides?: Partial<{ discNumber: number; name: string | null }>,
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

describe("Admin Releases API", () => {
	describe("GET / - 一覧取得", () => {
		test("リリースが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		test("リリース一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "Release A" });
			await setupTestRelease({ name: "Release B" });

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
			expect(json.page).toBe(1);
			expect(json.limit).toBe(10);
		});

		test("リリースタイプでフィルタリングできる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "Album", releaseType: "album" });
			await setupTestRelease({ name: "Single", releaseType: "single" });

			const res = await app.request("/?releaseType=album");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Album");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "東方紅魔郷" });
			await setupTestRelease({ name: "東方永夜抄" });

			const res = await app.request("/?search=紅魔郷");
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("東方紅魔郷");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するリリースをディスク情報付きで返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease({ name: "Test Release" });
			await setupTestDisc(release.id, { discNumber: 1 });

			const res = await app.request(`/${release.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as ReleaseResponse;
			expect(json.id).toBe(release.id);
			expect(json.name).toBe("Test Release");
			expect(json.discs.length).toBe(1);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいリリースを作成できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = createTestRelease();
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(release),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as ReleaseResponse;
			expect(json.id).toBe(release.id);
			expect(json.name).toBe(release.name);
		});

		test("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const duplicateRelease = createTestRelease({
				id: release.id,
				name: "Different Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateRelease),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("ID");
		});
	});

	describe("PUT /:id - 更新", () => {
		test("リリースを更新できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease({ name: "Original" });

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${release.id}`);
			const existingRelease = (await getRes.json()) as ReleaseResponse;

			const updateRes = await app.request(`/${release.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: existingRelease.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as ReleaseResponse;
			expect(json.name).toBe("Updated");
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("更新");
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("リリースを削除できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${release.id}`);
			expect(getRes.status).toBe(404);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Discs API", () => {
	describe("GET /:releaseId/discs - ディスク一覧取得", () => {
		test("リリースのディスク一覧を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			await setupTestDisc(release.id, { discNumber: 1 });
			await setupTestDisc(release.id, { discNumber: 2 });

			const res = await app.request(`/${release.id}/discs`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as DiscResponse[];
			expect(json.length).toBe(2);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent/discs");
			expect(res.status).toBe(404);
		});
	});

	describe("POST /:releaseId/discs - ディスク追加", () => {
		test("新しいディスクを追加できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = createTestDisc({ releaseId: release.id, discNumber: 1 });

			const res = await app.request(`/${release.id}/discs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(disc),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as DiscResponse;
			expect(json.id).toBe(disc.id);
			expect(json.discNumber).toBe(1);
		});

		test("同一リリース内でディスク番号が重複する場合は409を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			await setupTestDisc(release.id, { discNumber: 1 });

			const duplicateDisc = createTestDisc({
				releaseId: release.id,
				discNumber: 1,
			});
			const res = await app.request(`/${release.id}/discs`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateDisc),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:releaseId/discs/:discId - ディスク更新", () => {
		test("ディスクを更新できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = await setupTestDisc(release.id, { discNumber: 1 });

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${release.id}/discs`);
			const discList = (await getRes.json()) as DiscResponse[];
			const existingDisc = discList.find((d) => d.id === disc.id);

			const updateRes = await app.request(`/${release.id}/discs/${disc.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					discNumber: 2,
					updatedAt: existingDisc?.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as DiscResponse;
			expect(json.discNumber).toBe(2);
		});

		test("存在しないディスクは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}/discs/nonexistent`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /:releaseId/discs/:discId - ディスク削除", () => {
		test("ディスクを削除できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = await setupTestDisc(release.id, { discNumber: 1 });

			const res = await app.request(`/${release.id}/discs/${disc.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
		});

		test("存在しないディスクは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}/discs/nonexistent`, {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});
});

describe("Admin Release Tracks API", () => {
	describe("GET /:releaseId/tracks - トラック一覧取得", () => {
		test("リリースのトラック一覧を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
				name: "Track 1",
			});
			await setupTestTrack(release.id, undefined, {
				trackNumber: 2,
				name: "Track 2",
			});

			const res = await app.request(`/${release.id}/tracks`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as TrackResponse[];
			expect(json.length).toBe(2);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent/tracks");
			expect(res.status).toBe(404);
		});
	});

	describe("POST /:releaseId/tracks - トラック追加", () => {
		test("新しいトラックを追加できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const track = createTestTrack({
				releaseId: release.id,
				trackNumber: 1,
				name: "New Track",
			});

			const res = await app.request(`/${release.id}/tracks`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(track),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as TrackResponse;
			expect(json.id).toBe(track.id);
			expect(json.name).toBe("New Track");
		});

		test("ディスク内でトラック番号が重複する場合は409を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = await setupTestDisc(release.id, { discNumber: 1 });
			await setupTestTrack(release.id, disc.id, { trackNumber: 1 });

			const duplicateTrack = createTestTrack({
				releaseId: release.id,
				discId: disc.id,
				trackNumber: 1,
			});
			const res = await app.request(`/${release.id}/tracks`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateTrack),
			});

			expect(res.status).toBe(409);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const track = createTestTrack({
				releaseId: "nonexistent",
				trackNumber: 1,
			});
			const res = await app.request("/nonexistent/tracks", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(track),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /:releaseId/tracks/:trackId - トラック更新", () => {
		test("トラックを更新できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const track = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
				name: "Original",
			});

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${release.id}/tracks`);
			const trackList = (await getRes.json()) as TrackResponse[];
			const existingTrack = trackList.find((t) => t.id === track.id);

			const updateRes = await app.request(`/${release.id}/tracks/${track.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated Track",
					updatedAt: existingTrack?.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as TrackResponse;
			expect(json.name).toBe("Updated Track");
		});

		test("存在しないトラックは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}/tracks/nonexistent`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const track = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
			});

			const res = await app.request(`/${release.id}/tracks/${track.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("更新");
		});
	});

	describe("DELETE /:releaseId/tracks/:trackId - トラック削除", () => {
		test("トラックを削除できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const track = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
			});

			const res = await app.request(`/${release.id}/tracks/${track.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
		});

		test("存在しないトラックは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}/tracks/nonexistent`, {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});
});
