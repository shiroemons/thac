import { asc, db, officialWorkCategories } from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	CACHE_TTL,
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const categoriesRouter = new Hono();

/**
 * GET /api/public/official-work-categories
 * カテゴリマスタ一覧を取得
 */
categoriesRouter.get("/", async (c) => {
	try {
		const cacheKey = cacheKeys.categories();

		// キャッシュチェック
		const cached = getCache<{ data: unknown[] }>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CATEGORIES });
			return c.json(cached);
		}

		// データ取得
		const data = await db
			.select({
				code: officialWorkCategories.code,
				name: officialWorkCategories.name,
				description: officialWorkCategories.description,
				sortOrder: officialWorkCategories.sortOrder,
			})
			.from(officialWorkCategories)
			.orderBy(asc(officialWorkCategories.sortOrder));

		const response = { data };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.CATEGORIES);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CATEGORIES });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/official-work-categories");
	}
});

export { categoriesRouter };
