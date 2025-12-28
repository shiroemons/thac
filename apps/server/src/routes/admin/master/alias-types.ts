import {
	aliasTypes,
	asc,
	count,
	db,
	desc,
	eq,
	insertAliasTypeSchema,
	like,
	max,
	or,
	updateAliasTypeSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const aliasTypesRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、検索、ソート対応）
aliasTypesRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "sortOrder";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const offset = (page - 1) * limit;

		// 条件を構築
		const whereCondition = search
			? or(
					like(aliasTypes.code, `%${search}%`),
					like(aliasTypes.label, `%${search}%`),
				)
			: undefined;

		// ソート条件を構築
		const sortColumn =
			sortBy === "sortOrder"
				? aliasTypes.sortOrder
				: sortBy === "label"
					? aliasTypes.label
					: aliasTypes.code;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(aliasTypes)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db.select({ count: count() }).from(aliasTypes).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/master/alias-types");
	}
});

// 並べ替え（一括更新）
aliasTypesRouter.put("/reorder", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.items || !Array.isArray(body.items)) {
			return c.json({ error: "items array is required" }, 400);
		}

		for (const item of body.items) {
			if (!item.code || typeof item.sortOrder !== "number") {
				return c.json({ error: "Each item must have code and sortOrder" }, 400);
			}
			await db
				.update(aliasTypes)
				.set({ sortOrder: item.sortOrder })
				.where(eq(aliasTypes.code, item.code));
		}

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/master/alias-types/reorder");
	}
});

// 個別取得
aliasTypesRouter.get("/:code", async (c) => {
	try {
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
	} catch (error) {
		return handleDbError(c, error, "GET /admin/master/alias-types/:code");
	}
});

// 新規作成
aliasTypesRouter.post("/", async (c) => {
	try {
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

		// sortOrder が未指定の場合は最大値 + 1 を設定
		let sortOrder = parsed.data.sortOrder;
		if (sortOrder === undefined || sortOrder === null) {
			const maxResult = await db
				.select({ maxOrder: max(aliasTypes.sortOrder) })
				.from(aliasTypes);
			sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
		}

		// 作成
		const result = await db
			.insert(aliasTypes)
			.values({ ...parsed.data, sortOrder })
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/master/alias-types");
	}
});

// 更新
aliasTypesRouter.put("/:code", async (c) => {
	try {
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
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/master/alias-types/:code");
	}
});

// 削除
aliasTypesRouter.delete("/:code", async (c) => {
	try {
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
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/master/alias-types/:code");
	}
});

export { aliasTypesRouter };
