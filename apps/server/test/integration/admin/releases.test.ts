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
import {
	type DeleteResponse,
	deleteRequest,
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

// 型定義（エンティティ固有）
interface ReleaseListItem {
	id: string;
	name: string;
	releaseDate: string | null;
	releaseType: string;
	discCount: number;
	trackCount: number;
	createdAt: string;
	updatedAt: string;
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
			await expectEmptyList<ReleaseListItem>(res);
		});

		test("リリース一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "Release A" });
			await setupTestRelease({ name: "Release B" });

			const res = await app.request("/?page=1&limit=10");
			const json = await expectSuccess<PaginatedResponse<ReleaseListItem>>(res);
			expectPagination(json, { total: 2, page: 1, limit: 10, length: 2 });
		});

		test("リリースタイプでフィルタリングできる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "Album", releaseType: "album" });
			await setupTestRelease({ name: "Single", releaseType: "single" });

			const res = await app.request("/?releaseType=album");
			const json = await expectSuccess<PaginatedResponse<ReleaseListItem>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.name).toBe("Album");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			await setupTestRelease({ name: "東方紅魔郷" });
			await setupTestRelease({ name: "東方永夜抄" });

			const res = await app.request("/?search=紅魔郷");
			const json = await expectSuccess<PaginatedResponse<ReleaseListItem>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.name).toBe("東方紅魔郷");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するリリースをディスク情報付きで返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease({ name: "Test Release" });
			await setupTestDisc(release.id, { discNumber: 1 });

			const res = await app.request(`/${release.id}`);
			const json = await expectSuccess<ReleaseResponse>(res);
			expect(json.id).toBe(release.id);
			expect(json.name).toBe("Test Release");
			expect(json.discs.length).toBe(1);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいリリースを作成できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = createTestRelease();
			const res = await app.request("/", postJson(release));

			const json = await expectCreated<ReleaseResponse>(res);
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
			const res = await app.request("/", postJson(duplicateRelease));

			const json = await expectConflict(res);
			expect(json.error).toContain("ID");
		});
	});

	describe("PUT /:id - 更新", () => {
		test("リリースを更新できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease({ name: "Original" });

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${release.id}`);
			const existingRelease = await expectSuccess<ReleaseResponse>(getRes);

			const updateRes = await app.request(
				`/${release.id}`,
				putJson({
					name: "Updated",
					updatedAt: existingRelease.updatedAt,
				}),
			);

			const json = await expectSuccess<ReleaseResponse>(updateRes);
			expect(json.name).toBe("Updated");
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(
				`/${release.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			const json = await expectConflict(res);
			expect(json.error).toContain("更新");
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("リリースを削除できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(`/${release.id}`, deleteRequest());
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${release.id}`);
			await expectNotFound(getRes);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			await expectForbidden(res);
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
			const json = await expectSuccess<DiscResponse[]>(res);
			expect(json.length).toBe(2);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent/discs");
			await expectNotFound(res);
		});
	});

	describe("POST /:releaseId/discs - ディスク追加", () => {
		test("新しいディスクを追加できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = createTestDisc({ releaseId: release.id, discNumber: 1 });

			const res = await app.request(`/${release.id}/discs`, postJson(disc));

			const json = await expectCreated<DiscResponse>(res);
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
			const res = await app.request(
				`/${release.id}/discs`,
				postJson(duplicateDisc),
			);

			await expectConflict(res);
		});
	});

	describe("PUT /:releaseId/discs/:discId - ディスク更新", () => {
		test("ディスクを更新できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = await setupTestDisc(release.id, { discNumber: 1 });

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${release.id}/discs`);
			const discList = await expectSuccess<DiscResponse[]>(getRes);
			const existingDisc = discList.find((d) => d.id === disc.id);

			const updateRes = await app.request(
				`/${release.id}/discs/${disc.id}`,
				putJson({
					discNumber: 2,
					updatedAt: existingDisc?.updatedAt,
				}),
			);

			const json = await expectSuccess<DiscResponse>(updateRes);
			expect(json.discNumber).toBe(2);
		});

		test("存在しないディスクは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(
				`/${release.id}/discs/nonexistent`,
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});
	});

	describe("DELETE /:releaseId/discs/:discId - ディスク削除", () => {
		test("ディスクを削除できる", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const disc = await setupTestDisc(release.id, { discNumber: 1 });

			const res = await app.request(
				`/${release.id}/discs/${disc.id}`,
				deleteRequest(),
			);
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
		});

		test("存在しないディスクは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(
				`/${release.id}/discs/nonexistent`,
				deleteRequest(),
			);
			await expectNotFound(res);
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
			const json = await expectSuccess<TrackResponse[]>(res);
			expect(json.length).toBe(2);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const res = await app.request("/nonexistent/tracks");
			await expectNotFound(res);
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

			const res = await app.request(`/${release.id}/tracks`, postJson(track));

			const json = await expectCreated<TrackResponse>(res);
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
			const res = await app.request(
				`/${release.id}/tracks`,
				postJson(duplicateTrack),
			);

			await expectConflict(res);
		});

		test("存在しないリリースは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const track = createTestTrack({
				releaseId: "nonexistent",
				trackNumber: 1,
			});
			const res = await app.request("/nonexistent/tracks", postJson(track));

			await expectNotFound(res);
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
			const trackList = await expectSuccess<TrackResponse[]>(getRes);
			const existingTrack = trackList.find((t) => t.id === track.id);

			const updateRes = await app.request(
				`/${release.id}/tracks/${track.id}`,
				putJson({
					name: "Updated Track",
					updatedAt: existingTrack?.updatedAt,
				}),
			);

			const json = await expectSuccess<TrackResponse>(updateRes);
			expect(json.name).toBe("Updated Track");
		});

		test("存在しないトラックは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(
				`/${release.id}/tracks/nonexistent`,
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();
			const track = await setupTestTrack(release.id, undefined, {
				trackNumber: 1,
			});

			const res = await app.request(
				`/${release.id}/tracks/${track.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			const json = await expectConflict(res);
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

			const res = await app.request(
				`/${release.id}/tracks/${track.id}`,
				deleteRequest(),
			);
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
		});

		test("存在しないトラックは404を返す", async () => {
			const app = createTestAdminApp(releasesAdminRouter);

			const release = await setupTestRelease();

			const res = await app.request(
				`/${release.id}/tracks/nonexistent`,
				deleteRequest(),
			);
			await expectNotFound(res);
		});
	});
});
