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
	test,
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

// エンティティ固有のレスポンス型
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

// 共有テストデータベース
let testDb: ReturnType<typeof createTestDatabase>["db"];
let sqlite: Database;
let app: ReturnType<typeof createTestAdminApp>;

beforeAll(() => {
	const result = createTestDatabase();
	testDb = result.db;
	sqlite = result.sqlite;
	__setTestDatabase(testDb);
	app = createTestAdminApp(artistAliasesRouter);
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
		test("別名が存在しない場合、空配列を返す", async () => {
			const res = await app.request("/");
			await expectEmptyList<AliasResponse>(res);
		});

		test("別名一覧をページネーション付きで返す", async () => {
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
			const json = await expectSuccess<PaginatedResponse<AliasResponse>>(res);

			expectPagination(json, { total: 2, page: 1, limit: 10, length: 2 });
		});

		test("アーティストIDでフィルタリングできる", async () => {
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
			const json = await expectSuccess<PaginatedResponse<AliasResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("Alias for Artist 1");
		});

		test("検索クエリでフィルタリングできる", async () => {
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
			const json = await expectSuccess<PaginatedResponse<AliasResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("ZUN");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在する別名を返す", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({
				name: "Test Alias",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(`/${alias.id}`);
			const json = await expectSuccess<AliasResponse>(res);

			expect(json.id).toBe(alias.id);
			expect(json.name).toBe("Test Alias");
		});

		test("存在しない別名は404を返す", async () => {
			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しい別名を作成できる", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			const res = await app.request("/", postJson(alias));

			const json = await expectCreated<AliasResponse>(res);
			expect(json.id).toBe(alias.id);
			expect(json.name).toBe(alias.name);
		});

		test("存在しないアーティストIDは404を返す", async () => {
			const alias = createTestArtistAlias({ artistId: "nonexistent" });
			const res = await app.request("/", postJson(alias));

			await expectNotFound(res);
		});

		test("重複するIDは409を返す", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const duplicateAlias = createTestArtistAlias({
				id: alias.id,
				artistId: artist.id,
				name: "Different Name",
			});
			const res = await app.request("/", postJson(duplicateAlias));

			const json = await expectConflict(res);
			expect(json.error).toContain("ID");
		});

		test("同一アーティスト内で重複する名前は409を返す", async () => {
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
			const res = await app.request("/", postJson(duplicateAlias));

			await expectConflict(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("別名を更新できる", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({
				name: "Original",
				artistId: artist.id,
			});
			await testDb.insert(artistAliases).values(alias);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${alias.id}`);
			const existingAlias = await expectSuccess<AliasResponse>(getRes);

			const res = await app.request(
				`/${alias.id}`,
				putJson({
					name: "Updated",
					updatedAt: existingAlias.updatedAt,
				}),
			);

			const json = await expectSuccess<AliasResponse>(res);
			expect(json.name).toBe("Updated");
		});

		test("存在しない別名は404を返す", async () => {
			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(
				`/${alias.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			const json = await expectConflict(res);
			expect(json.error).toContain("更新");
		});

		test("同一アーティスト内で他の別名と重複する名前は409を返す", async () => {
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
			const existingAlias = await expectSuccess<AliasResponse>(getRes);

			const res = await app.request(
				`/${alias2.id}`,
				putJson({
					name: "Alias One",
					updatedAt: existingAlias.updatedAt,
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("別名を削除できる", async () => {
			const artist = await setupTestArtist();
			const alias = createTestArtistAlias({ artistId: artist.id });
			await testDb.insert(artistAliases).values(alias);

			const res = await app.request(`/${alias.id}`, deleteRequest());
			const json = await expectSuccess<DeleteResponse>(res);

			expect(json.success).toBe(true);

			// 削除されたことを確認
			const getRes = await app.request(`/${alias.id}`);
			await expectNotFound(getRes);
		});

		test("存在しない別名は404を返す", async () => {
			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(artistAliasesRouter, { user: null });
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(artistAliasesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			await expectForbidden(res);
		});
	});
});
