import {
	and,
	db,
	eq,
	insertTrackDerivationSchema,
	releases,
	trackDerivations,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const trackDerivationsRouter = new Hono<AdminContext>();

// トラックの派生関係一覧取得
trackDerivationsRouter.get("/:trackId/derivations", async (c) => {
	try {
		const trackId = c.req.param("trackId");

		// トラック存在チェック
		const existingTrack = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, trackId))
			.limit(1);

		if (existingTrack.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// 派生関係一覧取得（派生元トラック情報・リリース情報を結合）
		const derivations = await db
			.select({
				derivation: trackDerivations,
				parentTrack: tracks,
				parentRelease: releases,
			})
			.from(trackDerivations)
			.leftJoin(tracks, eq(trackDerivations.parentTrackId, tracks.id))
			.leftJoin(releases, eq(tracks.releaseId, releases.id))
			.where(eq(trackDerivations.childTrackId, trackId));

		return c.json(
			derivations.map((row) => ({
				...row.derivation,
				parentTrack: row.parentTrack
					? {
							...row.parentTrack,
							releaseName: row.parentRelease?.name ?? null,
						}
					: null,
			})),
		);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tracks/:trackId/derivations");
	}
});

// 派生関係追加
trackDerivationsRouter.post("/:trackId/derivations", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const body = await c.req.json();

		// トラック存在チェック（子トラック）
		const existingTrack = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, trackId))
			.limit(1);

		if (existingTrack.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// 親トラック存在チェック
		const existingParentTrack = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, body.parentTrackId))
			.limit(1);

		if (existingParentTrack.length === 0) {
			return c.json({ error: ERROR_MESSAGES.PARENT_TRACK_NOT_FOUND }, 404);
		}

		// バリデーション（自己参照チェックを含む）
		const parsed = insertTrackDerivationSchema.safeParse({
			...body,
			childTrackId: trackId,
		});
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(trackDerivations)
			.where(eq(trackDerivations.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 一意性チェック（子トラック × 親トラック）
		const duplicateCheck = await db
			.select()
			.from(trackDerivations)
			.where(
				and(
					eq(trackDerivations.childTrackId, trackId),
					eq(trackDerivations.parentTrackId, parsed.data.parentTrackId),
				),
			)
			.limit(1);

		if (duplicateCheck.length > 0) {
			return c.json({ error: ERROR_MESSAGES.DERIVATION_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db
			.insert(trackDerivations)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/tracks/:trackId/derivations");
	}
});

// 派生関係削除
trackDerivationsRouter.delete("/:trackId/derivations/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");

		// 派生関係存在チェック
		const existingDerivation = await db
			.select()
			.from(trackDerivations)
			.where(
				and(
					eq(trackDerivations.id, id),
					eq(trackDerivations.childTrackId, trackId),
				),
			)
			.limit(1);

		if (existingDerivation.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(trackDerivations).where(eq(trackDerivations.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/tracks/:trackId/derivations/:id",
		);
	}
});

export { trackDerivationsRouter };
