import {
	circles,
	db,
	eq,
	inArray,
	releaseCircles,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const artistTracksRouter = new Hono<AdminContext>();

// アーティストの関連楽曲取得（role別）
artistTracksRouter.get("/:artistId/tracks", async (c) => {
	try {
		const artistId = c.req.param("artistId");

		// アーティストのクレジット一覧を取得
		const credits = await db
			.select({
				creditId: trackCredits.id,
				trackId: trackCredits.trackId,
				creditName: trackCredits.creditName,
			})
			.from(trackCredits)
			.where(eq(trackCredits.artistId, artistId));

		if (credits.length === 0) {
			return c.json({
				totalUniqueTrackCount: 0,
				byRole: {},
				tracks: [],
				statistics: {
					releaseCount: 0,
					earliestReleaseDate: null,
					latestReleaseDate: null,
				},
			});
		}

		const creditIds = credits.map((c) => c.creditId);
		const trackIds = [...new Set(credits.map((c) => c.trackId))];

		// クレジットの役割を取得
		const creditRoles = await db
			.select({
				trackCreditId: trackCreditRoles.trackCreditId,
				roleCode: trackCreditRoles.roleCode,
			})
			.from(trackCreditRoles)
			.where(inArray(trackCreditRoles.trackCreditId, creditIds));

		// トラック情報を取得
		const trackList = await db
			.select({
				id: tracks.id,
				name: tracks.name,
				nameJa: tracks.nameJa,
				releaseId: tracks.releaseId,
				trackNumber: tracks.trackNumber,
			})
			.from(tracks)
			.where(inArray(tracks.id, trackIds))
			.orderBy(tracks.name);

		// リリース情報を取得（nullを除外）
		const releaseIds = [
			...new Set(
				trackList
					.map((t) => t.releaseId)
					.filter((id): id is string => id !== null),
			),
		];
		const releaseList = await db
			.select({
				id: releases.id,
				name: releases.name,
				releaseDate: releases.releaseDate,
			})
			.from(releases)
			.where(inArray(releases.id, releaseIds));

		const releaseMap = new Map(releaseList.map((r) => [r.id, r]));

		// リリースサークル情報を取得
		const releaseCirclesList =
			releaseIds.length > 0
				? await db
						.select({
							releaseId: releaseCircles.releaseId,
							circleId: releaseCircles.circleId,
						})
						.from(releaseCircles)
						.where(inArray(releaseCircles.releaseId, releaseIds))
				: [];

		// サークル情報を取得
		const circleIds = [...new Set(releaseCirclesList.map((rc) => rc.circleId))];
		const circleList =
			circleIds.length > 0
				? await db
						.select({
							id: circles.id,
							name: circles.name,
						})
						.from(circles)
						.where(inArray(circles.id, circleIds))
				: [];

		const circleMap = new Map(circleList.map((c) => [c.id, c.name]));

		// リリースIDからサークル名一覧へのマップを作成
		const releaseCircleNamesMap = new Map<string, string[]>();
		for (const rc of releaseCirclesList) {
			const circleName = circleMap.get(rc.circleId);
			if (circleName) {
				const names = releaseCircleNamesMap.get(rc.releaseId) || [];
				if (!names.includes(circleName)) {
					names.push(circleName);
				}
				releaseCircleNamesMap.set(rc.releaseId, names);
			}
		}

		// クレジットIDからトラックIDへのマップ
		const creditToTrack = new Map(credits.map((c) => [c.creditId, c.trackId]));

		// 役割別に楽曲をグループ化
		const byRole: Record<string, Set<string>> = {};
		for (const cr of creditRoles) {
			const trackId = creditToTrack.get(cr.trackCreditId);
			if (trackId) {
				if (!byRole[cr.roleCode]) {
					byRole[cr.roleCode] = new Set();
				}
				const roleSet = byRole[cr.roleCode];
				if (roleSet) {
					roleSet.add(trackId);
				}
			}
		}

		// 役割別カウント
		const roleCount: Record<string, number> = {};
		for (const [roleCode, trackSet] of Object.entries(byRole)) {
			roleCount[roleCode] = trackSet.size;
		}

		// トラック情報を整形
		const tracksWithRelease = trackList
			.map((t) => {
				const release = t.releaseId ? releaseMap.get(t.releaseId) : undefined;
				const circleNames = t.releaseId
					? releaseCircleNamesMap.get(t.releaseId)
					: undefined;
				return {
					id: t.id,
					name: t.name,
					nameJa: t.nameJa,
					trackNumber: t.trackNumber,
					release: release
						? {
								id: release.id,
								name: release.name,
								releaseDate: release.releaseDate,
								circleNames: circleNames ? circleNames.join(" / ") : null,
							}
						: null,
				};
			})
			// 作品名 → トラック番号でソート
			.sort((a, b) => {
				// 作品なしは後ろへ
				if (!a.release && b.release) return 1;
				if (a.release && !b.release) return -1;
				if (!a.release && !b.release) return a.name.localeCompare(b.name);

				// ここに到達した時点で両方ともreleaseが存在する（上記の条件で除外済み）
				// biome-ignore lint/style/noNonNullAssertion: 上記の条件分岐で両方ともnullでないことが保証済み
				const releaseA = a.release!;
				// biome-ignore lint/style/noNonNullAssertion: 上記の条件分岐で両方ともnullでないことが保証済み
				const releaseB = b.release!;

				// 作品名でソート
				const releaseCompare = releaseA.name.localeCompare(releaseB.name);
				if (releaseCompare !== 0) return releaseCompare;

				// 同じ作品内ではトラック番号でソート
				return a.trackNumber - b.trackNumber;
			});

		// 統計情報を計算
		const releaseDates = releaseList
			.map((r) => r.releaseDate)
			.filter((d): d is string => d !== null)
			.sort();

		const statistics = {
			releaseCount: releaseList.length,
			earliestReleaseDate: releaseDates.length > 0 ? releaseDates[0] : null,
			latestReleaseDate:
				releaseDates.length > 0 ? releaseDates[releaseDates.length - 1] : null,
		};

		return c.json({
			totalUniqueTrackCount: trackIds.length,
			byRole: roleCount,
			tracks: tracksWithRelease,
			statistics,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artists/:artistId/tracks");
	}
});

export { artistTracksRouter };
