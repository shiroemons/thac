import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	insertPlatformSchema,
	like,
	max,
	or,
	platforms,
	updatePlatformSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const platformsRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、カテゴリフィルタ、検索、ソート対応）
platformsRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const category = c.req.query("category");
	const search = c.req.query("search");
	const sortBy = c.req.query("sortBy") || "code";
	const sortOrder = c.req.query("sortOrder") || "asc";

	const offset = (page - 1) * limit;

	// 条件を構築
	const conditions = [];

	if (category) {
		conditions.push(eq(platforms.category, category));
	}

	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(
			or(
				like(platforms.code, searchPattern),
				like(platforms.name, searchPattern),
			),
		);
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// ソート条件を構築
	const sortColumn =
		sortBy === "sortOrder"
			? platforms.sortOrder
			: sortBy === "category"
				? platforms.category
				: sortBy === "name"
					? platforms.name
					: platforms.code;
	const orderByClause =
		sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(platforms)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(orderByClause),
		db.select({ count: count() }).from(platforms).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
		page,
		limit,
	});
});

// 並べ替え（一括更新）
platformsRouter.put("/reorder", async (c) => {
	const body = await c.req.json();

	if (!body.items || !Array.isArray(body.items)) {
		return c.json({ error: "items array is required" }, 400);
	}

	for (const item of body.items) {
		if (!item.code || typeof item.sortOrder !== "number") {
			return c.json({ error: "Each item must have code and sortOrder" }, 400);
		}
		await db
			.update(platforms)
			.set({ sortOrder: item.sortOrder })
			.where(eq(platforms.code, item.code));
	}

	return c.json({ success: true });
});

// 個別取得
platformsRouter.get("/:code", async (c) => {
	const code = c.req.param("code");

	const result = await db
		.select()
		.from(platforms)
		.where(eq(platforms.code, code))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
platformsRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertPlatformSchema.safeParse(body);
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
		.from(platforms)
		.where(eq(platforms.code, parsed.data.code))
		.limit(1);

	if (existing.length > 0) {
		return c.json({ error: "Code already exists" }, 409);
	}

	// sortOrder が未指定の場合は最大値 + 1 を設定
	let sortOrder = parsed.data.sortOrder;
	if (sortOrder === undefined || sortOrder === null) {
		const maxResult = await db
			.select({ maxOrder: max(platforms.sortOrder) })
			.from(platforms);
		sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
	}

	// 作成
	const result = await db
		.insert(platforms)
		.values({ ...parsed.data, sortOrder })
		.returning();

	return c.json(result[0], 201);
});

// 更新
platformsRouter.put("/:code", async (c) => {
	const code = c.req.param("code");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(platforms)
		.where(eq(platforms.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updatePlatformSchema.safeParse(body);
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
		.update(platforms)
		.set(parsed.data)
		.where(eq(platforms.code, code))
		.returning();

	return c.json(result[0]);
});

// 削除
platformsRouter.delete("/:code", async (c) => {
	const code = c.req.param("code");

	// 存在チェック
	const existing = await db
		.select()
		.from(platforms)
		.where(eq(platforms.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(platforms).where(eq(platforms.code, code));

	return c.json({ success: true });
});

export { platformsRouter };
