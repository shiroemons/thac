import {
	and,
	artists,
	asc,
	circles,
	count,
	countDistinct,
	creditRoles,
	db,
	desc,
	eq,
	gt,
	inArray,
	like,
	lt,
	officialSongLinks,
	officialSongs,
	officialWorkCategories,
	officialWorks,
	or,
	platforms,
	releaseCircles,
	releases,
	sql,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import { handleDbError } from "../../utils/api-error";
import {
	CACHE_TTL,
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const originalSongsRouter = new Hono();

/**
 * GET /api/public/original-songs
 * 原曲一覧を取得（ページネーション、原作フィルタ、カテゴリフィルタ、検索対応）
 */
originalSongsRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const workId = c.req.query("workId");
		const category = c.req.query("category");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "id";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const cacheKey = cacheKeys.songsList({
			page,
			limit,
			workId,
			category,
			search,
		});

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.SONGS_LIST });
			return c.json(cached);
		}

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (workId) {
			conditions.push(eq(officialSongs.officialWorkId, workId));
		}

		if (category) {
			conditions.push(eq(officialWorks.categoryCode, category));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(officialSongs.name, searchPattern),
					like(officialSongs.nameJa, searchPattern),
					like(officialSongs.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// ソートカラムを決定
		const sortColumnMap = {
			id: officialSongs.id,
			nameJa: officialSongs.nameJa,
			trackNumber: officialSongs.trackNumber,
		} as const;
		const sortColumn =
			sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? officialSongs.id;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// カウントをサブクエリでJOIN（相関サブクエリを回避）
		const arrangeCountSq = db
			.select({
				songId: trackOfficialSongs.officialSongId,
				count: countDistinct(trackOfficialSongs.trackId).as("arrangeCount"),
			})
			.from(trackOfficialSongs)
			.groupBy(trackOfficialSongs.officialSongId)
			.as("arrangeCountSq");

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: officialSongs.id,
					officialWorkId: officialSongs.officialWorkId,
					workName: officialWorks.nameJa,
					workCategoryCode: officialWorks.categoryCode,
					workCategoryName: officialWorkCategories.name,
					trackNumber: officialSongs.trackNumber,
					name: officialSongs.name,
					nameJa: officialSongs.nameJa,
					nameEn: officialSongs.nameEn,
					composerName: officialSongs.composerName,
					arrangerName: officialSongs.arrangerName,
					isOriginal: officialSongs.isOriginal,
					arrangeCount: sql<number>`COALESCE(${arrangeCountSq.count}, 0)`,
				})
				.from(officialSongs)
				.leftJoin(
					officialWorks,
					eq(officialSongs.officialWorkId, officialWorks.id),
				)
				.leftJoin(
					officialWorkCategories,
					eq(officialWorks.categoryCode, officialWorkCategories.code),
				)
				.leftJoin(arrangeCountSq, eq(officialSongs.id, arrangeCountSq.songId))
				.where(whereCondition)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(officialSongs)
				.leftJoin(
					officialWorks,
					eq(officialSongs.officialWorkId, officialWorks.id),
				)
				.where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		const response = {
			data,
			total,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.SONGS_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.SONGS_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/original-songs");
	}
});

/**
 * GET /api/public/original-songs/:id
 * 原曲詳細を取得（統計情報、前後曲ナビ含む）
 */
originalSongsRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.songDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.SONG_DETAIL });
			return c.json(cached);
		}

		// 原曲基本情報を取得
		const songResult = await db
			.select({
				id: officialSongs.id,
				officialWorkId: officialSongs.officialWorkId,
				trackNumber: officialSongs.trackNumber,
				name: officialSongs.name,
				nameJa: officialSongs.nameJa,
				nameEn: officialSongs.nameEn,
				composerName: officialSongs.composerName,
				arrangerName: officialSongs.arrangerName,
				isOriginal: officialSongs.isOriginal,
				sourceSongId: officialSongs.sourceSongId,
				notes: officialSongs.notes,
			})
			.from(officialSongs)
			.where(eq(officialSongs.id, id))
			.limit(1);

		if (songResult.length === 0 || !songResult[0]) {
			return c.json({ error: ERROR_MESSAGES.SONG_NOT_FOUND }, 404);
		}

		const song = songResult[0];

		// 関連データを並列取得
		const [workData, linksData, statsData, sourceSongData, prevNextData] =
			await Promise.all([
				// 原作情報
				song.officialWorkId
					? db
							.select({
								id: officialWorks.id,
								name: officialWorks.name,
								shortNameJa: officialWorks.shortNameJa,
								categoryCode: officialWorks.categoryCode,
								categoryName: officialWorkCategories.name,
							})
							.from(officialWorks)
							.leftJoin(
								officialWorkCategories,
								eq(officialWorks.categoryCode, officialWorkCategories.code),
							)
							.where(eq(officialWorks.id, song.officialWorkId))
							.limit(1)
					: Promise.resolve([]),

				// 外部リンク
				db
					.select({
						platformCode: officialSongLinks.platformCode,
						platformName: platforms.name,
						url: officialSongLinks.url,
					})
					.from(officialSongLinks)
					.leftJoin(
						platforms,
						eq(officialSongLinks.platformCode, platforms.code),
					)
					.where(eq(officialSongLinks.officialSongId, id))
					.orderBy(asc(officialSongLinks.sortOrder)),

				// 統計情報（arrangeCount, circleCount, artistCount）を1クエリで
				db
					.select({
						arrangeCount: countDistinct(trackOfficialSongs.trackId),
						circleCount: countDistinct(releaseCircles.circleId),
						artistCount: countDistinct(trackCredits.artistId),
					})
					.from(trackOfficialSongs)
					.innerJoin(tracks, eq(trackOfficialSongs.trackId, tracks.id))
					.leftJoin(releases, eq(tracks.releaseId, releases.id))
					.leftJoin(releaseCircles, eq(releaseCircles.releaseId, releases.id))
					.leftJoin(trackCredits, eq(trackCredits.trackId, tracks.id))
					.where(eq(trackOfficialSongs.officialSongId, id)),

				// ソース曲名
				song.sourceSongId
					? db
							.select({ name: officialSongs.nameJa })
							.from(officialSongs)
							.where(eq(officialSongs.id, song.sourceSongId))
							.limit(1)
					: Promise.resolve([]),

				// 前後曲ナビ
				song.officialWorkId && song.trackNumber
					? Promise.all([
							// 前の曲
							db
								.select({
									id: officialSongs.id,
									name: officialSongs.nameJa,
								})
								.from(officialSongs)
								.where(
									and(
										eq(officialSongs.officialWorkId, song.officialWorkId),
										lt(officialSongs.trackNumber, song.trackNumber),
									),
								)
								.orderBy(desc(officialSongs.trackNumber))
								.limit(1),
							// 次の曲
							db
								.select({
									id: officialSongs.id,
									name: officialSongs.nameJa,
								})
								.from(officialSongs)
								.where(
									and(
										eq(officialSongs.officialWorkId, song.officialWorkId),
										gt(officialSongs.trackNumber, song.trackNumber),
									),
								)
								.orderBy(asc(officialSongs.trackNumber))
								.limit(1),
						])
					: Promise.resolve([[], []]),
			]);

		const work = workData[0] ?? null;
		const stats = statsData[0] ?? {
			arrangeCount: 0,
			circleCount: 0,
			artistCount: 0,
		};
		const sourceSongName = sourceSongData[0]?.name ?? null;
		const [prevSongData, nextSongData] = prevNextData;
		const prevSong = prevSongData[0] ?? { id: null, name: null };
		const nextSong = nextSongData[0] ?? { id: null, name: null };

		const response = {
			...song,
			sourceSongName,
			work,
			links: linksData,
			arrangeCount: stats.arrangeCount,
			circleCount: stats.circleCount,
			artistCount: stats.artistCount,
			prevSong,
			nextSong,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.SONG_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.SONG_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/original-songs/:id");
	}
});

/**
 * GET /api/public/original-songs/:id/tracks
 * 原曲のアレンジトラック一覧を取得（バッチフェッチでN+1回避）
 */
originalSongsRouter.get("/:id/tracks", async (c) => {
	try {
		const songId = c.req.param("id");
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const sortBy = c.req.query("sortBy") || "releaseDate";
		const sortOrder = c.req.query("sortOrder") || "desc";

		const cacheKey = cacheKeys.tracksList({ songId, page, limit });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.TRACKS_LIST });
			return c.json(cached);
		}

		// 原曲存在チェック
		const songExists = await db
			.select({ id: officialSongs.id })
			.from(officialSongs)
			.where(eq(officialSongs.id, songId))
			.limit(1);

		if (songExists.length === 0) {
			return c.json({ error: ERROR_MESSAGES.SONG_NOT_FOUND }, 404);
		}

		const offset = (page - 1) * limit;

		// ソート条件を構築
		const orderByClause =
			sortBy === "trackName"
				? sortOrder === "desc"
					? desc(tracks.name)
					: asc(tracks.name)
				: sortOrder === "desc"
					? desc(releases.releaseDate)
					: asc(releases.releaseDate);

		// Step 1: トラック基本情報を取得
		const [tracksData, totalResult] = await Promise.all([
			db
				.select({
					trackId: tracks.id,
					trackName: tracks.name,
					releaseId: releases.id,
					releaseName: releases.name,
					releaseDate: releases.releaseDate,
				})
				.from(trackOfficialSongs)
				.innerJoin(tracks, eq(trackOfficialSongs.trackId, tracks.id))
				.leftJoin(releases, eq(tracks.releaseId, releases.id))
				.where(eq(trackOfficialSongs.officialSongId, songId))
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset),
			db
				.select({ count: countDistinct(trackOfficialSongs.trackId) })
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.officialSongId, songId)),
		]);

		const total = totalResult[0]?.count ?? 0;

		if (tracksData.length === 0) {
			const response = { data: [], total, page, limit };
			setCache(cacheKey, response, CACHE_TTL.TRACKS_LIST);
			setCacheHeaders(c, { maxAge: CACHE_TTL.TRACKS_LIST });
			return c.json(response);
		}

		// Step 2: バッチフェッチ用のIDリストを作成
		const trackIds = tracksData.map((t) => t.trackId);
		const releaseIds = [
			...new Set(
				tracksData.map((t) => t.releaseId).filter((id): id is string => !!id),
			),
		];

		// Step 3: 関連データをバッチ取得（N+1回避）
		const [circlesData, creditsData] = await Promise.all([
			// サークル情報を一括取得
			releaseIds.length > 0
				? db
						.select({
							releaseId: releaseCircles.releaseId,
							circleId: circles.id,
							circleName: circles.name,
						})
						.from(releaseCircles)
						.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
						.where(inArray(releaseCircles.releaseId, releaseIds))
				: Promise.resolve([]),

			// クレジット情報を一括取得（ロール含む）
			db
				.select({
					trackId: trackCredits.trackId,
					artistId: artists.id,
					creditName: trackCredits.creditName,
					roleCode: trackCreditRoles.roleCode,
					roleName: creditRoles.label,
				})
				.from(trackCredits)
				.innerJoin(artists, eq(trackCredits.artistId, artists.id))
				.leftJoin(
					trackCreditRoles,
					eq(trackCreditRoles.trackCreditId, trackCredits.id),
				)
				.leftJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(inArray(trackCredits.trackId, trackIds)),
		]);

		// Step 4: メモリ上でマージ
		// サークルをリリースIDでグルーピング
		const circlesByRelease = new Map<
			string,
			Array<{ id: string; name: string }>
		>();
		for (const c of circlesData) {
			const key = c.releaseId;
			const existing = circlesByRelease.get(key) ?? [];
			if (!circlesByRelease.has(key)) {
				circlesByRelease.set(key, existing);
			}
			// 重複を避ける
			if (!existing.some((e) => e.id === c.circleId)) {
				existing.push({ id: c.circleId, name: c.circleName });
			}
		}

		// クレジットをトラックIDでグルーピング（ロールをまとめる）
		const creditsByTrack = new Map<
			string,
			Array<{ id: string; creditName: string; roles: string[] }>
		>();
		for (const cr of creditsData) {
			const key = cr.trackId;
			const existing = creditsByTrack.get(key) ?? [];
			if (!creditsByTrack.has(key)) {
				creditsByTrack.set(key, existing);
			}
			const artist = existing.find((a) => a.id === cr.artistId);
			if (artist) {
				if (cr.roleName && !artist.roles.includes(cr.roleName)) {
					artist.roles.push(cr.roleName);
				}
			} else {
				existing.push({
					id: cr.artistId,
					creditName: cr.creditName,
					roles: cr.roleName ? [cr.roleName] : [],
				});
			}
		}

		// 最終結果を構築
		const data = tracksData.map((track) => ({
			trackId: track.trackId,
			trackName: track.trackName,
			release: {
				id: track.releaseId,
				name: track.releaseName,
				releaseDate: track.releaseDate,
			},
			circles: track.releaseId
				? (circlesByRelease.get(track.releaseId) ?? [])
				: [],
			artists: creditsByTrack.get(track.trackId) ?? [],
		}));

		const response = { data, total, page, limit };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.TRACKS_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.TRACKS_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/original-songs/:id/tracks");
	}
});

export { originalSongsRouter };
