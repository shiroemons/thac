/**
 * Admin Master API 統合テスト
 *
 * @description
 * マスタデータ管理API（プラットフォーム、クレジットロール、別名タイプ、作品カテゴリ）のCRUD操作をテスト
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
	aliasTypes,
	creditRoles,
	officialWorkCategories,
	platforms,
} from "@thac/db";
import { aliasTypesRouter } from "../../../src/routes/admin/master/alias-types";
import { creditRolesRouter } from "../../../src/routes/admin/master/credit-roles";
import { officialWorkCategoriesRouter } from "../../../src/routes/admin/master/official-work-categories";
import { platformsRouter } from "../../../src/routes/admin/master/platforms";
import {
	createTestAliasType,
	createTestCreditRole,
	createTestOfficialWorkCategory,
	createTestPlatform,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
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

// 型定義（エンティティ固有のレスポンス型のみ）
interface PlatformResponse {
	code: string;
	name: string;
	category: string | null;
	urlPattern: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface CreditRoleResponse {
	code: string;
	label: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface AliasTypeResponse {
	code: string;
	label: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface OfficialWorkCategoryResponse {
	code: string;
	name: string;
	description: string | null;
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

describe("Admin Platforms API", () => {
	describe("GET / - 一覧取得", () => {
		test("プラットフォームが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/");
			await expectEmptyList<PlatformResponse>(res);
		});

		test("プラットフォーム一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({ name: "Twitter" });
			const platform2 = createTestPlatform({ name: "YouTube" });
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request("/?page=1&limit=10");
			const json =
				await expectSuccess<PaginatedResponse<PlatformResponse>>(res);
			expectPagination(json, { length: 2, total: 2 });
		});

		test("カテゴリでフィルタリングできる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({
				name: "Twitter",
				category: "sns",
			});
			const platform2 = createTestPlatform({
				name: "Spotify",
				category: "music",
			});
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request("/?category=sns");
			const json =
				await expectSuccess<PaginatedResponse<PlatformResponse>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.name).toBe("Twitter");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({
				code: "twitter",
				name: "Twitter",
			});
			const platform2 = createTestPlatform({
				code: "youtube",
				name: "YouTube",
			});
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request("/?search=tube");
			const json =
				await expectSuccess<PaginatedResponse<PlatformResponse>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.name).toBe("YouTube");
		});
	});

	describe("GET /:code - 個別取得", () => {
		test("存在するプラットフォームを返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request("/twitter");
			const json = await expectSuccess<PlatformResponse>(res);
			expect(json.code).toBe("twitter");
			expect(json.name).toBe("Twitter");
		});

		test("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいプラットフォームを作成できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			const res = await app.request("/", postJson(platform));

			const json = await expectCreated<PlatformResponse>(res);
			expect(json.code).toBe(platform.code);
			expect(json.name).toBe(platform.name);
		});

		test("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(platformsRouter);

			const existingPlatform = createTestPlatform({ sortOrder: 5 });
			await testDb.insert(platforms).values(existingPlatform);

			const newPlatform = createTestPlatform();
			const { sortOrder: _, ...platformWithoutSortOrder } = newPlatform;
			const res = await app.request("/", postJson(platformWithoutSortOrder));

			const json = await expectCreated<PlatformResponse>(res);
			expect(json.sortOrder).toBe(6);
		});

		test("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const duplicatePlatform = createTestPlatform({
				code: "twitter",
				name: "Different",
			});
			const res = await app.request("/", postJson(duplicatePlatform));

			await expectConflict(res);
		});

		test("必須フィールドが欠けている場合は400を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/", postJson({ name: "Test" }));

			await expectBadRequest(res);
		});
	});

	describe("PUT /:code - 更新", () => {
		test("プラットフォームを更新できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			await testDb.insert(platforms).values(platform);

			// 最新のupdatedAtを取得
			const getRes = await app.request("/twitter");
			const existingPlatform = await expectSuccess<PlatformResponse>(getRes);

			const updateRes = await app.request(
				"/twitter",
				putJson({
					name: "X (Twitter)",
					updatedAt: existingPlatform.updatedAt,
				}),
			);

			const json = await expectSuccess<PlatformResponse>(updateRes);
			expect(json.name).toBe("X (Twitter)");
		});

		test("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);

			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request(
				"/twitter",
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:code - 削除", () => {
		test("プラットフォームを削除できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request("/twitter", deleteRequest());
			await expectSuccess(res);

			// 削除されたことを確認
			const getRes = await app.request("/twitter");
			await expectNotFound(getRes);
		});

		test("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/nonexistent", deleteRequest());

			await expectNotFound(res);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		test("複数のプラットフォームのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({ code: "p1", sortOrder: 0 });
			const platform2 = createTestPlatform({ code: "p2", sortOrder: 1 });
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request(
				"/reorder",
				putJson({
					items: [
						{ code: "p1", sortOrder: 1 },
						{ code: "p2", sortOrder: 0 },
					],
				}),
			);

			await expectSuccess(res);

			// 更新されたことを確認
			const getRes1 = await app.request("/p1");
			const json1 = await expectSuccess<PlatformResponse>(getRes1);
			expect(json1.sortOrder).toBe(1);

			const getRes2 = await app.request("/p2");
			const json2 = await expectSuccess<PlatformResponse>(getRes2);
			expect(json2.sortOrder).toBe(0);
		});

		test("itemsが配列でない場合は400を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/reorder", putJson({ items: "invalid" }));

			await expectBadRequest(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(platformsRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(platformsRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Credit Roles API", () => {
	describe("GET / - 一覧取得", () => {
		test("クレジットロールが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/");
			await expectEmptyList<CreditRoleResponse>(res);
		});

		test("クレジットロール一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ label: "作曲" });
			const role2 = createTestCreditRole({ label: "編曲" });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request("/?page=1&limit=10");
			const json =
				await expectSuccess<PaginatedResponse<CreditRoleResponse>>(res);
			expectPagination(json, { length: 2, total: 2 });
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ code: "composer", label: "作曲" });
			const role2 = createTestCreditRole({ code: "arranger", label: "編曲" });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request("/?search=composer");
			const json =
				await expectSuccess<PaginatedResponse<CreditRoleResponse>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.code).toBe("composer");
		});
	});

	describe("GET /:code - 個別取得", () => {
		test("存在するクレジットロールを返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			await testDb.insert(creditRoles).values(role);

			const res = await app.request("/composer");
			const json = await expectSuccess<CreditRoleResponse>(res);
			expect(json.code).toBe("composer");
			expect(json.label).toBe("作曲");
		});

		test("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいクレジットロールを作成できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			const res = await app.request("/", postJson(role));

			const json = await expectCreated<CreditRoleResponse>(res);
			expect(json.code).toBe(role.code);
			expect(json.label).toBe(role.label);
		});

		test("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const existingRole = createTestCreditRole({ sortOrder: 5 });
			await testDb.insert(creditRoles).values(existingRole);

			const newRole = createTestCreditRole();
			const { sortOrder: _, ...roleWithoutSortOrder } = newRole;
			const res = await app.request("/", postJson(roleWithoutSortOrder));

			const json = await expectCreated<CreditRoleResponse>(res);
			expect(json.sortOrder).toBe(6);
		});

		test("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer" });
			await testDb.insert(creditRoles).values(role);

			const duplicateRole = createTestCreditRole({
				code: "composer",
				label: "Different",
			});
			const res = await app.request("/", postJson(duplicateRole));

			await expectConflict(res);
		});
	});

	describe("PUT /:code - 更新", () => {
		test("クレジットロールを更新できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			await testDb.insert(creditRoles).values(role);

			const updateRes = await app.request(
				"/composer",
				putJson({ label: "Compose" }),
			);

			const json = await expectSuccess<CreditRoleResponse>(updateRes);
			expect(json.label).toBe("Compose");
		});

		test("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ label: "Updated" }),
			);

			await expectNotFound(res);
		});
	});

	describe("DELETE /:code - 削除", () => {
		test("クレジットロールを削除できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer" });
			await testDb.insert(creditRoles).values(role);

			const res = await app.request("/composer", deleteRequest());
			await expectSuccess(res);

			// 削除されたことを確認
			const getRes = await app.request("/composer");
			await expectNotFound(getRes);
		});

		test("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/nonexistent", deleteRequest());

			await expectNotFound(res);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		test("複数のクレジットロールのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ code: "r1", sortOrder: 0 });
			const role2 = createTestCreditRole({ code: "r2", sortOrder: 1 });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request(
				"/reorder",
				putJson({
					items: [
						{ code: "r1", sortOrder: 1 },
						{ code: "r2", sortOrder: 0 },
					],
				}),
			);

			await expectSuccess(res);

			// 更新されたことを確認
			const getRes1 = await app.request("/r1");
			const json1 = await expectSuccess<CreditRoleResponse>(getRes1);
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Alias Types API", () => {
	describe("GET / - 一覧取得", () => {
		test("別名タイプが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/");
			await expectEmptyList<AliasTypeResponse>(res);
		});

		test("別名タイプ一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ label: "別名" });
			const type2 = createTestAliasType({ label: "ユニット" });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request("/?page=1&limit=10");
			const json =
				await expectSuccess<PaginatedResponse<AliasTypeResponse>>(res);
			expectPagination(json, { length: 2, total: 2 });
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ code: "alias", label: "別名" });
			const type2 = createTestAliasType({ code: "unit", label: "ユニット" });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request("/?search=alias");
			const json =
				await expectSuccess<PaginatedResponse<AliasTypeResponse>>(res);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.code).toBe("alias");
		});
	});

	describe("GET /:code - 個別取得", () => {
		test("存在する別名タイプを返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			await testDb.insert(aliasTypes).values(type);

			const res = await app.request("/alias");
			const json = await expectSuccess<AliasTypeResponse>(res);
			expect(json.code).toBe("alias");
			expect(json.label).toBe("別名");
		});

		test("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しい別名タイプを作成できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			const res = await app.request("/", postJson(type));

			const json = await expectCreated<AliasTypeResponse>(res);
			expect(json.code).toBe(type.code);
			expect(json.label).toBe(type.label);
		});

		test("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const existingType = createTestAliasType({ sortOrder: 5 });
			await testDb.insert(aliasTypes).values(existingType);

			const newType = createTestAliasType();
			const { sortOrder: _, ...typeWithoutSortOrder } = newType;
			const res = await app.request("/", postJson(typeWithoutSortOrder));

			const json = await expectCreated<AliasTypeResponse>(res);
			expect(json.sortOrder).toBe(6);
		});

		test("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias" });
			await testDb.insert(aliasTypes).values(type);

			const duplicateType = createTestAliasType({
				code: "alias",
				label: "Different",
			});
			const res = await app.request("/", postJson(duplicateType));

			await expectConflict(res);
		});
	});

	describe("PUT /:code - 更新", () => {
		test("別名タイプを更新できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			await testDb.insert(aliasTypes).values(type);

			const updateRes = await app.request(
				"/alias",
				putJson({ label: "エイリアス" }),
			);

			const json = await expectSuccess<AliasTypeResponse>(updateRes);
			expect(json.label).toBe("エイリアス");
		});

		test("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ label: "Updated" }),
			);

			await expectNotFound(res);
		});
	});

	describe("DELETE /:code - 削除", () => {
		test("別名タイプを削除できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias" });
			await testDb.insert(aliasTypes).values(type);

			const res = await app.request("/alias", deleteRequest());
			await expectSuccess(res);

			// 削除されたことを確認
			const getRes = await app.request("/alias");
			await expectNotFound(getRes);
		});

		test("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/nonexistent", deleteRequest());

			await expectNotFound(res);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		test("複数の別名タイプのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ code: "t1", sortOrder: 0 });
			const type2 = createTestAliasType({ code: "t2", sortOrder: 1 });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request(
				"/reorder",
				putJson({
					items: [
						{ code: "t1", sortOrder: 1 },
						{ code: "t2", sortOrder: 0 },
					],
				}),
			);

			await expectSuccess(res);

			// 更新されたことを確認
			const getRes1 = await app.request("/t1");
			const json1 = await expectSuccess<AliasTypeResponse>(getRes1);
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter, { user: null });

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Official Work Categories API", () => {
	describe("GET / - 一覧取得", () => {
		test("カテゴリが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/");
			await expectEmptyList<OfficialWorkCategoryResponse>(res);
		});

		test("カテゴリ一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat1 = createTestOfficialWorkCategory({ name: "ゲーム" });
			const cat2 = createTestOfficialWorkCategory({ name: "音楽CD" });
			await testDb.insert(officialWorkCategories).values([cat1, cat2]);

			const res = await app.request("/?page=1&limit=10");
			const json =
				await expectSuccess<PaginatedResponse<OfficialWorkCategoryResponse>>(
					res,
				);
			expectPagination(json, { length: 2, total: 2 });
		});

		test("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat1 = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			const cat2 = createTestOfficialWorkCategory({
				code: "music",
				name: "音楽CD",
			});
			await testDb.insert(officialWorkCategories).values([cat1, cat2]);

			const res = await app.request("/?search=game");
			const json =
				await expectSuccess<PaginatedResponse<OfficialWorkCategoryResponse>>(
					res,
				);
			expectPagination(json, { length: 1 });
			expect(json.data[0]?.code).toBe("game");
		});
	});

	describe("GET /:code - 個別取得", () => {
		test("存在するカテゴリを返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			await testDb.insert(officialWorkCategories).values(cat);

			const res = await app.request("/game");
			const json = await expectSuccess<OfficialWorkCategoryResponse>(res);
			expect(json.code).toBe("game");
			expect(json.name).toBe("ゲーム");
		});

		test("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいカテゴリを作成できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			const res = await app.request("/", postJson(cat));

			const json = await expectCreated<OfficialWorkCategoryResponse>(res);
			expect(json.code).toBe(cat.code);
			expect(json.name).toBe(cat.name);
		});

		test("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const existingCat = createTestOfficialWorkCategory({ sortOrder: 5 });
			await testDb.insert(officialWorkCategories).values(existingCat);

			const newCat = createTestOfficialWorkCategory();
			const { sortOrder: _, ...catWithoutSortOrder } = newCat;
			const res = await app.request("/", postJson(catWithoutSortOrder));

			const json = await expectCreated<OfficialWorkCategoryResponse>(res);
			expect(json.sortOrder).toBe(6);
		});

		test("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({ code: "game" });
			await testDb.insert(officialWorkCategories).values(cat);

			const duplicateCat = createTestOfficialWorkCategory({
				code: "game",
				name: "Different",
			});
			const res = await app.request("/", postJson(duplicateCat));

			await expectConflict(res);
		});
	});

	describe("PUT /:code - 更新", () => {
		test("カテゴリを更新できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			await testDb.insert(officialWorkCategories).values(cat);

			const updateRes = await app.request(
				"/game",
				putJson({ name: "PCゲーム" }),
			);

			const json = await expectSuccess<OfficialWorkCategoryResponse>(updateRes);
			expect(json.name).toBe("PCゲーム");
		});

		test("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);

			await expectNotFound(res);
		});
	});

	describe("DELETE /:code - 削除", () => {
		test("カテゴリを削除できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({ code: "game" });
			await testDb.insert(officialWorkCategories).values(cat);

			const res = await app.request("/game", deleteRequest());
			await expectSuccess(res);

			// 削除されたことを確認
			const getRes = await app.request("/game");
			await expectNotFound(getRes);
		});

		test("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/nonexistent", deleteRequest());

			await expectNotFound(res);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		test("複数のカテゴリのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat1 = createTestOfficialWorkCategory({ code: "c1", sortOrder: 0 });
			const cat2 = createTestOfficialWorkCategory({ code: "c2", sortOrder: 1 });
			await testDb.insert(officialWorkCategories).values([cat1, cat2]);

			const res = await app.request(
				"/reorder",
				putJson({
					items: [
						{ code: "c1", sortOrder: 1 },
						{ code: "c2", sortOrder: 0 },
					],
				}),
			);

			await expectSuccess(res);

			// 更新されたことを確認
			const getRes1 = await app.request("/c1");
			const json1 = await expectSuccess<OfficialWorkCategoryResponse>(getRes1);
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter, {
				user: null,
			});

			const res = await app.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			await expectForbidden(res);
		});
	});
});
