import {
	db,
	insertOfficialWorkCategorySchema,
	officialWorkCategories,
	updateOfficialWorkCategorySchema,
} from "@thac/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const officialWorkCategoriesRouter = new Hono<AdminContext>();

// 一覧取得
officialWorkCategoriesRouter.get("/", async (c) => {
	const data = await db
		.select()
		.from(officialWorkCategories)
		.orderBy(officialWorkCategories.code);

	return c.json({
		data,
		total: data.length,
	});
});

// 個別取得
officialWorkCategoriesRouter.get("/:code", async (c) => {
	const code = c.req.param("code");

	const result = await db
		.select()
		.from(officialWorkCategories)
		.where(eq(officialWorkCategories.code, code))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
officialWorkCategoriesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertOfficialWorkCategorySchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 重複チェック
	const existing = await db
		.select()
		.from(officialWorkCategories)
		.where(eq(officialWorkCategories.code, parsed.data.code))
		.limit(1);

	if (existing.length > 0) {
		return c.json({ error: "Code already exists" }, 409);
	}

	// 作成
	const result = await db
		.insert(officialWorkCategories)
		.values(parsed.data)
		.returning();

	return c.json(result[0], 201);
});

// 更新
officialWorkCategoriesRouter.put("/:code", async (c) => {
	const code = c.req.param("code");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(officialWorkCategories)
		.where(eq(officialWorkCategories.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateOfficialWorkCategorySchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 更新
	const result = await db
		.update(officialWorkCategories)
		.set(parsed.data)
		.where(eq(officialWorkCategories.code, code))
		.returning();

	return c.json(result[0]);
});

// 削除
officialWorkCategoriesRouter.delete("/:code", async (c) => {
	const code = c.req.param("code");

	// 存在チェック
	const existing = await db
		.select()
		.from(officialWorkCategories)
		.where(eq(officialWorkCategories.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db
		.delete(officialWorkCategories)
		.where(eq(officialWorkCategories.code, code));

	return c.json({ success: true });
});

export { officialWorkCategoriesRouter };
