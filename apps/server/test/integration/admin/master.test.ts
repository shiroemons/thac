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
	it,
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

// 型定義
interface PlatformListResponse {
	data: Array<{
		code: string;
		name: string;
		category: string | null;
		urlPattern: string | null;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface PlatformResponse {
	code: string;
	name: string;
	category: string | null;
	urlPattern: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface CreditRoleListResponse {
	data: Array<{
		code: string;
		label: string;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface CreditRoleResponse {
	code: string;
	label: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface AliasTypeListResponse {
	data: Array<{
		code: string;
		label: string;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface AliasTypeResponse {
	code: string;
	label: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

interface OfficialWorkCategoryListResponse {
	data: Array<{
		code: string;
		name: string;
		description: string | null;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
	page: number;
	limit: number;
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
		it("プラットフォームが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as PlatformListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("プラットフォーム一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({ name: "Twitter" });
			const platform2 = createTestPlatform({ name: "YouTube" });
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as PlatformListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("カテゴリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as PlatformListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Twitter");
		});

		it("検索クエリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as PlatformListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("YouTube");
		});
	});

	describe("GET /:code - 個別取得", () => {
		it("存在するプラットフォームを返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request("/twitter");
			expect(res.status).toBe(200);

			const json = (await res.json()) as PlatformResponse;
			expect(json.code).toBe("twitter");
			expect(json.name).toBe("Twitter");
		});

		it("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しいプラットフォームを作成できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(platform),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as PlatformResponse;
			expect(json.code).toBe(platform.code);
			expect(json.name).toBe(platform.name);
		});

		it("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(platformsRouter);

			const existingPlatform = createTestPlatform({ sortOrder: 5 });
			await testDb.insert(platforms).values(existingPlatform);

			const newPlatform = createTestPlatform();
			const { sortOrder: _, ...platformWithoutSortOrder } = newPlatform;
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(platformWithoutSortOrder),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as PlatformResponse;
			expect(json.sortOrder).toBe(6);
		});

		it("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const duplicatePlatform = createTestPlatform({
				code: "twitter",
				name: "Different",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicatePlatform),
			});

			expect(res.status).toBe(409);
		});

		it("必須フィールドが欠けている場合は400を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Test" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /:code - 更新", () => {
		it("プラットフォームを更新できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter", name: "Twitter" });
			await testDb.insert(platforms).values(platform);

			// 最新のupdatedAtを取得
			const getRes = await app.request("/twitter");
			const existingPlatform = (await getRes.json()) as PlatformResponse;

			const updateRes = await app.request("/twitter", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "X (Twitter)",
					updatedAt: existingPlatform.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as PlatformResponse;
			expect(json.name).toBe("X (Twitter)");
		});

		it("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request("/twitter", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:code - 削除", () => {
		it("プラットフォームを削除できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform = createTestPlatform({ code: "twitter" });
			await testDb.insert(platforms).values(platform);

			const res = await app.request("/twitter", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request("/twitter");
			expect(getRes.status).toBe(404);
		});

		it("存在しないプラットフォームは404を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		it("複数のプラットフォームのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(platformsRouter);

			const platform1 = createTestPlatform({ code: "p1", sortOrder: 0 });
			const platform2 = createTestPlatform({ code: "p2", sortOrder: 1 });
			await testDb.insert(platforms).values([platform1, platform2]);

			const res = await app.request("/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ code: "p1", sortOrder: 1 },
						{ code: "p2", sortOrder: 0 },
					],
				}),
			});

			expect(res.status).toBe(200);

			// 更新されたことを確認
			const getRes1 = await app.request("/p1");
			const json1 = (await getRes1.json()) as PlatformResponse;
			expect(json1.sortOrder).toBe(1);

			const getRes2 = await app.request("/p2");
			const json2 = (await getRes2.json()) as PlatformResponse;
			expect(json2.sortOrder).toBe(0);
		});

		it("itemsが配列でない場合は400を返す", async () => {
			const app = createTestAdminApp(platformsRouter);

			const res = await app.request("/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ items: "invalid" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(platformsRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(platformsRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Credit Roles API", () => {
	describe("GET / - 一覧取得", () => {
		it("クレジットロールが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CreditRoleListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("クレジットロール一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ label: "作曲" });
			const role2 = createTestCreditRole({ label: "編曲" });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CreditRoleListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ code: "composer", label: "作曲" });
			const role2 = createTestCreditRole({ code: "arranger", label: "編曲" });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request("/?search=composer");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CreditRoleListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.code).toBe("composer");
		});
	});

	describe("GET /:code - 個別取得", () => {
		it("存在するクレジットロールを返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			await testDb.insert(creditRoles).values(role);

			const res = await app.request("/composer");
			expect(res.status).toBe(200);

			const json = (await res.json()) as CreditRoleResponse;
			expect(json.code).toBe("composer");
			expect(json.label).toBe("作曲");
		});

		it("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しいクレジットロールを作成できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(role),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as CreditRoleResponse;
			expect(json.code).toBe(role.code);
			expect(json.label).toBe(role.label);
		});

		it("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const existingRole = createTestCreditRole({ sortOrder: 5 });
			await testDb.insert(creditRoles).values(existingRole);

			const newRole = createTestCreditRole();
			const { sortOrder: _, ...roleWithoutSortOrder } = newRole;
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(roleWithoutSortOrder),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as CreditRoleResponse;
			expect(json.sortOrder).toBe(6);
		});

		it("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer" });
			await testDb.insert(creditRoles).values(role);

			const duplicateRole = createTestCreditRole({
				code: "composer",
				label: "Different",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateRole),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:code - 更新", () => {
		it("クレジットロールを更新できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer", label: "作曲" });
			await testDb.insert(creditRoles).values(role);

			const updateRes = await app.request("/composer", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label: "Compose" }),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as CreditRoleResponse;
			expect(json.label).toBe("Compose");
		});

		it("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /:code - 削除", () => {
		it("クレジットロールを削除できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role = createTestCreditRole({ code: "composer" });
			await testDb.insert(creditRoles).values(role);

			const res = await app.request("/composer", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request("/composer");
			expect(getRes.status).toBe(404);
		});

		it("存在しないクレジットロールは404を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		it("複数のクレジットロールのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(creditRolesRouter);

			const role1 = createTestCreditRole({ code: "r1", sortOrder: 0 });
			const role2 = createTestCreditRole({ code: "r2", sortOrder: 1 });
			await testDb.insert(creditRoles).values([role1, role2]);

			const res = await app.request("/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ code: "r1", sortOrder: 1 },
						{ code: "r2", sortOrder: 0 },
					],
				}),
			});

			expect(res.status).toBe(200);

			// 更新されたことを確認
			const getRes1 = await app.request("/r1");
			const json1 = (await getRes1.json()) as CreditRoleResponse;
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(creditRolesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Alias Types API", () => {
	describe("GET / - 一覧取得", () => {
		it("別名タイプが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTypeListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("別名タイプ一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ label: "別名" });
			const type2 = createTestAliasType({ label: "ユニット" });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTypeListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ code: "alias", label: "別名" });
			const type2 = createTestAliasType({ code: "unit", label: "ユニット" });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request("/?search=alias");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTypeListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.code).toBe("alias");
		});
	});

	describe("GET /:code - 個別取得", () => {
		it("存在する別名タイプを返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			await testDb.insert(aliasTypes).values(type);

			const res = await app.request("/alias");
			expect(res.status).toBe(200);

			const json = (await res.json()) as AliasTypeResponse;
			expect(json.code).toBe("alias");
			expect(json.label).toBe("別名");
		});

		it("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しい別名タイプを作成できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(type),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as AliasTypeResponse;
			expect(json.code).toBe(type.code);
			expect(json.label).toBe(type.label);
		});

		it("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const existingType = createTestAliasType({ sortOrder: 5 });
			await testDb.insert(aliasTypes).values(existingType);

			const newType = createTestAliasType();
			const { sortOrder: _, ...typeWithoutSortOrder } = newType;
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(typeWithoutSortOrder),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as AliasTypeResponse;
			expect(json.sortOrder).toBe(6);
		});

		it("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias" });
			await testDb.insert(aliasTypes).values(type);

			const duplicateType = createTestAliasType({
				code: "alias",
				label: "Different",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateType),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:code - 更新", () => {
		it("別名タイプを更新できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias", label: "別名" });
			await testDb.insert(aliasTypes).values(type);

			const updateRes = await app.request("/alias", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label: "エイリアス" }),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as AliasTypeResponse;
			expect(json.label).toBe("エイリアス");
		});

		it("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ label: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /:code - 削除", () => {
		it("別名タイプを削除できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type = createTestAliasType({ code: "alias" });
			await testDb.insert(aliasTypes).values(type);

			const res = await app.request("/alias", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request("/alias");
			expect(getRes.status).toBe(404);
		});

		it("存在しない別名タイプは404を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		it("複数の別名タイプのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(aliasTypesRouter);

			const type1 = createTestAliasType({ code: "t1", sortOrder: 0 });
			const type2 = createTestAliasType({ code: "t2", sortOrder: 1 });
			await testDb.insert(aliasTypes).values([type1, type2]);

			const res = await app.request("/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ code: "t1", sortOrder: 1 },
						{ code: "t2", sortOrder: 0 },
					],
				}),
			});

			expect(res.status).toBe(200);

			// 更新されたことを確認
			const getRes1 = await app.request("/t1");
			const json1 = (await getRes1.json()) as AliasTypeResponse;
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(aliasTypesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Official Work Categories API", () => {
	describe("GET / - 一覧取得", () => {
		it("カテゴリが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as OfficialWorkCategoryListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("カテゴリ一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat1 = createTestOfficialWorkCategory({ name: "ゲーム" });
			const cat2 = createTestOfficialWorkCategory({ name: "音楽CD" });
			await testDb.insert(officialWorkCategories).values([cat1, cat2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as OfficialWorkCategoryListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("検索クエリでフィルタリングできる", async () => {
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
			expect(res.status).toBe(200);

			const json = (await res.json()) as OfficialWorkCategoryListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.code).toBe("game");
		});
	});

	describe("GET /:code - 個別取得", () => {
		it("存在するカテゴリを返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			await testDb.insert(officialWorkCategories).values(cat);

			const res = await app.request("/game");
			expect(res.status).toBe(200);

			const json = (await res.json()) as OfficialWorkCategoryResponse;
			expect(json.code).toBe("game");
			expect(json.name).toBe("ゲーム");
		});

		it("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しいカテゴリを作成できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(cat),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as OfficialWorkCategoryResponse;
			expect(json.code).toBe(cat.code);
			expect(json.name).toBe(cat.name);
		});

		it("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const existingCat = createTestOfficialWorkCategory({ sortOrder: 5 });
			await testDb.insert(officialWorkCategories).values(existingCat);

			const newCat = createTestOfficialWorkCategory();
			const { sortOrder: _, ...catWithoutSortOrder } = newCat;
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(catWithoutSortOrder),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as OfficialWorkCategoryResponse;
			expect(json.sortOrder).toBe(6);
		});

		it("重複するコードは409を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({ code: "game" });
			await testDb.insert(officialWorkCategories).values(cat);

			const duplicateCat = createTestOfficialWorkCategory({
				code: "game",
				name: "Different",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateCat),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:code - 更新", () => {
		it("カテゴリを更新できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({
				code: "game",
				name: "ゲーム",
			});
			await testDb.insert(officialWorkCategories).values(cat);

			const updateRes = await app.request("/game", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "PCゲーム" }),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as OfficialWorkCategoryResponse;
			expect(json.name).toBe("PCゲーム");
		});

		it("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /:code - 削除", () => {
		it("カテゴリを削除できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat = createTestOfficialWorkCategory({ code: "game" });
			await testDb.insert(officialWorkCategories).values(cat);

			const res = await app.request("/game", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request("/game");
			expect(getRes.status).toBe(404);
		});

		it("存在しないカテゴリは404を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("PUT /reorder - 並べ替え", () => {
		it("複数のカテゴリのsortOrderを一括更新できる", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter);

			const cat1 = createTestOfficialWorkCategory({ code: "c1", sortOrder: 0 });
			const cat2 = createTestOfficialWorkCategory({ code: "c2", sortOrder: 1 });
			await testDb.insert(officialWorkCategories).values([cat1, cat2]);

			const res = await app.request("/reorder", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					items: [
						{ code: "c1", sortOrder: 1 },
						{ code: "c2", sortOrder: 0 },
					],
				}),
			});

			expect(res.status).toBe(200);

			// 更新されたことを確認
			const getRes1 = await app.request("/c1");
			const json1 = (await getRes1.json()) as OfficialWorkCategoryResponse;
			expect(json1.sortOrder).toBe(1);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter, {
				user: null,
			});

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(officialWorkCategoriesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});
