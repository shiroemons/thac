import {
	artists,
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

const circleArtistsRouter = new Hono<AdminContext>();

// サークルの参加アーティスト一覧取得
// 経路: circle → releaseCircles → releases → tracks → trackCredits → artists
circleArtistsRouter.get("/:circleId/artists", async (c) => {
	try {
		const circleId = c.req.param("circleId");

		// サークルのリリース一覧からリリースIDを取得
		const releaseCirclesResult = await db
			.select({
				releaseId: releaseCircles.releaseId,
			})
			.from(releaseCircles)
			.where(eq(releaseCircles.circleId, circleId));

		if (releaseCirclesResult.length === 0) {
			return c.json({
				artists: [],
				statistics: {
					totalArtistCount: 0,
					totalTrackCount: 0,
					releaseCount: 0,
				},
			});
		}

		const releaseIds = [
			...new Set(releaseCirclesResult.map((r) => r.releaseId)),
		];

		// リリースからトラックIDを取得（リリース日も取得して活動期間計算に使用）
		const tracksResult = await db
			.select({
				id: tracks.id,
				releaseId: tracks.releaseId,
			})
			.from(tracks)
			.where(inArray(tracks.releaseId, releaseIds));

		if (tracksResult.length === 0) {
			return c.json({
				artists: [],
				statistics: {
					totalArtistCount: 0,
					totalTrackCount: 0,
					releaseCount: releaseIds.length,
				},
			});
		}

		const trackIds = [...new Set(tracksResult.map((t) => t.id))];

		// トラックからクレジット情報を取得
		const creditsResult = await db
			.select({
				id: trackCredits.id,
				artistId: trackCredits.artistId,
				trackId: trackCredits.trackId,
			})
			.from(trackCredits)
			.where(inArray(trackCredits.trackId, trackIds));

		if (creditsResult.length === 0) {
			return c.json({
				artists: [],
				statistics: {
					totalArtistCount: 0,
					totalTrackCount: trackIds.length,
					releaseCount: releaseIds.length,
				},
			});
		}

		// クレジットの役割情報を取得
		const creditIds = creditsResult.map((c) => c.id);
		const rolesResult = await db
			.select({
				trackCreditId: trackCreditRoles.trackCreditId,
				roleCode: trackCreditRoles.roleCode,
			})
			.from(trackCreditRoles)
			.where(inArray(trackCreditRoles.trackCreditId, creditIds));

		// クレジットIDと役割のマッピング
		const creditToRolesMap = new Map<string, Set<string>>();
		for (const role of rolesResult) {
			const roles =
				creditToRolesMap.get(role.trackCreditId) || new Set<string>();
			roles.add(role.roleCode);
			creditToRolesMap.set(role.trackCreditId, roles);
		}

		// アーティスト情報を取得
		const artistIds = [...new Set(creditsResult.map((c) => c.artistId))];
		const artistList = await db
			.select({
				id: artists.id,
				name: artists.name,
			})
			.from(artists)
			.where(inArray(artists.id, artistIds))
			.orderBy(artists.name);

		// トラックとリリースのマッピング
		const trackToReleaseMap = new Map<string, string>();
		for (const track of tracksResult) {
			if (track.releaseId) {
				trackToReleaseMap.set(track.id, track.releaseId);
			}
		}

		// アーティストごとにトラック数、リリース数、役割を集計
		const artistStats = new Map<
			string,
			{
				trackIds: Set<string>;
				releaseIds: Set<string>;
				roles: Set<string>;
			}
		>();

		for (const credit of creditsResult) {
			const stats = artistStats.get(credit.artistId) || {
				trackIds: new Set<string>(),
				releaseIds: new Set<string>(),
				roles: new Set<string>(),
			};

			stats.trackIds.add(credit.trackId);

			// クレジットに紐づく役割を追加
			const creditRoles = creditToRolesMap.get(credit.id);
			if (creditRoles) {
				for (const role of creditRoles) {
					stats.roles.add(role);
				}
			}

			const releaseId = trackToReleaseMap.get(credit.trackId);
			if (releaseId) {
				stats.releaseIds.add(releaseId);
			}

			artistStats.set(credit.artistId, stats);
		}

		// レスポンスを整形
		const result = artistList.map((artist) => {
			const stats = artistStats.get(artist.id);
			return {
				artistId: artist.id,
				artistName: artist.name,
				trackCount: stats?.trackIds.size ?? 0,
				releaseCount: stats?.releaseIds.size ?? 0,
				roles: stats ? Array.from(stats.roles).sort() : [],
			};
		});

		// リリース日情報を取得して活動期間を計算
		const releasesData = await db
			.select({
				releaseDate: releases.releaseDate,
			})
			.from(releases)
			.where(inArray(releases.id, releaseIds));

		const releaseDates = releasesData
			.map((r) => r.releaseDate)
			.filter((d): d is string => d !== null)
			.sort();

		return c.json({
			artists: result,
			statistics: {
				totalArtistCount: artistList.length,
				totalTrackCount: trackIds.length,
				releaseCount: releaseIds.length,
				earliestReleaseDate: releaseDates[0] ?? null,
				latestReleaseDate: releaseDates[releaseDates.length - 1] ?? null,
			},
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles/:circleId/artists");
	}
});

export { circleArtistsRouter };
