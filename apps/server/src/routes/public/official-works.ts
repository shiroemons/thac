import {
	and,
	asc,
	count,
	countDistinct,
	db,
	eq,
	like,
	officialSongs,
	officialWorkCategories,
	officialWorkLinks,
	officialWorks,
	or,
	platforms,
	sql,
	trackOfficialSongs,
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

const officialWorksRouter = new Hono();

/**
 * GET /api/public/official-works
 * 原作一覧を取得（ページネーション、カテゴリフィルタ、検索対応）
 */
officialWorksRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const category = c.req.query("category");
		const search = c.req.query("search");

		const cacheKey = cacheKeys.worksList({ page, limit, category, search });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.WORKS_LIST });
			return c.json(cached);
		}

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (category) {
			conditions.push(eq(officialWorks.categoryCode, category));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(officialWorks.name, searchPattern),
					like(officialWorks.nameJa, searchPattern),
					like(officialWorks.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// カウントをサブクエリでJOIN（相関サブクエリを回避）
		const songCountSq = db
			.select({
				workId: officialSongs.officialWorkId,
				count: count().as("songCount"),
			})
			.from(officialSongs)
			.groupBy(officialSongs.officialWorkId)
			.as("songCountSq");

		const arrangeCountSq = db
			.select({
				workId: officialSongs.officialWorkId,
				count: countDistinct(trackOfficialSongs.trackId).as("arrangeCount"),
			})
			.from(officialSongs)
			.innerJoin(
				trackOfficialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.groupBy(officialSongs.officialWorkId)
			.as("arrangeCountSq");

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: officialWorks.id,
					categoryCode: officialWorks.categoryCode,
					categoryName: officialWorkCategories.name,
					name: officialWorks.name,
					nameJa: officialWorks.nameJa,
					nameEn: officialWorks.nameEn,
					shortNameJa: officialWorks.shortNameJa,
					shortNameEn: officialWorks.shortNameEn,
					numberInSeries: officialWorks.numberInSeries,
					releaseDate: officialWorks.releaseDate,
					songCount: sql<number>`COALESCE(${songCountSq.count}, 0)`,
					totalArrangeCount: sql<number>`COALESCE(${arrangeCountSq.count}, 0)`,
				})
				.from(officialWorks)
				.leftJoin(
					officialWorkCategories,
					eq(officialWorks.categoryCode, officialWorkCategories.code),
				)
				.leftJoin(songCountSq, eq(officialWorks.id, songCountSq.workId))
				.leftJoin(arrangeCountSq, eq(officialWorks.id, arrangeCountSq.workId))
				.where(whereCondition)
				.orderBy(
					asc(officialWorkCategories.sortOrder),
					asc(officialWorks.position),
				)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(officialWorks).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		const response = {
			data,
			total,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.WORKS_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.WORKS_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/official-works");
	}
});

/**
 * GET /api/public/official-works/:id
 * 原作詳細を取得（楽曲リスト、外部リンク含む）
 */
officialWorksRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.workDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.WORK_DETAIL });
			return c.json(cached);
		}

		// 原作基本情報を取得
		const workResult = await db
			.select({
				id: officialWorks.id,
				categoryCode: officialWorks.categoryCode,
				categoryName: officialWorkCategories.name,
				name: officialWorks.name,
				nameJa: officialWorks.nameJa,
				nameEn: officialWorks.nameEn,
				shortNameJa: officialWorks.shortNameJa,
				shortNameEn: officialWorks.shortNameEn,
				numberInSeries: officialWorks.numberInSeries,
				releaseDate: officialWorks.releaseDate,
				officialOrganization: officialWorks.officialOrganization,
				notes: officialWorks.notes,
			})
			.from(officialWorks)
			.leftJoin(
				officialWorkCategories,
				eq(officialWorks.categoryCode, officialWorkCategories.code),
			)
			.where(eq(officialWorks.id, id))
			.limit(1);

		if (workResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		const work = workResult[0];

		// 楽曲、リンク、統計を並列取得
		const [songsData, linksData, statsData] = await Promise.all([
			// 楽曲一覧（arrangeCount含む）
			db
				.select({
					id: officialSongs.id,
					trackNumber: officialSongs.trackNumber,
					name: officialSongs.name,
					nameJa: officialSongs.nameJa,
					nameEn: officialSongs.nameEn,
					composerName: officialSongs.composerName,
					arrangeCount: sql<number>`(
						SELECT COUNT(DISTINCT ${trackOfficialSongs.trackId})
						FROM ${trackOfficialSongs}
						WHERE ${trackOfficialSongs.officialSongId} = ${officialSongs.id}
					)`,
				})
				.from(officialSongs)
				.where(eq(officialSongs.officialWorkId, id))
				.orderBy(asc(officialSongs.trackNumber)),

			// 外部リンク
			db
				.select({
					platformCode: officialWorkLinks.platformCode,
					platformName: platforms.name,
					url: officialWorkLinks.url,
				})
				.from(officialWorkLinks)
				.leftJoin(platforms, eq(officialWorkLinks.platformCode, platforms.code))
				.where(eq(officialWorkLinks.officialWorkId, id))
				.orderBy(asc(officialWorkLinks.sortOrder)),

			// 統計情報（songCount, totalArrangeCount）
			db
				.select({
					songCount: count(officialSongs.id),
					totalArrangeCount: sql<number>`(
						SELECT COUNT(DISTINCT ${trackOfficialSongs.trackId})
						FROM ${officialSongs} os
						INNER JOIN ${trackOfficialSongs} ON ${trackOfficialSongs.officialSongId} = os.id
						WHERE os.official_work_id = ${id}
					)`,
				})
				.from(officialSongs)
				.where(eq(officialSongs.officialWorkId, id)),
		]);

		const stats = statsData[0] ?? { songCount: 0, totalArrangeCount: 0 };

		const response = {
			...work,
			songCount: stats.songCount,
			totalArrangeCount: stats.totalArrangeCount,
			links: linksData,
			songs: songsData,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.WORK_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.WORK_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/official-works/:id");
	}
});

export { officialWorksRouter };
