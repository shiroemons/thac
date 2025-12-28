import {
	aliasTypes,
	creditRoles,
	db,
	insertAliasTypeSchema,
	insertCreditRoleSchema,
	insertOfficialWorkCategorySchema,
	insertPlatformSchema,
	officialWorkCategories,
	platforms,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { parseAndValidate } from "../../../utils/import-parser";

const importRouter = new Hono<AdminContext>();

// プラットフォームのインポート
importRouter.post("/platforms/import", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;

		if (!(file instanceof File)) {
			return c.json({ error: "ファイルが指定されていません" }, 400);
		}

		const content = await file.text();
		const result = parseAndValidate(content, file.name, insertPlatformSchema);

		if (!result.success) {
			return c.json(
				{
					error: "Validation failed",
					rows: result.errors,
				},
				400,
			);
		}

		const data = result.data;
		if (!data) {
			return c.json({ error: "データの取得に失敗しました" }, 500);
		}

		let created = 0;
		const updated = 0;

		await db.transaction(async (tx) => {
			for (const item of data) {
				await tx
					.insert(platforms)
					.values(item)
					.onConflictDoUpdate({
						target: platforms.code,
						set: {
							name: item.name,
							category: item.category,
							urlPattern: item.urlPattern,
						},
					});
				// 簡易的にcreatedとして扱う
				created++;
			}
		});

		return c.json({
			success: true,
			created,
			updated,
			total: data.length,
		});
	} catch (error) {
		return handleDbError(c, error, "POST /admin/master/platforms/import");
	}
});

// 別名義種別のインポート
importRouter.post("/alias-types/import", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;

		if (!(file instanceof File)) {
			return c.json({ error: "ファイルが指定されていません" }, 400);
		}

		const content = await file.text();
		const result = parseAndValidate(content, file.name, insertAliasTypeSchema);

		if (!result.success) {
			return c.json(
				{
					error: "Validation failed",
					rows: result.errors,
				},
				400,
			);
		}

		const data = result.data;
		if (!data) {
			return c.json({ error: "データの取得に失敗しました" }, 500);
		}

		let created = 0;
		const updated = 0;

		await db.transaction(async (tx) => {
			for (const item of data) {
				await tx
					.insert(aliasTypes)
					.values(item)
					.onConflictDoUpdate({
						target: aliasTypes.code,
						set: {
							label: item.label,
							description: item.description,
						},
					});
				created++;
			}
		});

		return c.json({
			success: true,
			created,
			updated,
			total: data.length,
		});
	} catch (error) {
		return handleDbError(c, error, "POST /admin/master/alias-types/import");
	}
});

// クレジット役割のインポート
importRouter.post("/credit-roles/import", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;

		if (!(file instanceof File)) {
			return c.json({ error: "ファイルが指定されていません" }, 400);
		}

		const content = await file.text();
		const result = parseAndValidate(content, file.name, insertCreditRoleSchema);

		if (!result.success) {
			return c.json(
				{
					error: "Validation failed",
					rows: result.errors,
				},
				400,
			);
		}

		const data = result.data;
		if (!data) {
			return c.json({ error: "データの取得に失敗しました" }, 500);
		}

		let created = 0;
		const updated = 0;

		await db.transaction(async (tx) => {
			for (const item of data) {
				await tx
					.insert(creditRoles)
					.values(item)
					.onConflictDoUpdate({
						target: creditRoles.code,
						set: {
							label: item.label,
							description: item.description,
						},
					});
				created++;
			}
		});

		return c.json({
			success: true,
			created,
			updated,
			total: data.length,
		});
	} catch (error) {
		return handleDbError(c, error, "POST /admin/master/credit-roles/import");
	}
});

// 公式作品カテゴリのインポート
importRouter.post("/official-work-categories/import", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;

		if (!(file instanceof File)) {
			return c.json({ error: "ファイルが指定されていません" }, 400);
		}

		const content = await file.text();
		const result = parseAndValidate(
			content,
			file.name,
			insertOfficialWorkCategorySchema,
		);

		if (!result.success) {
			return c.json(
				{
					error: "Validation failed",
					rows: result.errors,
				},
				400,
			);
		}

		const data = result.data;
		if (!data) {
			return c.json({ error: "データの取得に失敗しました" }, 500);
		}

		let created = 0;
		const updated = 0;

		await db.transaction(async (tx) => {
			for (const item of data) {
				await tx
					.insert(officialWorkCategories)
					.values(item)
					.onConflictDoUpdate({
						target: officialWorkCategories.code,
						set: {
							name: item.name,
							description: item.description,
						},
					});
				created++;
			}
		});

		return c.json({
			success: true,
			created,
			updated,
			total: data.length,
		});
	} catch (error) {
		return handleDbError(
			c,
			error,
			"POST /admin/master/official-work-categories/import",
		);
	}
});

export { importRouter };
