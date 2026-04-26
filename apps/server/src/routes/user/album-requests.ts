import {
	albumRequests,
	createAlbumRequestSchema,
	createId,
	db,
	desc,
	eq,
	releases,
} from "@thac/db";
import { Hono } from "hono";
import type { UserAuthContext } from "../../middleware/user-auth";
import { handleDbError } from "../../utils/api-error";

const albumRequestsUserRouter = new Hono<UserAuthContext>();

// 自分のアルバム申請一覧取得（最新50件）
albumRequestsUserRouter.get("/", async (c) => {
	try {
		const user = c.get("user");

		const items = await db
			.select({
				id: albumRequests.id,
				requestType: albumRequests.requestType,
				albumName: albumRequests.albumName,
				circleName: albumRequests.circleName,
				referenceUrls: albumRequests.referenceUrls,
				notes: albumRequests.notes,
				status: albumRequests.status,
				reviewerNotes: albumRequests.reviewerNotes,
				reviewedAt: albumRequests.reviewedAt,
				createdAt: albumRequests.createdAt,
				updatedAt: albumRequests.updatedAt,
				existingRelease: {
					id: releases.id,
					name: releases.name,
					nameJa: releases.nameJa,
					nameEn: releases.nameEn,
					releaseDate: releases.releaseDate,
				},
			})
			.from(albumRequests)
			.leftJoin(releases, eq(albumRequests.existingReleaseId, releases.id))
			.where(eq(albumRequests.userId, user.id))
			.orderBy(desc(albumRequests.createdAt))
			.limit(50);

		return c.json({ items });
	} catch (error) {
		return handleDbError(c, error, "GET /user/album-requests");
	}
});

// アルバム申請作成
albumRequestsUserRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = createAlbumRequestSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten(),
				},
				400,
			);
		}

		const { requestType } = parsed.data;
		const user = c.get("user");

		// existing タイプの場合は既存リリースの実在チェック
		if (requestType === "existing") {
			const existingReleaseId = parsed.data.existingReleaseId;
			const releaseExists = await db
				.select({ id: releases.id })
				.from(releases)
				.where(eq(releases.id, existingReleaseId))
				.limit(1);

			if (releaseExists.length === 0) {
				return c.json({ error: "指定された既存アルバムが見つかりません" }, 400);
			}
		}

		// INSERT
		const inserted = await db
			.insert(albumRequests)
			.values({
				id: createId.albumRequest(),
				userId: user.id,
				status: "pending",
				requestType,
				existingReleaseId:
					requestType === "existing" ? parsed.data.existingReleaseId : null,
				albumName: parsed.data.albumName ?? null,
				circleName: parsed.data.circleName ?? null,
				referenceUrls: parsed.data.referenceUrls,
				notes: parsed.data.notes ?? null,
			})
			.returning();

		return c.json(inserted[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /user/album-requests");
	}
});

export { albumRequestsUserRouter };
