import {
	circles,
	db,
	eq,
	releaseCircles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

/**
 * アーティストの参加サークル一覧を取得する関数
 * 統合エンドポイント用にロジックを分離
 * 経路: artist → trackCredits → tracks → releases → releaseCircles → circles
 */
export async function getArtistCircles(artistId: string) {
	// 1つのJOINチェーンで artist → credits → tracks → releaseCircles → circles を取得
	const rows = await db
		.select({
			circleId: circles.id,
			circleName: circles.name,
			releaseId: releaseCircles.releaseId,
			participationType: releaseCircles.participationType,
		})
		.from(trackCredits)
		.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
		.innerJoin(releaseCircles, eq(tracks.releaseId, releaseCircles.releaseId))
		.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
		.where(eq(trackCredits.artistId, artistId));

	if (rows.length === 0) {
		return [];
	}

	// メモリ上でサークルごとに集計
	const circleMap = new Map<
		string,
		{
			circleName: string;
			releases: Set<string>;
			participationTypes: Set<string>;
		}
	>();

	for (const row of rows) {
		const existing = circleMap.get(row.circleId) ?? {
			circleName: row.circleName,
			releases: new Set<string>(),
			participationTypes: new Set<string>(),
		};
		existing.releases.add(row.releaseId);
		existing.participationTypes.add(row.participationType);
		circleMap.set(row.circleId, existing);
	}

	// レスポンスを整形（名前順でソート）
	return Array.from(circleMap.entries())
		.map(([circleId, stats]) => ({
			circleId,
			circleName: stats.circleName,
			releaseCount: stats.releases.size,
			participationTypes: Array.from(stats.participationTypes),
		}))
		.sort((a, b) => a.circleName.localeCompare(b.circleName));
}

const artistCirclesRouter = new Hono<AdminContext>();

// アーティストの参加サークル一覧取得
// 経路: artist → trackCredits → tracks → releases → releaseCircles → circles
artistCirclesRouter.get("/:artistId/circles", async (c) => {
	try {
		const artistId = c.req.param("artistId");
		const result = await getArtistCircles(artistId);
		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artists/:artistId/circles");
	}
});

export { artistCirclesRouter };
