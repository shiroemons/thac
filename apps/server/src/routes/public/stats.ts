import {
	and,
	artistAliases,
	circles,
	count,
	countDistinct,
	db,
	eq,
	events,
	isNotNull,
	ne,
	officialSongs,
	officialWorks,
	trackOfficialSongs,
} from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	CACHE_TTL,
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const statsRouter = new Hono();

/**
 * GET /api/public/stats
 * 公開統計情報を取得
 */
statsRouter.get("/", async (c) => {
	try {
		const cacheKey = cacheKeys.publicStats();

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.PUBLIC_STATS });
			return c.json(cached);
		}

		const [eventsResult, circlesResult, artistsResult, tracksResult] =
			await Promise.all([
				db.select({ count: count() }).from(events),
				db.select({ count: count() }).from(circles),
				db.select({ count: count() }).from(artistAliases),
				// 東方原曲に紐付くトラックのみをカウント
				// - officialSongIdがNOT NULL
				// - officialWorks.idが「0799」（その他）でない
				db
					.select({ count: countDistinct(trackOfficialSongs.trackId) })
					.from(trackOfficialSongs)
					.innerJoin(
						officialSongs,
						eq(trackOfficialSongs.officialSongId, officialSongs.id),
					)
					.innerJoin(
						officialWorks,
						eq(officialSongs.officialWorkId, officialWorks.id),
					)
					.where(
						and(
							isNotNull(trackOfficialSongs.officialSongId),
							ne(officialWorks.id, "0799"),
						),
					),
			]);

		const response = {
			events: eventsResult[0]?.count ?? 0,
			circles: circlesResult[0]?.count ?? 0,
			artists: artistsResult[0]?.count ?? 0,
			tracks: tracksResult[0]?.count ?? 0,
		};

		setCache(cacheKey, response, CACHE_TTL.PUBLIC_STATS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.PUBLIC_STATS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats");
	}
});

export { statsRouter };
