import {
	circles,
	db,
	eq,
	inArray,
	releaseCircles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const artistCirclesRouter = new Hono<AdminContext>();

// アーティストの参加サークル一覧取得
// 経路: artist → trackCredits → tracks → releases → releaseCircles → circles
artistCirclesRouter.get("/:artistId/circles", async (c) => {
	const artistId = c.req.param("artistId");

	// アーティストのクレジット一覧からトラックIDを取得
	const creditsResult = await db
		.select({
			trackId: trackCredits.trackId,
		})
		.from(trackCredits)
		.where(eq(trackCredits.artistId, artistId));

	if (creditsResult.length === 0) {
		return c.json([]);
	}

	const trackIds = [...new Set(creditsResult.map((c) => c.trackId))];

	// トラックからリリースIDを取得
	const tracksResult = await db
		.select({
			releaseId: tracks.releaseId,
		})
		.from(tracks)
		.where(inArray(tracks.id, trackIds));

	const releaseIds = [
		...new Set(
			tracksResult
				.map((t) => t.releaseId)
				.filter((id): id is string => id !== null),
		),
	];

	if (releaseIds.length === 0) {
		return c.json([]);
	}

	// リリースサークル情報を取得
	const releaseCirclesResult = await db
		.select({
			releaseId: releaseCircles.releaseId,
			circleId: releaseCircles.circleId,
			participationType: releaseCircles.participationType,
		})
		.from(releaseCircles)
		.where(inArray(releaseCircles.releaseId, releaseIds));

	if (releaseCirclesResult.length === 0) {
		return c.json([]);
	}

	// サークル情報を取得
	const circleIds = [...new Set(releaseCirclesResult.map((rc) => rc.circleId))];
	const circleList = await db
		.select({
			id: circles.id,
			name: circles.name,
		})
		.from(circles)
		.where(inArray(circles.id, circleIds))
		.orderBy(circles.name);

	// サークルごとにリリース数と参加形態を集計
	const circleStats = new Map<
		string,
		{
			releaseCount: number;
			participationTypes: Set<string>;
		}
	>();

	for (const rc of releaseCirclesResult) {
		const stats = circleStats.get(rc.circleId) || {
			releaseCount: 0,
			participationTypes: new Set<string>(),
		};
		// 同じサークルでも異なるリリースをカウント
		if (!circleStats.has(rc.circleId)) {
			stats.releaseCount = 0;
		}
		stats.releaseCount++;
		stats.participationTypes.add(rc.participationType);
		circleStats.set(rc.circleId, stats);
	}

	// レスポンスを整形
	const result = circleList.map((circle) => {
		const stats = circleStats.get(circle.id);
		return {
			circleId: circle.id,
			circleName: circle.name,
			releaseCount: stats?.releaseCount ?? 0,
			participationTypes: stats ? Array.from(stats.participationTypes) : [],
		};
	});

	return c.json(result);
});

export { artistCirclesRouter };
