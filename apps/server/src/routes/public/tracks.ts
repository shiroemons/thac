import {
	and,
	asc,
	creditRoles,
	db,
	discs,
	eq,
	events,
	gt,
	inArray,
	lt,
	officialSongs,
	officialWorks,
	platforms,
	releases,
	trackCreditRoles,
	trackCredits,
	trackDerivations,
	trackOfficialSongs,
	trackPublications,
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

const tracksRouter = new Hono();

/**
 * GET /api/public/tracks/:id
 * トラック詳細を取得（リリース、クレジット、原曲、派生関係、前後トラック、配信リンク含む）
 */
tracksRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const cacheKey = cacheKeys.trackDetail(id);

		// キャッシュチェック
		const cached = getCache<unknown>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: CACHE_TTL.TRACK_DETAIL });
			return c.json(cached);
		}

		// Step 1: トラック基本情報を取得（JOINでリリース・ディスク・イベント情報も一括取得）
		const trackResult = await db
			.select({
				id: tracks.id,
				name: tracks.name,
				nameJa: tracks.nameJa,
				nameEn: tracks.nameEn,
				trackNumber: tracks.trackNumber,
				releaseId: tracks.releaseId,
				discId: tracks.discId,
				releaseName: releases.name,
				releaseDate: releases.releaseDate,
				releaseType: releases.releaseType,
				discNumber: discs.discNumber,
				discName: discs.discName,
				eventId: events.id,
				eventName: events.name,
			})
			.from(tracks)
			.leftJoin(releases, eq(tracks.releaseId, releases.id))
			.leftJoin(discs, eq(tracks.discId, discs.id))
			.leftJoin(events, eq(releases.eventId, events.id))
			.where(eq(tracks.id, id))
			.limit(1);

		if (trackResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// Non-null assertion is safe here because we checked length above
		const track = trackResult[0]!;

		// Step 2: 関連データを並列取得（N+1回避）
		const [
			creditsData,
			officialSongsData,
			parentTracksData,
			publicationsData,
			siblingTracksData,
		] = await Promise.all([
			// クレジット（役割含む）
			db
				.select({
					creditId: trackCredits.id,
					artistId: trackCredits.artistId,
					creditName: trackCredits.creditName,
					creditPosition: trackCredits.creditPosition,
				})
				.from(trackCredits)
				.where(eq(trackCredits.trackId, id))
				.orderBy(asc(trackCredits.creditPosition)),

			// 原曲
			db
				.select({
					officialSongId: trackOfficialSongs.officialSongId,
					customSongName: trackOfficialSongs.customSongName,
					partPosition: trackOfficialSongs.partPosition,
					startSecond: trackOfficialSongs.startSecond,
					endSecond: trackOfficialSongs.endSecond,
					songName: officialSongs.name,
					workId: officialSongs.officialWorkId,
					workName: officialWorks.name,
				})
				.from(trackOfficialSongs)
				.leftJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.leftJoin(
					officialWorks,
					eq(officialSongs.officialWorkId, officialWorks.id),
				)
				.where(eq(trackOfficialSongs.trackId, id))
				.orderBy(asc(trackOfficialSongs.partPosition)),

			// 派生元トラック
			db
				.select({
					parentTrackId: trackDerivations.parentTrackId,
					parentTrackName: tracks.name,
					parentReleaseId: releases.id,
					parentReleaseName: releases.name,
				})
				.from(trackDerivations)
				.innerJoin(tracks, eq(trackDerivations.parentTrackId, tracks.id))
				.leftJoin(releases, eq(tracks.releaseId, releases.id))
				.where(eq(trackDerivations.childTrackId, id)),

			// 配信リンク
			db
				.select({
					id: trackPublications.id,
					platformCode: trackPublications.platformCode,
					url: trackPublications.url,
					platformName: platforms.name,
					platformCategory: platforms.category,
				})
				.from(trackPublications)
				.innerJoin(
					platforms,
					eq(trackPublications.platformCode, platforms.code),
				)
				.where(eq(trackPublications.trackId, id)),

			// 前後トラック（同じリリース内）
			track.releaseId
				? Promise.all([
						// 前のトラック
						db
							.select({
								id: tracks.id,
								name: tracks.name,
								trackNumber: tracks.trackNumber,
							})
							.from(tracks)
							.where(
								track.discId
									? and(
											eq(tracks.discId, track.discId),
											lt(tracks.trackNumber, track.trackNumber),
										)
									: and(
											eq(tracks.releaseId, track.releaseId!),
											lt(tracks.trackNumber, track.trackNumber),
										),
							)
							.orderBy(asc(tracks.trackNumber))
							.limit(1),
						// 次のトラック
						db
							.select({
								id: tracks.id,
								name: tracks.name,
								trackNumber: tracks.trackNumber,
							})
							.from(tracks)
							.where(
								track.discId
									? and(
											eq(tracks.discId, track.discId),
											gt(tracks.trackNumber, track.trackNumber),
										)
									: and(
											eq(tracks.releaseId, track.releaseId!),
											gt(tracks.trackNumber, track.trackNumber),
										),
							)
							.orderBy(asc(tracks.trackNumber))
							.limit(1),
					])
				: Promise.resolve([[], []]),
		]);

		// Step 3: クレジット役割をバッチ取得
		const creditIds = creditsData.map((c) => c.creditId);
		let rolesData: Array<{
			trackCreditId: string;
			roleCode: string;
			roleName: string | null;
		}> = [];

		if (creditIds.length > 0) {
			rolesData = await db
				.select({
					trackCreditId: trackCreditRoles.trackCreditId,
					roleCode: trackCreditRoles.roleCode,
					roleName: creditRoles.label,
				})
				.from(trackCreditRoles)
				.innerJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(inArray(trackCreditRoles.trackCreditId, creditIds));
		}

		// Step 4: メモリ上でマージ

		// 役割をクレジットIDでグループ化
		const rolesByCredit = new Map<
			string,
			Array<{ roleCode: string; roleName: string | null }>
		>();
		for (const role of rolesData) {
			const existing = rolesByCredit.get(role.trackCreditId) ?? [];
			if (!rolesByCredit.has(role.trackCreditId)) {
				rolesByCredit.set(role.trackCreditId, existing);
			}
			existing.push({ roleCode: role.roleCode, roleName: role.roleName });
		}

		// クレジットデータを構築
		const credits = creditsData.map((credit) => ({
			artistId: credit.artistId,
			creditName: credit.creditName,
			roles: rolesByCredit.get(credit.creditId) ?? [],
		}));

		// 原曲データを構築
		const officialSongsResult = officialSongsData.map((os) => ({
			officialSongId: os.officialSongId,
			songName: os.customSongName ?? os.songName ?? "",
			workName: os.workName ?? "",
			partPosition: os.partPosition,
			startSecond: os.startSecond,
			endSecond: os.endSecond,
		}));

		// 派生元データを構築
		const parentTracks = parentTracksData.map((pt) => ({
			parentTrackId: pt.parentTrackId,
			parentTrackName: pt.parentTrackName,
			parentReleaseName: pt.parentReleaseName ?? "",
		}));

		// 前後トラックを取得
		const [prevTracks, nextTracks] = siblingTracksData as [
			Array<{ id: string; name: string; trackNumber: number }>,
			Array<{ id: string; name: string; trackNumber: number }>,
		];

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

		const response = {
			id: track.id,
			name: track.name,
			nameJa: track.nameJa,
			nameEn: track.nameEn,
			trackNumber: track.trackNumber,
			credits,
			officialSongs: officialSongsResult,
			release: track.releaseId
				? {
						id: track.releaseId,
						name: track.releaseName ?? "",
						releaseDate: track.releaseDate,
						releaseType: track.releaseType,
					}
				: null,
			disc: track.discId
				? {
						id: track.discId,
						discNumber: track.discNumber ?? 1,
						discName: track.discName,
					}
				: null,
			event: track.eventId
				? { id: track.eventId, name: track.eventName ?? "" }
				: null,
			parentTracks,
			siblingTracks: {
				prev: prevTracks.length > 0 ? prevTracks[0] : null,
				next: nextTracks.length > 0 ? nextTracks[0] : null,
			},
			publications,
		};

		// キャッシュに保存
		setCache(cacheKey, response, CACHE_TTL.TRACK_DETAIL);
		setCacheHeaders(c, { maxAge: CACHE_TTL.TRACK_DETAIL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/tracks/:id");
	}
});

export { tracksRouter };
