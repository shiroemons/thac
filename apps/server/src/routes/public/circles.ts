import {
	and,
	artists,
	asc,
	circleLinks,
	circles,
	count,
	countDistinct,
	creditRoles,
	db,
	desc,
	eq,
	events,
	inArray,
	like,
	officialSongs,
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

const circlesRouter = new Hono();

// 頭文字の文字種マッピング
const SCRIPT_CATEGORY_MAP: Record<string, string[]> = {
	alphabet: ["latin"],
	kana: ["hiragana", "katakana"],
	kanji: ["kanji"],
	other: ["digit", "symbol", "other"],
};

// かな行のパターン
const KANA_ROW_PATTERNS: Record<string, string[]> = {
	あ: ["あ", "い", "う", "え", "お", "ア", "イ", "ウ", "エ", "オ"],
	か: ["か", "き", "く", "け", "こ", "カ", "キ", "ク", "ケ", "コ"],
	さ: ["さ", "し", "す", "せ", "そ", "サ", "シ", "ス", "セ", "ソ"],
	た: ["た", "ち", "つ", "て", "と", "タ", "チ", "ツ", "テ", "ト"],
	な: ["な", "に", "ぬ", "ね", "の", "ナ", "ニ", "ヌ", "ネ", "ノ"],
	は: ["は", "ひ", "ふ", "へ", "ほ", "ハ", "ヒ", "フ", "ヘ", "ホ"],
	ま: ["ま", "み", "む", "め", "も", "マ", "ミ", "ム", "メ", "モ"],
	や: ["や", "ゆ", "よ", "ヤ", "ユ", "ヨ"],
	ら: ["ら", "り", "る", "れ", "ろ", "ラ", "リ", "ル", "レ", "ロ"],
	わ: ["わ", "を", "ん", "ワ", "ヲ", "ン"],
};

/**
 * GET /api/public/circles
 * サークル一覧を取得（ページネーション、フィルタ、検索対応）
 */
circlesRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const initialScript = c.req.query("initialScript"); // all | alphabet | kana | kanji | other
		const initial = c.req.query("initial"); // A-Z
		const row = c.req.query("row"); // あ, か, さ, ...
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "releaseCount";
		const sortOrder = c.req.query("sortOrder") || "desc";

		const cacheKey = cacheKeys.circlesList({
			page,
			limit,
			initialScript,
			initial,
			row,
			search,
			sortBy,
			sortOrder,
		});

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLES_LIST });
			return c.json(cached);
		}

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		// 文字種フィルター
		if (initialScript && initialScript !== "all") {
			const scripts = SCRIPT_CATEGORY_MAP[initialScript];
			if (scripts) {
				conditions.push(inArray(circles.initialScript, scripts));
			}
		}

		// アルファベット頭文字フィルター
		if (initial && /^[A-Z]$/.test(initial)) {
			conditions.push(eq(circles.nameInitial, initial));
		}

		// かな行フィルター
		if (row && KANA_ROW_PATTERNS[row]) {
			const kanaChars = KANA_ROW_PATTERNS[row];
			conditions.push(inArray(circles.nameInitial, kanaChars));
		}

		// 検索
		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(circles.name, searchPattern),
					like(circles.nameJa, searchPattern),
					like(circles.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// カウントをサブクエリでJOIN（相関サブクエリを回避）
		const releaseCountSq = db
			.select({
				circleId: releaseCircles.circleId,
				count: countDistinct(releaseCircles.releaseId).as("releaseCount"),
			})
			.from(releaseCircles)
			.groupBy(releaseCircles.circleId)
			.as("releaseCountSq");

		const trackCountSq = db
			.select({
				circleId: releaseCircles.circleId,
				count: countDistinct(tracks.id).as("trackCount"),
			})
			.from(releaseCircles)
			.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
			.innerJoin(tracks, eq(tracks.releaseId, releases.id))
			.groupBy(releaseCircles.circleId)
			.as("trackCountSq");

		// ソート条件を構築
		const releaseCountCol = sql<number>`COALESCE(${releaseCountSq.count}, 0)`;
		const sortColumn = sortBy === "name" ? circles.name : releaseCountCol;
		const orderByClause =
			sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: circles.id,
					name: circles.name,
					nameJa: circles.nameJa,
					nameEn: circles.nameEn,
					sortName: circles.sortName,
					nameInitial: circles.nameInitial,
					initialScript: circles.initialScript,
					releaseCount: sql<number>`COALESCE(${releaseCountSq.count}, 0)`,
					trackCount: sql<number>`COALESCE(${trackCountSq.count}, 0)`,
				})
				.from(circles)
				.leftJoin(releaseCountSq, eq(circles.id, releaseCountSq.circleId))
				.leftJoin(trackCountSq, eq(circles.id, trackCountSq.circleId))
				.where(whereCondition)
				.orderBy(orderByClause)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(circles).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		const response = {
			data,
			total,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.CIRCLES_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLES_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/circles");
	}
});

/**
 * GET /api/public/circles/:id
 * サークル詳細を取得（リンク情報、統計情報含む）
 */
circlesRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.circleDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_DETAIL });
			return c.json(cached);
		}

		// サークル基本情報を取得
		const circleResult = await db
			.select({
				id: circles.id,
				name: circles.name,
				nameJa: circles.nameJa,
				nameEn: circles.nameEn,
				sortName: circles.sortName,
				nameInitial: circles.nameInitial,
				initialScript: circles.initialScript,
				notes: circles.notes,
			})
			.from(circles)
			.where(eq(circles.id, id))
			.limit(1);

		if (circleResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		const circle = circleResult[0];

		// 関連データを並列取得
		const [linksData, statsData] = await Promise.all([
			// 外部リンク
			db
				.select({
					id: circleLinks.id,
					platformCode: circleLinks.platformCode,
					platformName: platforms.name,
					url: circleLinks.url,
					isOfficial: circleLinks.isOfficial,
					isPrimary: circleLinks.isPrimary,
				})
				.from(circleLinks)
				.leftJoin(platforms, eq(circleLinks.platformCode, platforms.code))
				.where(eq(circleLinks.circleId, id)),

			// 統計情報
			db
				.select({
					releaseCount: countDistinct(releaseCircles.releaseId),
					trackCount: countDistinct(tracks.id),
				})
				.from(releaseCircles)
				.leftJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.leftJoin(tracks, eq(tracks.releaseId, releases.id))
				.where(eq(releaseCircles.circleId, id)),
		]);

		const stats = statsData[0] ?? { releaseCount: 0, trackCount: 0 };

		const response = {
			...circle,
			links: linksData,
			stats: {
				releaseCount: stats.releaseCount,
				trackCount: stats.trackCount,
			},
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.CIRCLE_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/circles/:id");
	}
});

/**
 * GET /api/public/circles/:id/releases
 * サークルのリリース一覧を取得（遅延読み込み用）
 */
circlesRouter.get("/:id/releases", async (c) => {
	try {
		const circleId = c.req.param("id");
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

		const cacheKey = cacheKeys.circleReleases({ circleId, page, limit });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_RELEASES });
			return c.json(cached);
		}

		// サークル存在チェック
		const circleExists = await db
			.select({ id: circles.id })
			.from(circles)
			.where(eq(circles.id, circleId))
			.limit(1);

		if (circleExists.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		const offset = (page - 1) * limit;

		// トラック数サブクエリ
		const trackCountSubquery = db
			.select({ count: count() })
			.from(tracks)
			.where(eq(tracks.releaseId, releases.id));

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: releases.id,
					name: releases.name,
					nameJa: releases.nameJa,
					releaseDate: releases.releaseDate,
					releaseType: releases.releaseType,
					participationType: releaseCircles.participationType,
					eventId: events.id,
					eventName: events.name,
					trackCount: sql<number>`(${trackCountSubquery})`,
				})
				.from(releaseCircles)
				.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.leftJoin(events, eq(releases.eventId, events.id))
				.where(eq(releaseCircles.circleId, circleId))
				.orderBy(desc(releases.releaseDate))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: countDistinct(releaseCircles.releaseId) })
				.from(releaseCircles)
				.where(eq(releaseCircles.circleId, circleId)),
		]);

		const total = totalResult[0]?.count ?? 0;

		// イベント情報を整形
		const formattedData = data.map((item) => ({
			id: item.id,
			name: item.name,
			nameJa: item.nameJa,
			releaseDate: item.releaseDate,
			releaseType: item.releaseType,
			participationType: item.participationType,
			event: item.eventId ? { id: item.eventId, name: item.eventName } : null,
			trackCount: item.trackCount,
		}));

		const response = {
			data: formattedData,
			total,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.CIRCLE_RELEASES);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_RELEASES });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/circles/:id/releases");
	}
});

/**
 * GET /api/public/circles/:id/tracks
 * サークルのトラック一覧を取得（バッチフェッチでN+1回避）
 */
circlesRouter.get("/:id/tracks", async (c) => {
	try {
		const circleId = c.req.param("id");
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

		const cacheKey = cacheKeys.circleTracks({ circleId, page, limit });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_TRACKS });
			return c.json(cached);
		}

		// サークル存在チェック
		const circleExists = await db
			.select({ id: circles.id })
			.from(circles)
			.where(eq(circles.id, circleId))
			.limit(1);

		if (circleExists.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		const offset = (page - 1) * limit;

		// Step 1: トラック基本情報を取得
		const [tracksData, totalResult] = await Promise.all([
			db
				.select({
					trackId: tracks.id,
					trackName: tracks.name,
					trackNumber: tracks.trackNumber,
					releaseId: releases.id,
					releaseName: releases.name,
				})
				.from(releaseCircles)
				.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.innerJoin(tracks, eq(tracks.releaseId, releases.id))
				.where(eq(releaseCircles.circleId, circleId))
				.orderBy(desc(releases.releaseDate), asc(tracks.trackNumber))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: countDistinct(tracks.id) })
				.from(releaseCircles)
				.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.innerJoin(tracks, eq(tracks.releaseId, releases.id))
				.where(eq(releaseCircles.circleId, circleId)),
		]);

		const total = totalResult[0]?.count ?? 0;

		if (tracksData.length === 0) {
			const response = { data: [], total, page, limit };
			setCache(cacheKey, response, CACHE_TTL.CIRCLE_TRACKS);
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_TRACKS });
			return c.json(response);
		}

		// Step 2: バッチフェッチ用のIDリストを作成
		const trackIds = tracksData.map((t) => t.trackId);

		// Step 3: 関連データをバッチ取得（N+1回避）
		const [creditsData, originalSongsData] = await Promise.all([
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

			// 原曲情報を一括取得
			db
				.select({
					trackId: trackOfficialSongs.trackId,
					songId: officialSongs.id,
					songName: officialSongs.nameJa,
				})
				.from(trackOfficialSongs)
				.innerJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.where(inArray(trackOfficialSongs.trackId, trackIds)),
		]);

		// Step 4: メモリ上でマージ
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

		// 原曲をトラックIDでグルーピング（1トラックに複数原曲の可能性）
		const originalSongsByTrack = new Map<
			string,
			Array<{ id: string; name: string | null }>
		>();
		for (const os of originalSongsData) {
			const key = os.trackId;
			const existing = originalSongsByTrack.get(key) ?? [];
			if (!originalSongsByTrack.has(key)) {
				originalSongsByTrack.set(key, existing);
			}
			existing.push({ id: os.songId, name: os.songName });
		}

		// 最終結果を構築
		const data = tracksData.map((track) => ({
			id: track.trackId,
			name: track.trackName,
			releaseId: track.releaseId,
			releaseName: track.releaseName,
			trackNumber: track.trackNumber,
			artists: creditsByTrack.get(track.trackId) ?? [],
			originalSong: originalSongsByTrack.get(track.trackId)?.[0] ?? null,
		}));

		const response = { data, total, page, limit };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.CIRCLE_TRACKS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_TRACKS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/circles/:id/tracks");
	}
});

/**
 * GET /api/public/circles/:id/stats/works
 * サークルの原作/原曲統計を取得
 */
circlesRouter.get("/:id/stats/works", async (c) => {
	try {
		const circleId = c.req.param("id");
		const stacked = c.req.query("stacked") === "true";
		const workId = c.req.query("workId");

		const cacheKey = cacheKeys.circleStats({ circleId, stacked, workId });

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_STATS });
			return c.json(cached);
		}

		// サークル存在チェック
		const circleExists = await db
			.select({ id: circles.id })
			.from(circles)
			.where(eq(circles.id, circleId))
			.limit(1);

		if (circleExists.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// ドリルダウンモード: 特定の原作の原曲詳細
		if (workId) {
			const songsStats = await db
				.select({
					songId: officialSongs.id,
					songName: officialSongs.nameJa,
					trackCount: count(tracks.id),
				})
				.from(releaseCircles)
				.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.innerJoin(tracks, eq(tracks.releaseId, releases.id))
				.innerJoin(
					trackOfficialSongs,
					eq(trackOfficialSongs.trackId, tracks.id),
				)
				.innerJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.where(
					and(
						eq(releaseCircles.circleId, circleId),
						eq(officialSongs.officialWorkId, workId),
					),
				)
				.groupBy(officialSongs.id)
				.orderBy(desc(count(tracks.id)));

			const response = {
				songs: songsStats.map((s) => ({
					id: s.songId,
					name: s.songName,
					trackCount: s.trackCount,
				})),
			};

			setCache(cacheKey, response, CACHE_TTL.CIRCLE_STATS);
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_STATS });
			return c.json(response);
		}

		// 積み上げモード: 原作ごとに原曲の内訳を含む
		if (stacked) {
			const stackedStats = await db
				.select({
					workId: officialWorks.id,
					workName: officialWorks.nameJa,
					shortName: officialWorks.shortNameJa,
					songId: officialSongs.id,
					songName: officialSongs.nameJa,
					trackCount: count(tracks.id),
				})
				.from(releaseCircles)
				.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
				.innerJoin(tracks, eq(tracks.releaseId, releases.id))
				.innerJoin(
					trackOfficialSongs,
					eq(trackOfficialSongs.trackId, tracks.id),
				)
				.innerJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.innerJoin(
					officialWorks,
					eq(officialSongs.officialWorkId, officialWorks.id),
				)
				.where(eq(releaseCircles.circleId, circleId))
				.groupBy(officialWorks.id, officialSongs.id)
				.orderBy(desc(count(tracks.id)));

			// 原作ごとにグルーピング
			const worksMap = new Map<
				string,
				{
					id: string;
					name: string | null;
					shortName: string | null;
					songs: Array<{ id: string; name: string | null; trackCount: number }>;
					totalTrackCount: number;
				}
			>();

			for (const row of stackedStats) {
				const existing = worksMap.get(row.workId);
				if (existing) {
					existing.songs.push({
						id: row.songId,
						name: row.songName,
						trackCount: row.trackCount,
					});
					existing.totalTrackCount += row.trackCount;
				} else {
					worksMap.set(row.workId, {
						id: row.workId,
						name: row.workName,
						shortName: row.shortName,
						songs: [
							{
								id: row.songId,
								name: row.songName,
								trackCount: row.trackCount,
							},
						],
						totalTrackCount: row.trackCount,
					});
				}
			}

			// トラック数順にソート
			const works = Array.from(worksMap.values()).sort(
				(a, b) => b.totalTrackCount - a.totalTrackCount,
			);

			const response = { works };

			setCache(cacheKey, response, CACHE_TTL.CIRCLE_STATS);
			setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_STATS });
			return c.json(response);
		}

		// 単純モード: 原作ごとの合計トラック数
		const worksStats = await db
			.select({
				workId: officialWorks.id,
				workName: officialWorks.nameJa,
				shortName: officialWorks.shortNameJa,
				trackCount: count(tracks.id),
			})
			.from(releaseCircles)
			.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
			.innerJoin(tracks, eq(tracks.releaseId, releases.id))
			.innerJoin(trackOfficialSongs, eq(trackOfficialSongs.trackId, tracks.id))
			.innerJoin(
				officialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.innerJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.where(eq(releaseCircles.circleId, circleId))
			.groupBy(officialWorks.id)
			.orderBy(desc(count(tracks.id)));

		const response = {
			works: worksStats.map((w) => ({
				id: w.workId,
				name: w.workName,
				shortName: w.shortName,
				trackCount: w.trackCount,
			})),
		};

		setCache(cacheKey, response, CACHE_TTL.CIRCLE_STATS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.CIRCLE_STATS });
		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/circles/:id/stats/works");
	}
});

export { circlesRouter };
