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
	it,
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

// 型定義
interface WorkListResponse {
	data: Array<{
		id: string;
		categoryCode: string;
		name: string;
		nameJa: string;
		nameEn: string | null;
		position: number | null;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
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

interface SongListResponse {
	data: Array<{
		id: string;
		officialWorkId: string | null;
		name: string;
		nameJa: string;
		isOriginal: boolean;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
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
		it("作品が存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as WorkListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("作品一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work1 = createTestOfficialWork({ name: "Work A" });
			const work2 = createTestOfficialWork({ name: "Work B" });
			await testDb.insert(officialWorks).values([work1, work2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as WorkListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
			expect(json.page).toBe(1);
			expect(json.limit).toBe(10);
		});

		it("カテゴリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as WorkListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Game Work");
		});

		it("検索クエリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as WorkListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.nameJa).toBe("東方紅魔郷");
		});
	});

	describe("GET /:id - 個別取得", () => {
		it("存在する作品を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork({ name: "Test Work" });
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as WorkResponse;
			expect(json.id).toBe(work.id);
			expect(json.name).toBe("Test Work");
		});

		it("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しい作品を作成できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(work),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as WorkResponse;
			expect(json.id).toBe(work.id);
			expect(json.name).toBe(work.name);
		});

		it("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const duplicateWork = createTestOfficialWork({ id: work.id });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateWork),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("ID");
		});

		it("必須フィールドが欠けている場合は400を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: "test" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /:id - 更新", () => {
		it("作品を更新できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork({ name: "Original" });
			await testDb.insert(officialWorks).values(work);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${work.id}`);
			const existingWork = (await getRes.json()) as WorkResponse;

			const updateRes = await app.request(`/${work.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: existingWork.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as WorkResponse;
			expect(json.name).toBe("Updated");
		});

		it("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}`, {
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
		it("作品を削除できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${work.id}`);
			expect(getRes.status).toBe(404);
		});

		it("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(worksRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(worksRouter, { user: { role: "user" } });

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Official Work Links API", () => {
	describe("GET /:workId/links - リンク一覧取得", () => {
		it("作品のリンク一覧を返す", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as LinkResponse[];
			expect(json.length).toBe(1);
			expect(json[0]?.id).toBe(link.id);
		});

		it("存在しない作品は404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			const res = await app.request("/nonexistent/links");
			expect(res.status).toBe(404);
		});
	});

	describe("POST /:workId/links - リンク追加", () => {
		it("新しいリンクを追加できる", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			await setupTestPlatform();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const link = createTestOfficialWorkLink({
				officialWorkId: work.id,
				platformCode: "test_platform",
			});

			const res = await app.request(`/${work.id}/links`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(link),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as LinkResponse;
			expect(json.id).toBe(link.id);
		});

		it("同一作品内でURLが重複する場合は409を返す", async () => {
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

			const res = await app.request(`/${work.id}/links`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(link2),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:workId/links/:linkId - リンク削除", () => {
		it("リンクを削除できる", async () => {
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

			const res = await app.request(`/${work.id}/links/${link.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
		});

		it("存在しないリンクは404を返す", async () => {
			const app = createTestAdminApp(worksRouter);

			await setupTestCategory();
			const work = createTestOfficialWork();
			await testDb.insert(officialWorks).values(work);

			const res = await app.request(`/${work.id}/links/nonexistent`, {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});
});

describe("Admin Official Songs API", () => {
	describe("GET / - 一覧取得", () => {
		it("楽曲が存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as SongListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("楽曲一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song1 = createTestOfficialSong({ name: "Song A" });
			const song2 = createTestOfficialSong({ name: "Song B" });
			await testDb.insert(officialSongs).values([song1, song2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as SongListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("作品IDでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as SongListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Work Song");
		});

		it("検索クエリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as SongListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Luna Clock");
		});
	});

	describe("GET /:id - 個別取得", () => {
		it("存在する楽曲を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ name: "Test Song" });
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as SongResponse;
			expect(json.id).toBe(song.id);
			expect(json.name).toBe("Test Song");
		});

		it("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しい楽曲を作成できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(song),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as SongResponse;
			expect(json.id).toBe(song.id);
			expect(json.name).toBe(song.name);
		});

		it("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const duplicateSong = createTestOfficialSong({ id: song.id });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateSong),
			});

			expect(res.status).toBe(409);
		});

		it("sourceSongIdが自身を参照している場合は400を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({
				id: "self_ref_song",
				sourceSongId: "self_ref_song",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(song),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /:id - 更新", () => {
		it("楽曲を更新できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ name: "Original" });
			await testDb.insert(officialSongs).values(song);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${song.id}`);
			const existingSong = (await getRes.json()) as SongResponse;

			const updateRes = await app.request(`/${song.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: existingSong.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as SongResponse;
			expect(json.name).toBe("Updated");
		});

		it("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}`, {
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

		it("sourceSongIdが自身を参照する更新は400を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong({ id: "test_song_123" });
			await testDb.insert(officialSongs).values(song);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${song.id}`);
			const existingSong = (await getRes.json()) as SongResponse;

			const res = await app.request(`/${song.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sourceSongId: "test_song_123",
					updatedAt: existingSong.updatedAt,
				}),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /:id - 削除", () => {
		it("楽曲を削除できる", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${song.id}`);
			expect(getRes.status).toBe(404);
		});

		it("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(songsRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(songsRouter, { user: { role: "user" } });

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Official Song Links API", () => {
	describe("GET /:songId/links - リンク一覧取得", () => {
		it("楽曲のリンク一覧を返す", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as LinkResponse[];
			expect(json.length).toBe(1);
			expect(json[0]?.id).toBe(link.id);
		});

		it("存在しない楽曲は404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const res = await app.request("/nonexistent/links");
			expect(res.status).toBe(404);
		});
	});

	describe("POST /:songId/links - リンク追加", () => {
		it("新しいリンクを追加できる", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
			});

			const res = await app.request(`/${song.id}/links`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(link),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as LinkResponse;
			expect(json.id).toBe(link.id);
		});

		it("同一楽曲内でURLが重複する場合は409を返す", async () => {
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

			const res = await app.request(`/${song.id}/links`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(link2),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:songId/links/:linkId - リンク削除", () => {
		it("リンクを削除できる", async () => {
			const app = createTestAdminApp(songsRouter);

			await setupTestPlatform();
			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const link = createTestOfficialSongLink({
				officialSongId: song.id,
				platformCode: "test_platform",
			});
			await testDb.insert(officialSongLinks).values(link);

			const res = await app.request(`/${song.id}/links/${link.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
		});

		it("存在しないリンクは404を返す", async () => {
			const app = createTestAdminApp(songsRouter);

			const song = createTestOfficialSong();
			await testDb.insert(officialSongs).values(song);

			const res = await app.request(`/${song.id}/links/nonexistent`, {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});
});
