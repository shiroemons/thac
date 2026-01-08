import {
	and,
	artistAliases,
	artists,
	asc,
	circles,
	countDistinct,
	creditRoles,
	db,
	desc,
	eq,
	inArray,
	isNull,
	officialSongs,
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

const artistsRouter = new Hono();

// 頭文字の文字種マッピング（UIカテゴリ → DBのinitialScript値）
const SCRIPT_CATEGORY_MAP: Record<string, string[]> = {
	alphabet: ["latin"],
	kana: ["hiragana", "katakana"],
	kanji: ["kanji"],
	symbol: ["digit", "symbol", "other"],
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

// 名義IDの解析ヘルパー
const MAIN_SUFFIX = "__main__";

function parseNameId(nameId: string): {
	artistId: string;
	aliasId: string | null;
	isMainName: boolean;
} {
	if (nameId.endsWith(MAIN_SUFFIX)) {
		return {
			artistId: nameId.slice(0, -MAIN_SUFFIX.length),
			aliasId: null,
			isMainName: true,
		};
	}
	return {
		artistId: "", // 後で取得
		aliasId: nameId,
		isMainName: false,
	};
}

// 名義エントリの型定義
interface NameEntry {
	id: string;
	name: string;
	artistId: string;
	artistName: string;
	isMainName: boolean;
	aliasTypeCode: string | null;
	nameInitial: string | null;
	initialScript: string;
	trackCount: number;
}

/**
 * GET /api/public/artists
 * 名義一覧を取得（ページネーション、フィルタ、検索対応）
 * メイン名義 + 別名義を統合して表示
 */
artistsRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const initialScript = c.req.query("initialScript");
		const initial = c.req.query("initial");
		const row = c.req.query("row");
		const role = c.req.query("role");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "name";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const cacheKey = cacheKeys.artistsList({
			page,
			limit,
			initialScript,
			initial,
			row,
			role,
			search,
			sortBy,
			sortOrder,
		});

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.ARTISTS_LIST });
			return c.json(cached);
		}

		// 別名義を取得（メイン名義は一覧から除外）
		const aliasesQuery = await db
			.select({
				aliasId: artistAliases.id,
				aliasName: artistAliases.name,
				aliasTypeCode: artistAliases.aliasTypeCode,
				aliasNameInitial: artistAliases.nameInitial,
				aliasInitialScript: artistAliases.initialScript,
				artistId: artists.id,
				artistName: artists.name,
				trackCount: sql<number>`(
					SELECT COUNT(DISTINCT ${trackCredits.trackId})
					FROM ${trackCredits}
					WHERE ${trackCredits.artistAliasId} = ${artistAliases.id}
				)`,
			})
			.from(artistAliases)
			.innerJoin(artists, eq(artistAliases.artistId, artists.id));

		// Step 3: 結果をマージ（別名義のみ）
		let allEntries: NameEntry[] = aliasesQuery
			.filter((a) => a.trackCount > 0)
			.map((a) => ({
				id: a.aliasId,
				name: a.aliasName,
				artistId: a.artistId,
				artistName: a.artistName,
				isMainName: false,
				aliasTypeCode: a.aliasTypeCode,
				nameInitial: a.aliasNameInitial,
				initialScript: a.aliasInitialScript ?? "other",
				trackCount: a.trackCount,
			}));

		// Step 4: フィルター適用
		// 文字種フィルター
		if (initialScript && initialScript !== "all") {
			const scripts = SCRIPT_CATEGORY_MAP[initialScript];
			if (scripts) {
				allEntries = allEntries.filter((e) =>
					scripts.includes(e.initialScript),
				);
			}
		}

		// アルファベット頭文字フィルター
		if (initial && /^[A-Z]$/.test(initial)) {
			allEntries = allEntries.filter((e) => e.nameInitial === initial);
		}

		// かな行フィルター
		if (row && KANA_ROW_PATTERNS[row]) {
			const kanaChars = KANA_ROW_PATTERNS[row];
			allEntries = allEntries.filter(
				(e) => e.nameInitial && kanaChars.includes(e.nameInitial),
			);
		}

		// 検索フィルター
		if (search) {
			const searchLower = search.toLowerCase();
			allEntries = allEntries.filter((e) =>
				e.name.toLowerCase().includes(searchLower),
			);
		}

		// 役割フィルター（後でロール取得時にフィルタリングするため、一旦スキップ）
		// パフォーマンス上、ロール情報を取得してからフィルタリング

		// Step 5: ソート
		allEntries.sort((a, b) => {
			if (sortBy === "name") {
				const cmp = a.name.localeCompare(b.name, "ja");
				return sortOrder === "asc" ? cmp : -cmp;
			}
			// trackCount でソート
			const cmp = a.trackCount - b.trackCount;
			return sortOrder === "asc" ? cmp : -cmp;
		});

		// Step 6: ロール情報を取得してフィルタリング
		if (allEntries.length > 0) {
			const aliasIds = allEntries.map((e) => e.id);

			// 別名義のロールを取得
			const aliasRolesData = await db
				.selectDistinct({
					aliasId: trackCredits.artistAliasId,
					roleCode: trackCreditRoles.roleCode,
					roleLabel: creditRoles.label,
				})
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCreditRoles.trackCreditId, trackCredits.id),
				)
				.innerJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(inArray(trackCredits.artistAliasId, aliasIds));

			// ロールをIDでグルーピング
			const rolesByAliasId = new Map<
				string,
				Array<{ roleCode: string; label: string }>
			>();
			for (const r of aliasRolesData) {
				if (!r.roleCode || !r.aliasId) continue;
				const existing = rolesByAliasId.get(r.aliasId) ?? [];
				if (!rolesByAliasId.has(r.aliasId)) {
					rolesByAliasId.set(r.aliasId, existing);
				}
				if (!existing.some((e) => e.roleCode === r.roleCode)) {
					existing.push({ roleCode: r.roleCode, label: r.roleLabel });
				}
			}

			// ロール情報を付与
			let entriesWithRoles = allEntries.map((entry) => ({
				...entry,
				roles: rolesByAliasId.get(entry.id) ?? [],
			}));

			// 役割フィルター適用
			if (role && role !== "all") {
				entriesWithRoles = entriesWithRoles.filter((e) =>
					e.roles.some((r) => r.roleCode === role),
				);
			}

			// ページネーション
			const total = entriesWithRoles.length;
			const offset = (page - 1) * limit;
			const pagedEntries = entriesWithRoles.slice(offset, offset + limit);

			const response = {
				data: pagedEntries,
				total,
				page,
				limit,
			};

			// キャッシュに保存
			setCache(cacheKey, response, CACHE_TTL.ARTISTS_LIST);
			setCacheHeaders(c, { maxAge: CACHE_TTL.ARTISTS_LIST });

			return c.json(response);
		}

		const response = {
			data: [],
			total: 0,
			page,
			limit,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.ARTISTS_LIST);
		setCacheHeaders(c, { maxAge: CACHE_TTL.ARTISTS_LIST });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/artists");
	}
});

/**
 * GET /api/public/artists/:id
 * 名義詳細を取得（他名義情報、統計情報含む）
 * :id は名義ID（{artistId}__main__ または {aliasId}）
 */
artistsRouter.get("/:id", async (c) => {
	try {
		const nameId = c.req.param("id");
		const cacheKey = cacheKeys.artistDetail(nameId);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_DETAIL });
			return c.json(cached);
		}

		const parsed = parseNameId(nameId);

		let artistId: string;
		let name: string;
		let aliasTypeCode: string | null = null;

		if (parsed.isMainName) {
			// メイン名義の場合
			artistId = parsed.artistId;

			const artistResult = await db
				.select({
					id: artists.id,
					name: artists.name,
				})
				.from(artists)
				.where(eq(artists.id, artistId))
				.limit(1);

			const artistRecord = artistResult[0];
			if (!artistRecord) {
				return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
			}

			name = artistRecord.name;
		} else {
			// 別名義の場合
			const aliasResult = await db
				.select({
					id: artistAliases.id,
					name: artistAliases.name,
					artistId: artistAliases.artistId,
					aliasTypeCode: artistAliases.aliasTypeCode,
				})
				.from(artistAliases)
				.where(eq(artistAliases.id, parsed.aliasId!))
				.limit(1);

			const aliasRecord = aliasResult[0];
			if (!aliasRecord) {
				return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
			}

			artistId = aliasRecord.artistId;
			name = aliasRecord.name;
			aliasTypeCode = aliasRecord.aliasTypeCode;
		}

		// アーティスト名を取得
		const artistData = await db
			.select({ name: artists.name })
			.from(artists)
			.where(eq(artists.id, artistId))
			.limit(1);

		const artistName = artistData[0]?.name ?? name;

		// 統計情報を取得
		const statsCondition = parsed.isMainName
			? and(
					eq(trackCredits.artistId, artistId),
					isNull(trackCredits.artistAliasId),
				)
			: eq(trackCredits.artistAliasId, parsed.aliasId!);

		const statsData = await db
			.select({
				trackCount: countDistinct(trackCredits.trackId),
				releaseCount: countDistinct(tracks.releaseId),
			})
			.from(trackCredits)
			.leftJoin(tracks, eq(trackCredits.trackId, tracks.id))
			.where(statsCondition);

		const stats = statsData[0] ?? { trackCount: 0, releaseCount: 0 };

		// ロール情報を取得
		const rolesData = await db
			.selectDistinct({
				roleCode: trackCreditRoles.roleCode,
				roleLabel: creditRoles.label,
			})
			.from(trackCredits)
			.innerJoin(
				trackCreditRoles,
				eq(trackCreditRoles.trackCreditId, trackCredits.id),
			)
			.innerJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
			.where(statsCondition);

		const roles = rolesData
			.filter((r) => r.roleCode !== null)
			.map((r) => ({ roleCode: r.roleCode as string, label: r.roleLabel }));

		// 他名義を取得
		const otherAliases: Array<{
			id: string;
			name: string;
			isMainName: boolean;
			aliasTypeCode: string | null;
			trackCount: number;
		}> = [];

		// メイン名義のトラック数を取得
		const mainTrackCountResult = await db
			.select({ trackCount: countDistinct(trackCredits.trackId) })
			.from(trackCredits)
			.where(
				and(
					eq(trackCredits.artistId, artistId),
					isNull(trackCredits.artistAliasId),
				),
			);

		const mainTrackCount = mainTrackCountResult[0]?.trackCount ?? 0;

		// 現在の名義がメイン名義でない場合、メイン名義を他名義として追加
		if (!parsed.isMainName && mainTrackCount > 0) {
			otherAliases.push({
				id: `${artistId}${MAIN_SUFFIX}`,
				name: artistName,
				isMainName: true,
				aliasTypeCode: null,
				trackCount: mainTrackCount,
			});
		}

		// 別名義一覧を取得
		const aliasesData = await db
			.select({
				id: artistAliases.id,
				name: artistAliases.name,
				aliasTypeCode: artistAliases.aliasTypeCode,
				trackCount: sql<number>`(
					SELECT COUNT(DISTINCT ${trackCredits.trackId})
					FROM ${trackCredits}
					WHERE ${trackCredits.artistAliasId} = ${artistAliases.id}
				)`,
			})
			.from(artistAliases)
			.where(eq(artistAliases.artistId, artistId));

		for (const alias of aliasesData) {
			// 現在の名義は除外
			if (alias.id === parsed.aliasId) continue;
			if (alias.trackCount > 0) {
				otherAliases.push({
					id: alias.id,
					name: alias.name,
					isMainName: false,
					aliasTypeCode: alias.aliasTypeCode,
					trackCount: alias.trackCount,
				});
			}
		}

		const response = {
			id: nameId,
			name,
			artistId,
			artistName,
			isMainName: parsed.isMainName,
			aliasTypeCode,
			roles,
			stats: {
				trackCount: stats.trackCount,
				releaseCount: stats.releaseCount,
			},
			otherAliases,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.ARTIST_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/artists/:id");
	}
});

/**
 * GET /api/public/artists/:id/tracks
 * 名義のトラック一覧を取得（バッチフェッチでN+1回避）
 * :id は名義ID（{artistId}__main__ または {aliasId}）
 */
artistsRouter.get("/:id/tracks", async (c) => {
	try {
		const nameId = c.req.param("id");
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const role = c.req.query("role");

		const cacheKey = cacheKeys.artistTracks({
			artistId: nameId,
			page,
			limit,
			aliasId: undefined,
			role,
		});

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_TRACKS });
			return c.json(cached);
		}

		const parsed = parseNameId(nameId);
		let artistId: string;

		if (parsed.isMainName) {
			artistId = parsed.artistId;

			// アーティスト存在チェック
			const artistExists = await db
				.select({ id: artists.id })
				.from(artists)
				.where(eq(artists.id, artistId))
				.limit(1);

			if (artistExists.length === 0) {
				return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
			}
		} else {
			// 別名義存在チェック
			const aliasExists = await db
				.select({ id: artistAliases.id, artistId: artistAliases.artistId })
				.from(artistAliases)
				.where(eq(artistAliases.id, parsed.aliasId!))
				.limit(1);

			const aliasExistsRecord = aliasExists[0];
			if (!aliasExistsRecord) {
				return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
			}

			artistId = aliasExistsRecord.artistId;
		}

		const offset = (page - 1) * limit;

		// クレジット条件を構築
		const creditConditions = parsed.isMainName
			? [
					eq(trackCredits.artistId, artistId),
					isNull(trackCredits.artistAliasId),
				]
			: [eq(trackCredits.artistAliasId, parsed.aliasId!)];

		// 役割フィルターがある場合、対象クレジットIDを先に取得
		let creditIdsWithRole: string[] | null = null;
		if (role && role !== "all") {
			const creditsWithRole = await db
				.select({ creditId: trackCredits.id })
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCreditRoles.trackCreditId, trackCredits.id),
				)
				.where(and(...creditConditions, eq(trackCreditRoles.roleCode, role)));

			creditIdsWithRole = creditsWithRole.map((c) => c.creditId);

			if (creditIdsWithRole.length === 0) {
				const response = { data: [], total: 0, page, limit };
				setCache(cacheKey, response, CACHE_TTL.ARTIST_TRACKS);
				setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_TRACKS });
				return c.json(response);
			}
		}

		const creditWhere = and(...creditConditions);

		// Step 1: クレジット基本情報を取得
		const baseQuery = db
			.select({
				creditId: trackCredits.id,
				creditName: trackCredits.creditName,
				aliasId: trackCredits.artistAliasId,
				aliasTypeCode: trackCredits.aliasTypeCode,
				trackId: tracks.id,
				trackName: tracks.name,
				trackNumber: tracks.trackNumber,
				releaseId: releases.id,
				releaseName: releases.name,
				releaseDate: releases.releaseDate,
			})
			.from(trackCredits)
			.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
			.innerJoin(releases, eq(tracks.releaseId, releases.id))
			.where(
				creditIdsWithRole
					? and(creditWhere, inArray(trackCredits.id, creditIdsWithRole))
					: creditWhere,
			)
			.orderBy(
				desc(releases.releaseDate),
				asc(releases.name),
				asc(tracks.trackNumber),
			);

		const countQuery = db
			.select({ count: countDistinct(trackCredits.id) })
			.from(trackCredits)
			.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
			.where(
				creditIdsWithRole
					? and(creditWhere, inArray(trackCredits.id, creditIdsWithRole))
					: creditWhere,
			);

		const [creditsData, totalResult] = await Promise.all([
			baseQuery.limit(limit).offset(offset),
			countQuery,
		]);

		const total = totalResult[0]?.count ?? 0;

		if (creditsData.length === 0) {
			const response = { data: [], total, page, limit };
			setCache(cacheKey, response, CACHE_TTL.ARTIST_TRACKS);
			setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_TRACKS });
			return c.json(response);
		}

		// Step 2: バッチフェッチ用のIDリストを作成
		const creditIds = creditsData.map((c) => c.creditId);
		const trackIds = [...new Set(creditsData.map((c) => c.trackId))];
		const releaseIds = [...new Set(creditsData.map((c) => c.releaseId))];

		// Step 3: 関連データをバッチ取得（N+1回避）
		const [rolesData, circlesData, originalSongsData] = await Promise.all([
			// ロール情報を一括取得
			db
				.select({
					creditId: trackCreditRoles.trackCreditId,
					roleCode: trackCreditRoles.roleCode,
					roleLabel: creditRoles.label,
				})
				.from(trackCreditRoles)
				.innerJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(inArray(trackCreditRoles.trackCreditId, creditIds)),

			// サークル情報を一括取得
			db
				.select({
					releaseId: releaseCircles.releaseId,
					circleId: circles.id,
					circleName: circles.name,
				})
				.from(releaseCircles)
				.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
				.where(inArray(releaseCircles.releaseId, releaseIds)),

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
		// ロールをクレジットIDでグルーピング
		const rolesByCredit = new Map<
			string,
			Array<{ roleCode: string; label: string }>
		>();
		for (const r of rolesData) {
			const existing = rolesByCredit.get(r.creditId) ?? [];
			if (!rolesByCredit.has(r.creditId)) {
				rolesByCredit.set(r.creditId, existing);
			}
			existing.push({ roleCode: r.roleCode, label: r.roleLabel });
		}

		// サークルをリリースIDでグルーピング
		const circlesByRelease = new Map<
			string,
			Array<{ id: string; name: string }>
		>();
		for (const cir of circlesData) {
			const existing = circlesByRelease.get(cir.releaseId) ?? [];
			if (!circlesByRelease.has(cir.releaseId)) {
				circlesByRelease.set(cir.releaseId, existing);
			}
			if (!existing.some((e) => e.id === cir.circleId)) {
				existing.push({ id: cir.circleId, name: cir.circleName });
			}
		}

		// 原曲をトラックIDでグルーピング
		const originalSongsByTrack = new Map<
			string,
			{ id: string; name: string | null }
		>();
		for (const os of originalSongsData) {
			if (!originalSongsByTrack.has(os.trackId)) {
				originalSongsByTrack.set(os.trackId, {
					id: os.songId,
					name: os.songName,
				});
			}
		}

		// 最終結果を構築
		const data = creditsData.map((credit) => ({
			id: credit.creditId,
			creditName: credit.creditName,
			aliasId: credit.aliasId,
			aliasTypeCode: credit.aliasTypeCode,
			roles: rolesByCredit.get(credit.creditId) ?? [],
			track: {
				id: credit.trackId,
				name: credit.trackName,
			},
			release: {
				id: credit.releaseId,
				name: credit.releaseName,
				releaseDate: credit.releaseDate,
			},
			circles: circlesByRelease.get(credit.releaseId) ?? [],
			originalSong: originalSongsByTrack.get(credit.trackId) ?? null,
		}));

		const response = { data, total, page, limit };

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.ARTIST_TRACKS);
		setCacheHeaders(c, { maxAge: CACHE_TTL.ARTIST_TRACKS });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/artists/:id/tracks");
	}
});

export { artistsRouter };
