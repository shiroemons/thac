import {
	and,
	circles,
	db,
	eq,
	insertReleaseCircleSchema,
	releaseCircles,
	releases,
	updateReleaseCircleSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const releaseCirclesRouter = new Hono<AdminContext>();

// 作品の関連サークル一覧取得（position順）
releaseCirclesRouter.get("/:releaseId/circles", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");

		// 作品存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: "Release not found" }, 404);
		}

		// 関連サークル一覧取得（サークル情報を含む）
		const releaseCirclesList = await db
			.select({
				releaseId: releaseCircles.releaseId,
				circleId: releaseCircles.circleId,
				participationType: releaseCircles.participationType,
				position: releaseCircles.position,
				circle: {
					id: circles.id,
					name: circles.name,
					nameJa: circles.nameJa,
					nameEn: circles.nameEn,
				},
			})
			.from(releaseCircles)
			.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
			.where(eq(releaseCircles.releaseId, releaseId))
			.orderBy(releaseCircles.position);

		return c.json(releaseCirclesList);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases/:releaseId/circles");
	}
});

// サークル関連付け追加
releaseCirclesRouter.post("/:releaseId/circles", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const body = await c.req.json();

		// 作品存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: "Release not found" }, 404);
		}

		// バリデーション
		const parsed = insertReleaseCircleSchema.safeParse({
			...body,
			releaseId,
		});
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// サークル存在チェック
		const existingCircle = await db
			.select()
			.from(circles)
			.where(eq(circles.id, parsed.data.circleId))
			.limit(1);

		if (existingCircle.length === 0) {
			return c.json({ error: "Circle not found" }, 404);
		}

		// 重複チェック（同一作品・同一サークル・同一参加形態）
		const existingAssociation = await db
			.select()
			.from(releaseCircles)
			.where(
				and(
					eq(releaseCircles.releaseId, releaseId),
					eq(releaseCircles.circleId, parsed.data.circleId),
					eq(releaseCircles.participationType, parsed.data.participationType),
				),
			)
			.limit(1);

		if (existingAssociation.length > 0) {
			return c.json({ error: "Association already exists" }, 409);
		}

		// positionが未指定の場合、最大値+1を設定
		let position = parsed.data.position;
		if (position === undefined) {
			const maxPositionResult = await db
				.select({ maxPos: releaseCircles.position })
				.from(releaseCircles)
				.where(eq(releaseCircles.releaseId, releaseId))
				.orderBy(releaseCircles.position)
				.limit(1);

			const maxPos = maxPositionResult[0]?.maxPos ?? 0;
			position = (maxPos ?? 0) + 1;
		}

		// 作成
		const result = await db
			.insert(releaseCircles)
			.values({
				...parsed.data,
				position,
			})
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/releases/:releaseId/circles");
	}
});

// 関連付け更新（参加形態・順序）
releaseCirclesRouter.patch("/:releaseId/circles/:circleId", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const circleId = c.req.param("circleId");
		const participationType = c.req.query("participationType");
		const body = await c.req.json();

		// 参加形態が指定されていない場合はエラー
		if (!participationType) {
			return c.json(
				{ error: "participationType query parameter is required" },
				400,
			);
		}

		// 存在チェック
		const existing = await db
			.select()
			.from(releaseCircles)
			.where(
				and(
					eq(releaseCircles.releaseId, releaseId),
					eq(releaseCircles.circleId, circleId),
					eq(releaseCircles.participationType, participationType),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// バリデーション
		const parsed = updateReleaseCircleSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 更新
		const result = await db
			.update(releaseCircles)
			.set(parsed.data)
			.where(
				and(
					eq(releaseCircles.releaseId, releaseId),
					eq(releaseCircles.circleId, circleId),
					eq(releaseCircles.participationType, participationType),
				),
			)
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PATCH /admin/releases/:releaseId/circles/:circleId",
		);
	}
});

// 関連付け解除
releaseCirclesRouter.delete("/:releaseId/circles/:circleId", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const circleId = c.req.param("circleId");
		const participationType = c.req.query("participationType");

		// 参加形態が指定されていない場合はエラー
		if (!participationType) {
			return c.json(
				{ error: "participationType query parameter is required" },
				400,
			);
		}

		// 存在チェック
		const existing = await db
			.select()
			.from(releaseCircles)
			.where(
				and(
					eq(releaseCircles.releaseId, releaseId),
					eq(releaseCircles.circleId, circleId),
					eq(releaseCircles.participationType, participationType),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// 削除
		await db
			.delete(releaseCircles)
			.where(
				and(
					eq(releaseCircles.releaseId, releaseId),
					eq(releaseCircles.circleId, circleId),
					eq(releaseCircles.participationType, participationType),
				),
			);

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/releases/:releaseId/circles/:circleId",
		);
	}
});

export { releaseCirclesRouter };
