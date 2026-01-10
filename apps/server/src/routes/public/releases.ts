import {
	artistAliases,
	artists,
	asc,
	circles,
	creditRoles,
	db,
	discs,
	eq,
	events,
	inArray,
	officialSongs,
	platforms,
	releaseCircles,
	releasePublications,
	releases,
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

const releasesRouter = new Hono();

/**
 * GET /api/public/releases/:id
 * リリース詳細を取得（サークル、ディスク、トラック、クレジット、原曲、配信リンク含む）
 */
releasesRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.releaseDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.RELEASE_DETAIL });
			return c.json(cached);
		}

		// Step 1: リリース基本情報を取得（JOINでイベント情報も一括取得）
		const releaseResult = await db
			.select({
				id: releases.id,
				name: releases.name,
				nameJa: releases.nameJa,
				nameEn: releases.nameEn,
				releaseDate: releases.releaseDate,
				releaseYear: releases.releaseYear,
				releaseMonth: releases.releaseMonth,
				releaseDay: releases.releaseDay,
				releaseType: releases.releaseType,
				notes: releases.notes,
				eventId: events.id,
				eventName: events.name,
			})
			.from(releases)
			.leftJoin(events, eq(releases.eventId, events.id))
			.where(eq(releases.id, id))
			.limit(1);

		const [release] = releaseResult;
		if (!release) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		// Step 2: 関連データを並列取得（N+1回避）
		const [circlesData, discsData, tracksData, publicationsData] =
			await Promise.all([
				// サークル一覧
				db
					.select({
						circleId: circles.id,
						circleName: circles.name,
						participationType: releaseCircles.participationType,
						position: releaseCircles.position,
					})
					.from(releaseCircles)
					.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
					.where(eq(releaseCircles.releaseId, id))
					.orderBy(asc(releaseCircles.position)),

				// ディスク一覧
				db
					.select({
						id: discs.id,
						discNumber: discs.discNumber,
						discName: discs.discName,
					})
					.from(discs)
					.where(eq(discs.releaseId, id))
					.orderBy(asc(discs.discNumber)),

				// トラック一覧
				db
					.select({
						id: tracks.id,
						discId: tracks.discId,
						trackNumber: tracks.trackNumber,
						name: tracks.name,
						nameJa: tracks.nameJa,
						nameEn: tracks.nameEn,
					})
					.from(tracks)
					.where(eq(tracks.releaseId, id))
					.orderBy(asc(tracks.discId), asc(tracks.trackNumber)),

				// 配信リンク
				db
					.select({
						id: releasePublications.id,
						platformCode: releasePublications.platformCode,
						url: releasePublications.url,
						platformName: platforms.name,
						platformCategory: platforms.category,
					})
					.from(releasePublications)
					.innerJoin(
						platforms,
						eq(releasePublications.platformCode, platforms.code),
					)
					.where(eq(releasePublications.releaseId, id)),
			]);

		// Step 3: トラックIDリストを作成してバッチフェッチ
		const trackIds = tracksData.map((t) => t.id);

		// 配信リンクを整形
		const publications = publicationsData.map((pub) => ({
			id: pub.id,
			platformCode: pub.platformCode,
			url: pub.url,
			platform: {
				code: pub.platformCode,
				name: pub.platformName ?? pub.platformCode,
				category: pub.platformCategory ?? "other",
			},
		}));

		// トラックがない場合は空のレスポンスを返す
		if (trackIds.length === 0) {
			const response = {
				id: release.id,
				name: release.name,
				nameJa: release.nameJa,
				nameEn: release.nameEn,
				releaseDate: release.releaseDate,
				releaseYear: release.releaseYear,
				releaseMonth: release.releaseMonth,
				releaseDay: release.releaseDay,
				releaseType: release.releaseType,
				notes: release.notes,
				event: release.eventId
					? { id: release.eventId, name: release.eventName }
					: null,
				circles: circlesData,
				discs: discsData,
				tracks: [],
				trackCount: 0,
				artistCount: 0,
				publications,
			};

			setCache(cacheKey, response, CACHE_TTL.RELEASE_DETAIL);
			setCacheHeaders(c, { maxAge: CACHE_TTL.RELEASE_DETAIL });
			return c.json(response);
		}

		// Step 4: クレジットと原曲をバッチ取得
		const [creditsData, creditsRolesData, officialSongsData] =
			await Promise.all([
				// クレジット（artistAliases, artists を LEFT JOIN して別名義名・アーティスト名を取得）
				db
					.select({
						trackId: trackCredits.trackId,
						creditId: trackCredits.id,
						artistId: trackCredits.artistId,
						artistAliasId: trackCredits.artistAliasId,
						creditName: trackCredits.creditName,
						aliasName: artistAliases.name,
						artistName: artists.name,
						creditPosition: trackCredits.creditPosition,
					})
					.from(trackCredits)
					.leftJoin(
						artistAliases,
						eq(trackCredits.artistAliasId, artistAliases.id),
					)
					.leftJoin(artists, eq(trackCredits.artistId, artists.id))
					.where(inArray(trackCredits.trackId, trackIds))
					.orderBy(asc(trackCredits.creditPosition)),

				// クレジット役割
				db
					.select({
						trackCreditId: trackCreditRoles.trackCreditId,
						roleCode: trackCreditRoles.roleCode,
						roleName: creditRoles.label,
					})
					.from(trackCreditRoles)
					.innerJoin(
						creditRoles,
						eq(trackCreditRoles.roleCode, creditRoles.code),
					)
					.where(
						inArray(
							trackCreditRoles.trackCreditId,
							db
								.select({ id: trackCredits.id })
								.from(trackCredits)
								.where(inArray(trackCredits.trackId, trackIds)),
						),
					),

				// 原曲
				db
					.select({
						trackId: trackOfficialSongs.trackId,
						officialSongId: trackOfficialSongs.officialSongId,
						customSongName: trackOfficialSongs.customSongName,
						songName: officialSongs.name,
					})
					.from(trackOfficialSongs)
					.leftJoin(
						officialSongs,
						eq(trackOfficialSongs.officialSongId, officialSongs.id),
					)
					.where(inArray(trackOfficialSongs.trackId, trackIds)),
			]);

		// Step 5: メモリ上でマージ

		// 役割をクレジットIDでグループ化
		const rolesByCredit = new Map<
			string,
			Array<{ roleCode: string; roleName: string | null }>
		>();
		for (const role of creditsRolesData) {
			const existing = rolesByCredit.get(role.trackCreditId) ?? [];
			if (!rolesByCredit.has(role.trackCreditId)) {
				rolesByCredit.set(role.trackCreditId, existing);
			}
			existing.push({ roleCode: role.roleCode, roleName: role.roleName });
		}

		// クレジットをトラックIDでグループ化
		const creditsByTrack = new Map<
			string,
			Array<{
				artistId: string;
				artistAliasId: string | null;
				creditName: string;
				aliasName: string | null;
				artistName: string | null;
				roles: Array<{ roleCode: string; roleName: string | null }>;
			}>
		>();
		const artistIds = new Set<string>();
		for (const credit of creditsData) {
			artistIds.add(credit.artistId);
			const existing = creditsByTrack.get(credit.trackId) ?? [];
			if (!creditsByTrack.has(credit.trackId)) {
				creditsByTrack.set(credit.trackId, existing);
			}
			existing.push({
				artistId: credit.artistId,
				artistAliasId: credit.artistAliasId,
				creditName: credit.creditName,
				aliasName: credit.aliasName,
				artistName: credit.artistName,
				roles: rolesByCredit.get(credit.creditId) ?? [],
			});
		}

		// 原曲をトラックIDでグループ化
		const officialSongsByTrack = new Map<
			string,
			Array<{ officialSongId: string | null; songName: string }>
		>();
		for (const os of officialSongsData) {
			const existing = officialSongsByTrack.get(os.trackId) ?? [];
			if (!officialSongsByTrack.has(os.trackId)) {
				officialSongsByTrack.set(os.trackId, existing);
			}
			existing.push({
				officialSongId: os.officialSongId,
				songName: os.customSongName ?? os.songName ?? "",
			});
		}

		// トラックデータを構築
		const tracksWithDetails = tracksData.map((track) => ({
			id: track.id,
			discId: track.discId,
			trackNumber: track.trackNumber,
			name: track.name,
			nameJa: track.nameJa,
			nameEn: track.nameEn,
			credits: creditsByTrack.get(track.id) ?? [],
			officialSongs: officialSongsByTrack.get(track.id) ?? [],
		}));

		const response = {
			id: release.id,
			name: release.name,
			nameJa: release.nameJa,
			nameEn: release.nameEn,
			releaseDate: release.releaseDate,
			releaseYear: release.releaseYear,
			releaseMonth: release.releaseMonth,
			releaseDay: release.releaseDay,
			releaseType: release.releaseType,
			notes: release.notes,
			event: release.eventId
				? { id: release.eventId, name: release.eventName }
				: null,
			circles: circlesData,
			discs: discsData,
			tracks: tracksWithDetails,
			trackCount: tracksData.length,
			artistCount: artistIds.size,
			publications,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.RELEASE_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.RELEASE_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/releases/:id");
	}
});

export { releasesRouter };
