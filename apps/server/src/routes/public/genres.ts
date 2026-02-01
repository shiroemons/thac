import { asc, db, genres } from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	CACHE_TTL,
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const genresRouter = new Hono();

/**
 * GET /api/public/genres
 * ジャンルマスタ一覧を取得
 */
genresRouter.get("/", async (c) => {
	try {
		const cacheKey = cacheKeys.genres();

		// キャッシュチェック
		const cached = getCache<{ data: unknown[] }>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.GENRES });
			return c.json(cached);
		}

		// データ取得
		const data = await db
			.select({
				code: genres.code,
				nameJa: genres.nameJa,
				nameEn: genres.nameEn,
				color: genres.color,
				icon: genres.icon,
				description: genres.description,
			})
			.from(genres)
			.orderBy(asc(genres.sortOrder));

		const response = { data };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.GENRES);
		setCacheHeaders(c, { maxAge: CACHE_TTL.GENRES });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/genres");
	}
});

export { genresRouter };
