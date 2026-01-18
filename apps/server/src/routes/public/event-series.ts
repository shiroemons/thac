import { asc, db, eventSeries } from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	CACHE_TTL,
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const eventSeriesRouter = new Hono();

/**
 * GET /api/public/event-series
 * イベントシリーズ一覧を取得（sortOrderでソート）
 */
eventSeriesRouter.get("/", async (c) => {
	try {
		const cacheKey = cacheKeys.eventSeriesList();

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_SERIES_LIST });
			return c.json(cached);
		}

		// 全イベントシリーズを取得（sortOrderでソート）
		const data = await db
			.select({
				id: eventSeries.id,
				name: eventSeries.name,
				sortOrder: eventSeries.sortOrder,
			})
			.from(eventSeries)
			.orderBy(asc(eventSeries.sortOrder));

		const response = { data };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.EVENT_SERIES_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_SERIES_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/event-series");
	}
});

export { eventSeriesRouter };
