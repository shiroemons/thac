/**
 * Admin Artist Aliases API 統合テスト
 *
 * @description
 * アーティスト別名管理APIのCRUD操作、認証、楽観的ロックをテスト
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
	artistAliases,
	artists,
} from "@thac/db";
import { artistAliasesRouter } from "../../../src/routes/admin/artist-aliases";
import {
	createTestArtist,
	createTestArtistAlias,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// 型定義
interface AliasListResponse {
	data: Array<{
		id: string;
		artistId: string;
		name: string;
		aliasTypeCode: string | null;
		nameInitial: string | null;
		initialScript: string;
		periodFrom: string | null;
		periodTo: string | null;
		artistName: string | null;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface AliasResponse {
	id: string;
	artistId: string;
	name: string;
	aliasTypeCode: string | null;
	nameInitial: string | null;
	initialScript: string;
	periodFrom: string | null;
	periodTo: string | null;
	artistName: string | null;
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

// ヘルパー: テスト用アーティストを作成
async function setupTestArtist(id?: string) {
	const artist = createTestArtist(id ? { id } : undefined);
	await testDb.insert(artists).values(artist);
	return artist;
}

describe("Admin Artist Aliases API", () => {
	describe("GET / - 一覧取得", () => {
		it("別名が存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("別名一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias1 = createTestArtistAlias({
				name: "Alias A",
				artistId: artist.id,
			});
			const alias2 = createTestArtistAlias({
				name: "Alias B",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values([alias1, alias2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
			expect(json.page).toBe(1);
			expect(json.limit).toBe(10);
		});

		it("アーティストIDでフィルタリングできる", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist1 = await setupTestArtist();
			const artist2 = await setupTestArtist();

			const alias1 = createTestArtistAlias({
				name: "Alias for Artist 1",
				artistId: artist1.id,
			});
			const alias2 = createTestArtistAlias({
				name: "Alias for Artist 2",
				artistId: artist2.id,
			});
			await testDb.insert(artistAliases).values([alias1, alias2]);

			const res = await app.request(`/?artistId=${artist1.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Alias for Artist 1");
		});

		it("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias1 = createTestArtistAlias({
				name: "ZUN",
				artistId: artist.id,
			});
			const alias2 = createTestArtistAlias({
				name: "神主",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values([alias1, alias2]);

			const res = await app.request("/?search=ZUN");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("ZUN");
		});
	});

	describe("GET /:id - 個別取得", () => {
		it("存在する別名を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({
				name: "Test Alias",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(`/${alias.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasResponse;
			expect(json.id).toBe(alias.id);
			expect(json.name).toBe("Test Alias");
		});

		it("存在しない別名は404を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しい別名を作成できる", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(alias),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as AliasResponse;
			expect(json.id).toBe(alias.id);
			expect(json.name).toBe(alias.name);
		});

		it("存在しないアーティストIDは404を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const alias = createTestArtistAlias({ artistId: "nonexistent" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(alias),
			});

			expect(res.status).toBe(404);
		});

		it("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const duplicateAlias = createTestArtistAlias({
				id: alias.id,
				artistId: artist.id,
				name: "Different Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateAlias),
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("ID");
		});

		it("同一アーティスト内で重複する名前は409を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({
				artistId: artist.id,
				name: "Same Name",
			});
			await testDb.insert(artistAliases).values(alias);

			const duplicateAlias = createTestArtistAlias({
				artistId: artist.id,
				name: "Same Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateAlias),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:id - 更新", () => {
		it("別名を更新できる", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({
				name: "Original",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values(alias);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${alias.id}`);
			const existingAlias = (await getRes.json()) as AliasResponse;

			const updateRes = await app.request(`/${alias.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: existingAlias.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);

			const json = (await updateRes.json()) as AliasResponse;
			expect(json.name).toBe("Updated");
		});

		it("存在しない別名は404を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(`/${alias.id}`, {
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

		it("同一アーティスト内で他の別名と重複する名前は409を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias1 = createTestArtistAlias({
				artistId: artist.id,
				name: "Alias One",
			});
			const alias2 = createTestArtistAlias({
				artistId: artist.id,
				name: "Alias Two",
			});
			await testDb.insert(artistAliases).values([alias1, alias2]);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${alias2.id}`);
			const existingAlias = (await getRes.json()) as AliasResponse;

			const updateRes = await app.request(`/${alias2.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Alias One",
					updatedAt: existingAlias.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(409);
		});
	});

	describe("DELETE /:id - 削除", () => {
		it("別名を削除できる", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(`/${alias.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${alias.id}`);
			expect(getRes.status).toBe(404);
		});

		it("存在しない別名は404を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(artistAliasesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});
