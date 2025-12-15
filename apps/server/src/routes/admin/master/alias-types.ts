import {
	aliasTypes,
	count,
	db,
	eq,
	insertAliasTypeSchema,
	like,
	or,
	updateAliasTypeSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const aliasTypesRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、検索対応）
aliasTypesRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const whereCondition = search
		? or(
				like(aliasTypes.code, `%${search}%`),
				like(aliasTypes.label, `%${search}%`),
			)
		: undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(aliasTypes)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(aliasTypes.code),
		db.select({ count: count() }).from(aliasTypes).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
		page,
		limit,
	});
});

// 個別取得
aliasTypesRouter.get("/:code", async (c) => {
	const code = c.req.param("code");

	const result = await db
		.select()
		.from(aliasTypes)
		.where(eq(aliasTypes.code, code))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
aliasTypesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertAliasTypeSchema.safeParse(body);
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
		.from(aliasTypes)
		.where(eq(aliasTypes.code, parsed.data.code))
		.limit(1);

	if (existing.length > 0) {
		return c.json({ error: "Code already exists" }, 409);
	}

	// 作成
	const result = await db.insert(aliasTypes).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
aliasTypesRouter.put("/:code", async (c) => {
	const code = c.req.param("code");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(aliasTypes)
		.where(eq(aliasTypes.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateAliasTypeSchema.safeParse(body);
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
		.update(aliasTypes)
		.set(parsed.data)
		.where(eq(aliasTypes.code, code))
		.returning();

	return c.json(result[0]);
});

// 削除
aliasTypesRouter.delete("/:code", async (c) => {
	const code = c.req.param("code");

	// 存在チェック
	const existing = await db
		.select()
		.from(aliasTypes)
		.where(eq(aliasTypes.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(aliasTypes).where(eq(aliasTypes.code, code));

	return c.json({ success: true });
});

export { aliasTypesRouter };
