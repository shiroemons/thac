/**
 * Admin Official API 統合テスト
 *
 * @description
 * 公式作品・楽曲管理APIのCRUD操作、認証、楽観的ロックをテスト
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
	officialSongLinks,
	officialSongs,
	officialWorkCategories,
	officialWorkLinks,
	officialWorks,
	platforms,
} from "@thac/db";
import { songsRouter } from "../../../src/routes/admin/official/songs";
import { worksRouter } from "../../../src/routes/admin/official/works";
import {
	createTestOfficialSong,
	createTestOfficialSongLink,
	createTestOfficialWork,
	createTestOfficialWorkCategory,
	createTestOfficialWorkLink,
	createTestPlatform,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	type DeleteResponse,
	deleteRequest,
	expectBadRequest,
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

// 型定義
interface WorkData {
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	position: number | null;
	createdAt: string;
	updatedAt: string;
}

interface WorkResponse {
	id: string;
	categoryCode: string;
	name: string;
	nameJa: string;
	nameEn: string | null;
	createdAt: string;
	updatedAt: string;
}

interface SongData {
	id: string;
	officialWorkId: string | null;
	name: string;
	nameJa: string;
	isOriginal: boolean;
	createdAt: string;
	updatedAt: string;
}

interface SongResponse {
	id: string;
	officialWorkId: string | null;
	name: string;
	nameJa: string;
	isOriginal: boolean;
	createdAt: string;
	updatedAt: string;
}

interface LinkResponse {
	id: string;
	platformCode: string;
	url: string;
	sortOrder: number;
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

// ヘルパー: テスト用カテゴリを作成
async function setupTestCategory(code = "test_category") {
	const category = createTestOfficialWorkCategory({ code, name: "Test" });
	await testDb.insert(officialWorkCategories).values(category);
	return category;
}

// ヘルパー: テスト用プラットフォームを作成
async function setupTestPlatform(code = "test_platform") {
	const platform = createTestPlatform({ code, name: "Test Platform" });
	await testDb.insert(platforms).values(platform);
	return platform;
}

describe("Admin Official Works API", () => {
	describe("GET / - 一覧取得", () => {
		test("作品が存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/");
			await expectEmptyList<WorkData>(res);
		});

		test("作品一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work1 = createTestOfficialWork({ name: "Work A" });
			const work2 = createTestOfficialWork({ name: "Work B" });
			await testDb.insert(officialWorks).values([work1, work2]);

			const res = await app.request("/?page=1&limit=10");
			const json = await expectSuccess<PaginatedResponse<WorkData>>(res);
			expectPagination(json, { total: 2, page: 1, limit: 10, length: 2 });
		});

		test("カテゴリでフィルタリングできる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory("game");
			await setupTestCategory("music");
			const work1 = createTestOfficialWork({
				name: "Game Work",
				categoryCode: "game",
			});
			const work2 = createTestOfficialWork({
				name: "Music Work",
				categoryCode: "music",
			});
			await testDb.insert(officialWorks).values([work1, work2]);

			const res = await app.request("/?category=game");
			const json = await expectSuccess<PaginatedResponse<WorkData>>(res);
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Game Work");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work1 = createTestOfficialWork({
				name: "紅魔郷",
				nameJa: "東方紅魔郷",
			});
			const work2 = createTestOfficialWork({
				name: "妖々夢",
				nameJa: "東方妖々夢",
			});
			await testDb.insert(officialWorks).values([work1, work2]);

			const res = await app.request("/?search=紅魔郷");
			const json = await expectSuccess<PaginatedResponse<WorkData>>(res);
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.nameJa).toBe("東方紅魔郷");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在する作品を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork({ name: "Test Work" });
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}`);
			const json = await expectSuccess<WorkResponse>(res);
			expect(json.id).toBe(work.id);
			expect(json.name).toBe("Test Work");
		});

		test("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しい作品を作成できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			const res = await app.request("/", postJson(work));

			const json = await expectCreated<WorkResponse>(res);
			expect(json.id).toBe(work.id);
			expect(json.name).toBe(work.name);
		});

		test("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const duplicateWork = createTestOfficialWork({ id: work.id });
			const res = await app.request("/", postJson(duplicateWork));

			const json = await expectConflict(res);
			expect(json.error).toContain("ID");
		});

		test("必須フィールドが欠けている場合は400を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/", postJson({ id: "test" }));
			await expectBadRequest(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("作品を更新できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork({ name: "Original" });
			await testDb.insert(officialWorks).values(work);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${work.id}`);
			const existingWork = await expectSuccess<WorkResponse>(getRes);

			const updateRes = await app.request(
				`/${work.id}`,
				putJson({
					name: "Updated",
					updatedAt: existingWork.updatedAt,
				}),
			);

			const json = await expectSuccess<WorkResponse>(updateRes);
			expect(json.name).toBe("Updated");
		});

		test("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(
				`/${work.id}`,
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
		test("作品を削除できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}`, deleteRequest());
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${work.id}`);
			await expectNotFound(getRes);
		});

		test("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(worksRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(worksRouter, { user: { role: "user" } });

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Official Work Links API", () => {
	describe("GET /:workId/links - リンク一覧取得", () => {
		test("作品のリンク一覧を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			await setupTestPlatform();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const link = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
			});
			await testDb.insert(officialWorkLinks).values(link);

			const res = await app.request(`/${work.id}/links`);
			const json = await expectSuccess<LinkResponse[]>(res);
			expect(json.length).toBe(1);
			expect(json[0]?.id).toBe(link.id);
		});

		test("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent/links");
			await expectNotFound(res);
		});
	});

	describe("POST /:workId/links - リンク追加", () => {
		test("新しいリンクを追加できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			await setupTestPlatform();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const link = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
			});

			const res = await app.request(`/${work.id}/links`, postJson(link));
			const json = await expectCreated<LinkResponse>(res);
			expect(json.id).toBe(link.id);
		});

		test("同一作品内でURLが重複する場合は409を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			await setupTestPlatform();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const link1 = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
				url: "https://example.com/same",
			});
			await testDb.insert(officialWorkLinks).values(link1);

			const link2 = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
				url: "https://example.com/same",
			});

			const res = await app.request(`/${work.id}/links`, postJson(link2));
			await expectConflict(res);
		});
	});

	describe("DELETE /:workId/links/:linkId - リンク削除", () => {
		test("リンクを削除できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			await setupTestPlatform();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const link = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
			});
			await testDb.insert(officialWorkLinks).values(link);

			const res = await app.request(
				`/${work.id}/links/${link.id}`,
				deleteRequest(),
			);
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
		});

		test("存在しないリンクは404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(
				`/${work.id}/links/nonexistent`,
				deleteRequest(),
			);
			await expectNotFound(res);
		});
	});
});

describe("Admin Official Songs API", () => {
	describe("GET / - 一覧取得", () => {
		test("楽曲が存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/");
			await expectEmptyList<SongData>(res);
		});

		test("楽曲一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song1 = createTestOfficialSong({ name: "Song A" });
			const song2 = createTestOfficialSong({ name: "Song B" });
			await testDb.insert(officialSongs).values([song1, song2]);

			const res = await app.request("/?page=1&limit=10");
			const json = await expectSuccess<PaginatedResponse<SongData>>(res);
			expectPagination(json, { total: 2, length: 2 });
		});

		test("作品IDでフィルタリングできる", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const song1 = createTestOfficialSong({
				name: "Work Song",
				officialWorkId: work.id,
			});
			const song2 = createTestOfficialSong({ name: "Standalone Song" });
			await testDb.insert(officialSongs).values([song1, song2]);

			const res = await app.request(`/?workId=${work.id}`);
			const json = await expectSuccess<PaginatedResponse<SongData>>(res);
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Work Song");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song1 = createTestOfficialSong({
				name: "Luna Clock",
				nameJa: "ルナクロック",
			});
			const song2 = createTestOfficialSong({
				name: "Night Bird",
				nameJa: "ナイトバード",
			});
			await testDb.insert(officialSongs).values([song1, song2]);

			const res = await app.request("/?search=Luna");
			const json = await expectSuccess<PaginatedResponse<SongData>>(res);
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Luna Clock");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在する楽曲を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ name: "Test Song" });
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}`);
			const json = await expectSuccess<SongResponse>(res);
			expect(json.id).toBe(song.id);
			expect(json.name).toBe("Test Song");
		});

		test("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しい楽曲を作成できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			const res = await app.request("/", postJson(song));

			const json = await expectCreated<SongResponse>(res);
			expect(json.id).toBe(song.id);
			expect(json.name).toBe(song.name);
		});

		test("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const duplicateSong = createTestOfficialSong({ id: song.id });
			const res = await app.request("/", postJson(duplicateSong));
			await expectConflict(res);
		});

		test("sourceSongIdが自身を参照している場合は400を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({
				id: "self_ref_song",
				sourceSongId: "self_ref_song",
			});
			const res = await app.request("/", postJson(song));
			await expectBadRequest(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("楽曲を更新できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ name: "Original" });
			await testDb.insert(officialSongs).values(song);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${song.id}`);
			const existingSong = await expectSuccess<SongResponse>(getRes);

			const updateRes = await app.request(
				`/${song.id}`,
				putJson({
					name: "Updated",
					updatedAt: existingSong.updatedAt,
				}),
			);

			const json = await expectSuccess<SongResponse>(updateRes);
			expect(json.name).toBe("Updated");
		});

		test("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(
				`/${song.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			const json = await expectConflict(res);
			expect(json.error).toContain("更新");
		});

		test("sourceSongIdが自身を参照する更新は400を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ id: "test_song_123" });
			await testDb.insert(officialSongs).values(song);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${song.id}`);
			const existingSong = await expectSuccess<SongResponse>(getRes);

			const res = await app.request(
				`/${song.id}`,
				putJson({
					sourceSongId: "test_song_123",
					updatedAt: existingSong.updatedAt,
				}),
			);
			await expectBadRequest(res);
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("楽曲を削除できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}`, deleteRequest());
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${song.id}`);
			await expectNotFound(getRes);
		});

		test("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(songsRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(songsRouter, { user: { role: "user" } });

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Official Song Links API", () => {
	describe("GET /:songId/links - リンク一覧取得", () => {
		test("楽曲のリンク一覧を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
			});
			await testDb.insert(officialSongLinks).values(link);

			const res = await app.request(`/${song.id}/links`);
			const json = await expectSuccess<LinkResponse[]>(res);
			expect(json.length).toBe(1);
			expect(json[0]?.id).toBe(link.id);
		});

		test("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent/links");
			await expectNotFound(res);
		});
	});

	describe("POST /:songId/links - リンク追加", () => {
		test("新しいリンクを追加できる", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
			});

			const res = await app.request(`/${song.id}/links`, postJson(link));
			const json = await expectCreated<LinkResponse>(res);
			expect(json.id).toBe(link.id);
		});

		test("同一楽曲内でURLが重複する場合は409を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link1 = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
				url: "https://example.com/same",
			});
			await testDb.insert(officialSongLinks).values(link1);

			const link2 = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
				url: "https://example.com/same",
			});

			const res = await app.request(`/${song.id}/links`, postJson(link2));
			await expectConflict(res);
		});
	});

	describe("DELETE /:songId/links/:linkId - リンク削除", () => {
		test("リンクを削除できる", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
			});
			await testDb.insert(officialSongLinks).values(link);

			const res = await app.request(
				`/${song.id}/links/${link.id}`,
				deleteRequest(),
			);
			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
		});

		test("存在しないリンクは404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(
				`/${song.id}/links/nonexistent`,
				deleteRequest(),
			);
			await expectNotFound(res);
		});
	});
});
