import {
	db,
	eq,
	inArray,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const artistTracksRouter = new Hono<AdminContext>();

// アーティストの関連楽曲取得（role別）
artistTracksRouter.get("/:artistId/tracks", async (c) => {
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
	const tracksWithRelease = trackList.map((t) => {
		const release = t.releaseId ? releaseMap.get(t.releaseId) : undefined;
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
					}
				: null,
		};
	});

	return c.json({
		totalUniqueTrackCount: trackIds.length,
		byRole: roleCount,
		tracks: tracksWithRelease,
	});
});

export { artistTracksRouter };
