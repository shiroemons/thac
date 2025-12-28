import {
	asc,
	count,
	db,
	desc,
	eq,
	insertOfficialWorkCategorySchema,
	like,
	max,
	officialWorkCategories,
	or,
	updateOfficialWorkCategorySchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const officialWorkCategoriesRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、検索、ソート対応）
officialWorkCategoriesRouter.get("/", async (c) => {
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
					like(officialWorkCategories.code, `%${search}%`),
					like(officialWorkCategories.name, `%${search}%`),
				)
			: undefined;

		// ソート条件を構築
		const sortColumn =
			sortBy === "sortOrder"
				? officialWorkCategories.sortOrder
				: sortBy === "name"
					? officialWorkCategories.name
					: officialWorkCategories.code;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(officialWorkCategories)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db
				.select({ count: count() })
				.from(officialWorkCategories)
				.where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/official-work-categories");
	}
});

// 並べ替え（一括更新）
officialWorkCategoriesRouter.put("/reorder", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.items || !Array.isArray(body.items)) {
			return c.json({ error: ERROR_MESSAGES.ITEMS_ARRAY_REQUIRED }, 400);
		}

		for (const item of body.items) {
			if (!item.code || typeof item.sortOrder !== "number") {
				return c.json(
					{ error: ERROR_MESSAGES.ITEMS_MUST_HAVE_CODE_AND_SORT_ORDER },
					400,
				);
			}
			await db
				.update(officialWorkCategories)
				.set({ sortOrder: item.sortOrder })
				.where(eq(officialWorkCategories.code, item.code));
		}

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/official-work-categories/reorder",
		);
	}
});

// 個別取得
officialWorkCategoriesRouter.get("/:code", async (c) => {
	try {
		const code = c.req.param("code");

		const result = await db
			.select()
			.from(officialWorkCategories)
			.where(eq(officialWorkCategories.code, code))
			.limit(1);

		if (result.length === 0) {
			return c.json(
				{ error: ERROR_MESSAGES.OFFICIAL_WORK_CATEGORY_NOT_FOUND },
				404,
			);
		}

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/official-work-categories/:code");
	}
});

// 新規作成
officialWorkCategoriesRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertOfficialWorkCategorySchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
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
			return c.json({ error: ERROR_MESSAGES.CODE_ALREADY_EXISTS }, 409);
		}

		// sortOrder が未指定の場合は最大値 + 1 を設定
		let sortOrder = parsed.data.sortOrder;
		if (sortOrder === undefined || sortOrder === null) {
			const maxResult = await db
				.select({ maxOrder: max(officialWorkCategories.sortOrder) })
				.from(officialWorkCategories);
			sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
		}

		// 作成
		const result = await db
			.insert(officialWorkCategories)
			.values({ ...parsed.data, sortOrder })
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/official-work-categories");
	}
});

// 更新
officialWorkCategoriesRouter.put("/:code", async (c) => {
	try {
		const code = c.req.param("code");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorkCategories)
			.where(eq(officialWorkCategories.code, code))
			.limit(1);

		if (existing.length === 0) {
			return c.json(
				{ error: ERROR_MESSAGES.OFFICIAL_WORK_CATEGORY_NOT_FOUND },
				404,
			);
		}

		// バリデーション
		const parsed = updateOfficialWorkCategorySchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
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
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/official-work-categories/:code");
	}
});

// 削除
officialWorkCategoriesRouter.delete("/:code", async (c) => {
	try {
		const code = c.req.param("code");

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorkCategories)
			.where(eq(officialWorkCategories.code, code))
			.limit(1);

		if (existing.length === 0) {
			return c.json(
				{ error: ERROR_MESSAGES.OFFICIAL_WORK_CATEGORY_NOT_FOUND },
				404,
			);
		}

		// 削除
		await db
			.delete(officialWorkCategories)
			.where(eq(officialWorkCategories.code, code));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/official-work-categories/:code",
		);
	}
});

export { officialWorkCategoriesRouter };
