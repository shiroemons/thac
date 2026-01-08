import {
	asc,
	circles,
	count,
	countDistinct,
	db,
	desc,
	eq,
	eventDays,
	eventSeries,
	events,
	inArray,
	like,
	or,
	releaseCircles,
	releases,
	sql,
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

const eventsRouter = new Hono();

/**
 * GET /api/public/events
 * イベント一覧を取得（ページネーション、フィルタ、検索対応）
 */
eventsRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const seriesId = c.req.query("seriesId");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "startDate";
		const sortOrder = c.req.query("sortOrder") || "desc";

		const cacheKey = cacheKeys.eventsList({
			page,
			limit,
			seriesId,
			search,
			sortBy,
			sortOrder,
		});

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.EVENTS_LIST });
			return c.json(cached);
		}

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		// シリーズフィルター
		if (seriesId) {
			conditions.push(eq(events.eventSeriesId, seriesId));
		}

		// 検索
		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(like(events.name, searchPattern), like(events.venue, searchPattern)),
			);
		}

		const whereCondition =
			conditions.length > 0
				? conditions.length === 1
					? conditions[0]
					: sql`${conditions[0]} AND ${conditions[1]}`
				: undefined;

		// releaseCountサブクエリ（N+1回避）
		const releaseCountSubquery = db
			.select({ count: count() })
			.from(releases)
			.where(eq(releases.eventId, events.id));

		// ソート条件を構築
		const sortColumn =
			sortBy === "name"
				? events.name
				: sortBy === "releaseCount"
					? sql<number>`(${releaseCountSubquery})`
					: events.startDate;
		const orderByClause =
			sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

		// データ取得（JOINでシリーズ情報を一括取得）
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: events.id,
					name: events.name,
					eventSeriesId: events.eventSeriesId,
					eventSeriesName: eventSeries.name,
					edition: events.edition,
					startDate: events.startDate,
					endDate: events.endDate,
					totalDays: events.totalDays,
					venue: events.venue,
					releaseCount: sql<number>`(${releaseCountSubquery})`,
				})
				.from(events)
				.leftJoin(eventSeries, eq(events.eventSeriesId, eventSeries.id))
				.where(whereCondition)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(events).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		const response = {
			data,
			total,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.EVENTS_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.EVENTS_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/events");
	}
});

/**
 * GET /api/public/events/:id
 * イベント詳細を取得（統計情報含む）
 */
eventsRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.eventDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_DETAIL });
			return c.json(cached);
		}

		// イベント基本情報を取得（JOINでシリーズ情報も一括取得）
		const eventResult = await db
			.select({
				id: events.id,
				name: events.name,
				eventSeriesId: events.eventSeriesId,
				eventSeriesName: eventSeries.name,
				edition: events.edition,
				startDate: events.startDate,
				endDate: events.endDate,
				totalDays: events.totalDays,
				venue: events.venue,
			})
			.from(events)
			.leftJoin(eventSeries, eq(events.eventSeriesId, eventSeries.id))
			.where(eq(events.id, id))
			.limit(1);

		if (eventResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		const event = eventResult[0];

		// 関連データを並列取得（N+1回避）
		const [daysData, statsData] = await Promise.all([
			// イベント日一覧
			db
				.select({
					id: eventDays.id,
					dayNumber: eventDays.dayNumber,
					date: eventDays.date,
				})
				.from(eventDays)
				.where(eq(eventDays.eventId, id))
				.orderBy(asc(eventDays.dayNumber)),

			// 統計情報（サブクエリで一括集計）
			db
				.select({
					releaseCount: countDistinct(releases.id),
					circleCount: countDistinct(releaseCircles.circleId),
					trackCount: countDistinct(tracks.id),
				})
				.from(releases)
				.leftJoin(releaseCircles, eq(releaseCircles.releaseId, releases.id))
				.leftJoin(tracks, eq(tracks.releaseId, releases.id))
				.where(eq(releases.eventId, id)),
		]);

		const stats = statsData[0] ?? {
			releaseCount: 0,
			circleCount: 0,
			trackCount: 0,
		};

		const response = {
			...event,
			eventDays: daysData,
			stats: {
				releaseCount: stats.releaseCount,
				circleCount: stats.circleCount,
				trackCount: stats.trackCount,
			},
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.EVENT_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/events/:id");
	}
});

/**
 * GET /api/public/events/:id/releases
 * イベントのリリース一覧を取得（バッチフェッチでN+1回避）
 */
eventsRouter.get("/:id/releases", async (c) => {
	try {
		const eventId = c.req.param("id");
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

		const cacheKey = cacheKeys.eventReleases({ eventId, page, limit });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_RELEASES });
			return c.json(cached);
		}

		// イベント存在チェック
		const eventExists = await db
			.select({ id: events.id })
			.from(events)
			.where(eq(events.id, eventId))
			.limit(1);

		if (eventExists.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		const offset = (page - 1) * limit;

		// トラック数サブクエリ
		const trackCountSubquery = db
			.select({ count: count() })
			.from(tracks)
			.where(eq(tracks.releaseId, releases.id));

		// Step 1: リリース一覧を取得
		const [releasesData, totalResult] = await Promise.all([
			db
				.select({
					id: releases.id,
					name: releases.name,
					nameJa: releases.nameJa,
					releaseDate: releases.releaseDate,
					releaseType: releases.releaseType,
					trackCount: sql<number>`(${trackCountSubquery})`,
				})
				.from(releases)
				.where(eq(releases.eventId, eventId))
				.orderBy(asc(releases.name))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: count() })
				.from(releases)
				.where(eq(releases.eventId, eventId)),
		]);

		const total = totalResult[0]?.count ?? 0;

		if (releasesData.length === 0) {
			const response = { data: [], total, page, limit };
			setCache(cacheKey, response, CACHE_TTL.EVENT_RELEASES);
			setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_RELEASES });
			return c.json(response);
		}

		// Step 2: バッチフェッチ用のIDリストを作成
		const releaseIds = releasesData.map((r) => r.id);

		// Step 3: サークル情報をバッチ取得（N+1回避）
		const circlesData = await db
			.select({
				releaseId: releaseCircles.releaseId,
				circleId: circles.id,
				circleName: circles.name,
				participationType: releaseCircles.participationType,
			})
			.from(releaseCircles)
			.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
			.where(inArray(releaseCircles.releaseId, releaseIds));

		// Step 4: メモリ上でマージ
		const circlesByRelease = new Map<
			string,
			Array<{ id: string; name: string; participationType: string }>
		>();
		for (const c of circlesData) {
			const key = c.releaseId;
			const existing = circlesByRelease.get(key) ?? [];
			if (!circlesByRelease.has(key)) {
				circlesByRelease.set(key, existing);
			}
			existing.push({
				id: c.circleId,
				name: c.circleName,
				participationType: c.participationType,
			});
		}

		// 最終結果を構築
		const data = releasesData.map((release) => ({
			id: release.id,
			name: release.name,
			nameJa: release.nameJa,
			releaseDate: release.releaseDate,
			releaseType: release.releaseType,
			trackCount: release.trackCount,
			circles: circlesByRelease.get(release.id) ?? [],
		}));

		const response = { data, total, page, limit };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.EVENT_RELEASES);
		setCacheHeaders(c, { maxAge: CACHE_TTL.EVENT_RELEASES });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/events/:id/releases");
	}
});

export { eventsRouter };
