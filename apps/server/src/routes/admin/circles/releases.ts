import {
	db,
	eq,
	type ParticipationType,
	releaseCircles,
	releases,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

/**
 * サークルのリリース一覧を取得する関数
 * 統合エンドポイント用にロジックを分離
 * 参加形態別にグループ化して返す
 */
export async function getCircleReleases(circleId: string) {
	// リリースを参加形態別に取得
	const data = await db
		.select({
			releaseId: releases.id,
			releaseName: releases.name,
			releaseDate: releases.releaseDate,
			releaseType: releases.releaseType,
			participationType: releaseCircles.participationType,
		})
		.from(releaseCircles)
		.innerJoin(releases, eq(releaseCircles.releaseId, releases.id))
		.where(eq(releaseCircles.circleId, circleId))
		.orderBy(releases.releaseDate, releaseCircles.position);

	// 参加形態別にグループ化
	const participationOrder: ParticipationType[] = [
		"host",
		"co-host",
		"participant",
		"guest",
		"split_partner",
	];

	const grouped = participationOrder
		.map((type) => ({
			participationType: type,
			releases: data
				.filter((d) => d.participationType === type)
				.map((d) => ({
					id: d.releaseId,
					name: d.releaseName,
					releaseDate: d.releaseDate,
					releaseType: d.releaseType,
				})),
		}))
		.filter((g) => g.releases.length > 0);

	return grouped;
}

const circleReleasesRouter = new Hono<AdminContext>();

// サークルのリリース一覧取得（参加形態別にグループ化）
circleReleasesRouter.get("/:circleId/releases", async (c) => {
	try {
		const circleId = c.req.param("circleId");
		const result = await getCircleReleases(circleId);
		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles/:circleId/releases");
	}
});

export { circleReleasesRouter };
