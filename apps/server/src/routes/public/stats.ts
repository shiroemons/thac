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
	eventSeries,
	events,
	inArray,
	isNotNull,
	ne,
	officialSongs,
	officialWorks,
	releaseCircles,
	releases,
	sql,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
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

		// 名義単位のユニーク識別子を生成するSQL式
		const artistAliasIdentifier = sql`CASE
			WHEN ${trackCredits.artistAliasId} IS NULL
			THEN ${trackCredits.artistId} || '__main__'
			ELSE ${trackCredits.artistAliasId}
		END`;

		const [
			eventsResult,
			circlesResult,
			artistsResult,
			tracksResult,
			originalSongsResult,
			releasesResult,
			eventSeriesResult,
			totalTracksResult,
			vocalistsResult,
			arrangersResult,
			lyricistsResult,
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
			db.select({ count: count() }).from(releases),
			// イベントシリーズ数を取得
			db
				.select({ count: count() })
				.from(eventSeries),
			// 全トラック数を取得
			db
				.select({ count: count() })
				.from(tracks),
			// ボーカリスト数を取得（名義単位でユニークカウント）
			db
				.select({ count: countDistinct(artistAliasIdentifier) })
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCredits.id, trackCreditRoles.trackCreditId),
				)
				.where(eq(trackCreditRoles.roleCode, "vocalist")),
			// アレンジャー数を取得（名義単位でユニークカウント）
			db
				.select({ count: countDistinct(artistAliasIdentifier) })
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCredits.id, trackCreditRoles.trackCreditId),
				)
				.where(eq(trackCreditRoles.roleCode, "arranger")),
			// 作詞者数を取得（名義単位でユニークカウント）
			db
				.select({ count: countDistinct(artistAliasIdentifier) })
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCredits.id, trackCreditRoles.trackCreditId),
				)
				.where(eq(trackCreditRoles.roleCode, "lyricist")),
		]);

		const response = {
			events: eventsResult[0]?.count ?? 0,
			circles: circlesResult[0]?.count ?? 0,
			artists: artistsResult[0]?.count ?? 0,
			tracks: tracksResult[0]?.count ?? 0,
			originalSongs: originalSongsResult[0]?.count ?? 0,
			releases: releasesResult[0]?.count ?? 0,
			eventSeries: eventSeriesResult[0]?.count ?? 0,
			totalTracks: totalTracksResult[0]?.count ?? 0,
			vocalists: vocalistsResult[0]?.count ?? 0,
			arrangers: arrangersResult[0]?.count ?? 0,
			lyricists: lyricistsResult[0]?.count ?? 0,
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

				// アクティブサークル: release_circlesをcircle_idでグループ化し、作品数で降順ソート
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

				// アクティブアーティスト（名義単位）: track_creditsを名義単位でグループ化し、トラック数で降順ソート
				// artistAliasIdがnullの場合はメイン名義、存在する場合は別名義として扱う
				db
					.select({
						id: sql<string>`CASE
							WHEN ${trackCredits.artistAliasId} IS NULL
							THEN ${trackCredits.artistId} || '__main__'
							ELSE ${trackCredits.artistAliasId}
						END`,
						name: sql<string>`CASE
							WHEN ${trackCredits.artistAliasId} IS NULL
							THEN ${artists.name}
							ELSE ${artistAliases.name}
						END`,
						count: countDistinct(trackCredits.trackId),
					})
					.from(trackCredits)
					.innerJoin(artists, eq(trackCredits.artistId, artists.id))
					.leftJoin(
						artistAliases,
						eq(trackCredits.artistAliasId, artistAliases.id),
					)
					.groupBy(
						sql`CASE
							WHEN ${trackCredits.artistAliasId} IS NULL
							THEN ${trackCredits.artistId} || '__main__'
							ELSE ${trackCredits.artistAliasId}
						END`,
						sql`CASE
							WHEN ${trackCredits.artistAliasId} IS NULL
							THEN ${artists.name}
							ELSE ${artistAliases.name}
						END`,
					)
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
				id: row.id, // クエリで既に正しいID形式（メイン名義: {artistId}__main__、別名義: artistAliasId）
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
 * GET /api/public/stats/rankings/original-songs
 * 原曲アレンジ数ランキング（ページネーション対応）
 */
statsRouter.get("/rankings/original-songs", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Number(c.req.query("limit")) || 20;
		const offset = (page - 1) * limit;

		const cacheKey = cacheKeys.originalSongsRanking({ page, limit });

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });
			return c.json(cached);
		}

		// 総件数を取得（「その他」を除外）
		const totalResult = await db
			.select({ count: count() })
			.from(officialSongs)
			.innerJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.where(ne(officialWorks.id, "0799"));

		const total = totalResult[0]?.count ?? 0;

		// アレンジ数でソートしたランキングを取得
		const rankingResult = await db
			.select({
				id: officialSongs.id,
				name: officialSongs.name,
				workId: officialSongs.officialWorkId,
				workName: officialWorks.name,
				count: count(trackOfficialSongs.trackId),
			})
			.from(officialSongs)
			.innerJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.leftJoin(
				trackOfficialSongs,
				eq(officialSongs.id, trackOfficialSongs.officialSongId),
			)
			.where(ne(officialWorks.id, "0799"))
			.groupBy(officialSongs.id, officialWorks.id)
			.orderBy(desc(count(trackOfficialSongs.trackId)))
			.limit(limit)
			.offset(offset);

		const response = {
			data: rankingResult.map((row) => ({
				id: row.id,
				name: row.name,
				workId: row.workId,
				workName: row.workName,
				count: row.count,
			})),
			total,
			page,
			limit,
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RANKINGS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });

		return c.json(response);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"GET /api/public/stats/rankings/original-songs",
		);
	}
});

/**
 * GET /api/public/stats/rankings/circles
 * サークル作品数ランキング（ページネーション対応）
 */
statsRouter.get("/rankings/circles", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Number(c.req.query("limit")) || 20;
		const offset = (page - 1) * limit;

		const cacheKey = cacheKeys.circlesRanking({ page, limit });

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });
			return c.json(cached);
		}

		// 総件数を取得
		const totalResult = await db.select({ count: count() }).from(circles);

		const total = totalResult[0]?.count ?? 0;

		// 作品数でソートしたランキングを取得
		const rankingResult = await db
			.select({
				id: circles.id,
				name: circles.name,
				count: countDistinct(releaseCircles.releaseId),
			})
			.from(circles)
			.leftJoin(releaseCircles, eq(circles.id, releaseCircles.circleId))
			.groupBy(circles.id)
			.orderBy(desc(countDistinct(releaseCircles.releaseId)))
			.limit(limit)
			.offset(offset);

		const response = {
			data: rankingResult.map((row) => ({
				id: row.id,
				name: row.name,
				count: row.count,
			})),
			total,
			page,
			limit,
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RANKINGS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats/rankings/circles");
	}
});

/**
 * GET /api/public/stats/rankings/artists
 * アーティスト楽曲数ランキング（ページネーション対応）
 */
statsRouter.get("/rankings/artists", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Number(c.req.query("limit")) || 20;
		const offset = (page - 1) * limit;

		const cacheKey = cacheKeys.artistsRanking({ page, limit });

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });
			return c.json(cached);
		}

		// 総件数を取得（名義単位でカウント）
		const totalResult = await db
			.select({
				count: countDistinct(
					sql`CASE
						WHEN ${trackCredits.artistAliasId} IS NULL
						THEN ${trackCredits.artistId} || '__main__'
						ELSE ${trackCredits.artistAliasId}
					END`,
				),
			})
			.from(trackCredits);

		const total = totalResult[0]?.count ?? 0;

		// 楽曲数でソートしたランキングを取得（名義単位）
		const rankingResult = await db
			.select({
				id: sql<string>`CASE
					WHEN ${trackCredits.artistAliasId} IS NULL
					THEN ${trackCredits.artistId} || '__main__'
					ELSE ${trackCredits.artistAliasId}
				END`,
				name: sql<string>`CASE
					WHEN ${trackCredits.artistAliasId} IS NULL
					THEN ${artists.name}
					ELSE ${artistAliases.name}
				END`,
				artistId: trackCredits.artistId,
				count: countDistinct(trackCredits.trackId),
			})
			.from(trackCredits)
			.innerJoin(artists, eq(trackCredits.artistId, artists.id))
			.leftJoin(artistAliases, eq(trackCredits.artistAliasId, artistAliases.id))
			.groupBy(
				sql`CASE
					WHEN ${trackCredits.artistAliasId} IS NULL
					THEN ${trackCredits.artistId} || '__main__'
					ELSE ${trackCredits.artistAliasId}
				END`,
				sql`CASE
					WHEN ${trackCredits.artistAliasId} IS NULL
					THEN ${artists.name}
					ELSE ${artistAliases.name}
				END`,
				trackCredits.artistId,
			)
			.orderBy(desc(countDistinct(trackCredits.trackId)))
			.limit(limit)
			.offset(offset);

		const response = {
			data: rankingResult.map((row) => ({
				id: row.id,
				name: row.name,
				artistId: row.artistId,
				count: row.count,
			})),
			total,
			page,
			limit,
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RANKINGS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats/rankings/artists");
	}
});

/**
 * GET /api/public/stats/rankings/song-pairs
 * 原曲2曲組み合わせランキング（ページネーション対応）
 * ちょうど2曲の原曲を持つトラックのペアをカウント
 */
statsRouter.get("/rankings/song-pairs", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Number(c.req.query("limit")) || 20;
		const offset = (page - 1) * limit;

		const cacheKey = cacheKeys.songPairsRanking({ page, limit });

		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });
			return c.json(cached);
		}

		// ちょうど2曲の原曲を持つトラックIDを取得するサブクエリ
		const twoSongTracksSubquery = db
			.select({ trackId: trackOfficialSongs.trackId })
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
			)
			.groupBy(trackOfficialSongs.trackId)
			.having(sql`COUNT(DISTINCT ${trackOfficialSongs.officialSongId}) = 2`)
			.as("two_song_tracks");

		// 総ペア数を取得（ユニークペアの数）
		// 「その他」(0799)を両方の曲で除外
		const totalPairsResult = await db
			.select({
				count: countDistinct(
					sql`MIN(${trackOfficialSongs.officialSongId}, t2.official_song_id) || '|' || MAX(${trackOfficialSongs.officialSongId}, t2.official_song_id)`,
				),
			})
			.from(trackOfficialSongs)
			.innerJoin(
				officialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.innerJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.innerJoin(
				sql`${trackOfficialSongs} AS t2`,
				sql`${trackOfficialSongs.trackId} = t2.track_id AND ${trackOfficialSongs.officialSongId} < t2.official_song_id`,
			)
			.innerJoin(
				sql`${officialSongs} AS os2`,
				sql`t2.official_song_id = os2.id`,
			)
			.innerJoin(
				sql`${officialWorks} AS ow2`,
				sql`os2.official_work_id = ow2.id`,
			)
			.innerJoin(
				twoSongTracksSubquery,
				eq(trackOfficialSongs.trackId, twoSongTracksSubquery.trackId),
			)
			.where(and(ne(officialWorks.id, "0799"), sql`ow2.id != '0799'`));

		const total = totalPairsResult[0]?.count ?? 0;

		// ペアごとのカウントを取得してランキング
		// 「その他」(0799)を両方の曲で除外
		const rankingResult = await db
			.select({
				song1Id: sql<string>`MIN(${trackOfficialSongs.officialSongId}, t2.official_song_id)`,
				song2Id: sql<string>`MAX(${trackOfficialSongs.officialSongId}, t2.official_song_id)`,
				count: count(),
			})
			.from(trackOfficialSongs)
			.innerJoin(
				officialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.innerJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.innerJoin(
				sql`${trackOfficialSongs} AS t2`,
				sql`${trackOfficialSongs.trackId} = t2.track_id AND ${trackOfficialSongs.officialSongId} < t2.official_song_id`,
			)
			.innerJoin(
				sql`${officialSongs} AS os2`,
				sql`t2.official_song_id = os2.id`,
			)
			.innerJoin(
				sql`${officialWorks} AS ow2`,
				sql`os2.official_work_id = ow2.id`,
			)
			.innerJoin(
				twoSongTracksSubquery,
				eq(trackOfficialSongs.trackId, twoSongTracksSubquery.trackId),
			)
			.where(and(ne(officialWorks.id, "0799"), sql`ow2.id != '0799'`))
			.groupBy(
				sql`MIN(${trackOfficialSongs.officialSongId}, t2.official_song_id)`,
				sql`MAX(${trackOfficialSongs.officialSongId}, t2.official_song_id)`,
			)
			.orderBy(desc(count()))
			.limit(limit)
			.offset(offset);

		// 原曲名を取得するために、必要なIDを収集
		const songIds = new Set<string>();
		for (const row of rankingResult) {
			songIds.add(row.song1Id);
			songIds.add(row.song2Id);
		}

		// 原曲名を一括取得
		const songNames = new Map<string, string>();
		if (songIds.size > 0) {
			const songsResult = await db
				.select({
					id: officialSongs.id,
					name: officialSongs.name,
				})
				.from(officialSongs)
				.where(
					sql`${officialSongs.id} IN (${sql.join(
						[...songIds].map((id) => sql`${id}`),
						sql`, `,
					)})`,
				);

			for (const song of songsResult) {
				songNames.set(song.id, song.name);
			}
		}

		const response = {
			data: rankingResult.map((row) => ({
				song1Id: row.song1Id,
				song1Name: songNames.get(row.song1Id) ?? "",
				song2Id: row.song2Id,
				song2Name: songNames.get(row.song2Id) ?? "",
				count: row.count,
			})),
			total,
			page,
			limit,
		};

		setCache(cacheKey, response, CACHE_TTL.STATS_RANKINGS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RANKINGS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/stats/rankings/song-pairs");
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

		// Step 1: 最新の10リリースIDを取得（重複なし）
		const recentReleaseIds = await db
			.select({
				id: releases.id,
			})
			.from(releases)
			.orderBy(desc(releases.updatedAt))
			.limit(10);

		if (recentReleaseIds.length === 0) {
			const response = { data: [] };
			setCache(cacheKey, response, CACHE_TTL.STATS_RECENT_UPDATES);
			setCacheHeaders(c, { maxAge: CACHE_TTL.STATS_RECENT_UPDATES });
			return c.json(response);
		}

		const ids = recentReleaseIds.map((r) => r.id);

		// Step 2: リリース詳細とサークル情報を取得
		const [releasesData, circlesData] = await Promise.all([
			db
				.select({
					id: releases.id,
					title: releases.name,
					createdAt: releases.createdAt,
					updatedAt: releases.updatedAt,
				})
				.from(releases)
				.where(inArray(releases.id, ids))
				.orderBy(desc(releases.updatedAt)),
			db
				.select({
					releaseId: releaseCircles.releaseId,
					circleId: circles.id,
					circleName: circles.name,
				})
				.from(releaseCircles)
				.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
				.where(inArray(releaseCircles.releaseId, ids)),
		]);

		// Step 3: サークルをリリースIDでグルーピング
		const circlesByRelease = new Map<
			string,
			Array<{ id: string; name: string }>
		>();
		for (const c of circlesData) {
			const existing = circlesByRelease.get(c.releaseId) ?? [];
			if (!circlesByRelease.has(c.releaseId)) {
				circlesByRelease.set(c.releaseId, existing);
			}
			existing.push({ id: c.circleId, name: c.circleName });
		}

		const response = {
			data: releasesData.map((row) => ({
				id: row.id,
				title: row.title,
				circles: circlesByRelease.get(row.id) ?? [],
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
