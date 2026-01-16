import {
	and,
	artistAliases,
	artists,
	circles,
	count,
	countDistinct,
	db,
	desc,
	eq,
	events,
	isNotNull,
	ne,
	officialSongs,
	officialWorks,
	releaseCircles,
	releases,
	trackCredits,
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

		const [
			eventsResult,
			circlesResult,
			artistsResult,
			tracksResult,
			originalSongsResult,
		] = await Promise.all([
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
			// 原曲の数を取得
			db
				.select({ count: count() })
				.from(officialSongs),
		]);

		const response = {
			events: eventsResult[0]?.count ?? 0,
			circles: circlesResult[0]?.count ?? 0,
			artists: artistsResult[0]?.count ?? 0,
			tracks: tracksResult[0]?.count ?? 0,
			originalSongs: originalSongsResult[0]?.count ?? 0,
		};

		setCache(cacheKey, response, CACHE_TTL.PUBLIC_STATS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.PUBLIC_STATS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats");
	}
});

/**
 * GET /api/public/stats/rankings
 * ランキング情報を取得（人気楽曲、アクティブサークル、アクティブアーティスト）
 */
statsRouter.get("/rankings", async (c) => {
	try {
		const cacheKey = cacheKeys.publicStatsRankings();

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });
			return c.json(cached);
		}

		const [popularSongsResult, activeCirclesResult, activeArtistsResult] =
			await Promise.all([
				// 人気楽曲: track_official_songsをofficial_song_idでグループ化し、カウントで降順ソート
				// officialWorkId "0799"（その他）を除外
				db
					.select({
						id: officialSongs.id,
						name: officialSongs.name,
						count: count(trackOfficialSongs.trackId),
					})
					.from(trackOfficialSongs)
					.innerJoin(
						officialSongs,
						eq(trackOfficialSongs.officialSongId, officialSongs.id),
					)
					.where(
						and(
							isNotNull(trackOfficialSongs.officialSongId),
							isNotNull(officialSongs.officialWorkId),
							ne(officialSongs.officialWorkId, "0799"),
						),
					)
					.groupBy(officialSongs.id)
					.orderBy(desc(count(trackOfficialSongs.trackId)))
					.limit(5),

				// アクティブサークル: release_circlesをcircle_idでグループ化し、リリース数で降順ソート
				db
					.select({
						id: circles.id,
						name: circles.name,
						count: countDistinct(releaseCircles.releaseId),
					})
					.from(releaseCircles)
					.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
					.groupBy(circles.id)
					.orderBy(desc(countDistinct(releaseCircles.releaseId)))
					.limit(5),

				// アクティブアーティスト: track_creditsをartist_idでグループ化し、トラック数で降順ソート
				db
					.select({
						id: artists.id,
						name: artists.name,
						count: countDistinct(trackCredits.trackId),
					})
					.from(trackCredits)
					.innerJoin(artists, eq(trackCredits.artistId, artists.id))
					.groupBy(artists.id)
					.orderBy(desc(countDistinct(trackCredits.trackId)))
					.limit(5),
			]);

		const response = {
			popularSongs: popularSongsResult.map((row) => ({
				id: row.id,
				name: row.name,
				count: row.count,
			})),
			activeCircles: activeCirclesResult.map((row) => ({
				id: row.id,
				name: row.name,
				count: row.count,
			})),
			activeArtists: activeArtistsResult.map((row) => ({
				id: row.id,
				name: row.name,
				count: row.count,
			})),
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RANKINGS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats/rankings");
	}
});

/**
 * GET /api/public/stats/recent-updates
 * 最近の更新情報を取得
 */
statsRouter.get("/recent-updates", async (c) => {
	try {
		const cacheKey = cacheKeys.publicStatsRecentUpdates();

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RECENT_UPDATES });
			return c.json(cached);
		}

		// 最新のリリースを取得し、サークル情報をJOIN
		const recentReleasesResult = await db
			.select({
				id: releases.id,
				title: releases.name,
				circleName: circles.name,
				circleId: circles.id,
				createdAt: releases.createdAt,
				updatedAt: releases.updatedAt,
			})
			.from(releases)
			.leftJoin(releaseCircles, eq(releases.id, releaseCircles.releaseId))
			.leftJoin(circles, eq(releaseCircles.circleId, circles.id))
			.orderBy(desc(releases.updatedAt))
			.limit(10);

		const response = {
			data: recentReleasesResult.map((row) => ({
				id: row.id,
				title: row.title,
				circleName: row.circleName,
				circleId: row.circleId,
				date: row.updatedAt?.toISOString() ?? null,
				type:
					row.createdAt?.getTime() === row.updatedAt?.getTime()
						? "new"
						: "update",
			})),
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RECENT_UPDATES);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RECENT_UPDATES });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats/recent-updates");
	}
});

export { statsRouter };
