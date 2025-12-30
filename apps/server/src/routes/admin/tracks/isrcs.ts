import {
	and,
	db,
	eq,
	insertTrackIsrcSchema,
	trackIsrcs,
	tracks,
	updateTrackIsrcSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const trackIsrcsRouter = new Hono<AdminContext>();

// トラックのISRC一覧取得
trackIsrcsRouter.get("/:trackId/isrcs", async (c) => {
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

		// ISRC一覧取得
		const isrcs = await db
			.select()
			.from(trackIsrcs)
			.where(eq(trackIsrcs.trackId, trackId));

		return c.json(isrcs);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tracks/:trackId/isrcs");
	}
});

// ISRC追加
trackIsrcsRouter.post("/:trackId/isrcs", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const body = await c.req.json();

		// トラック存在チェック
		const existingTrack = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, trackId))
			.limit(1);

		if (existingTrack.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = insertTrackIsrcSchema.safeParse({
			...body,
			trackId,
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
			.from(trackIsrcs)
			.where(eq(trackIsrcs.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// トラック×ISRCの一意性チェック
		const isrcDuplicateCheck = await db
			.select()
			.from(trackIsrcs)
			.where(
				and(
					eq(trackIsrcs.trackId, trackId),
					eq(trackIsrcs.isrc, parsed.data.isrc),
				),
			)
			.limit(1);

		if (isrcDuplicateCheck.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ISRC_ALREADY_EXISTS }, 409);
		}

		// isPrimary制約チェック（同一トラック内でisPrimaryは1件のみ）
		if (parsed.data.isPrimary) {
			const primaryCheck = await db
				.select()
				.from(trackIsrcs)
				.where(
					and(eq(trackIsrcs.trackId, trackId), eq(trackIsrcs.isPrimary, true)),
				)
				.limit(1);

			if (primaryCheck.length > 0) {
				return c.json(
					{ error: ERROR_MESSAGES.PRIMARY_ISRC_ALREADY_EXISTS },
					409,
				);
			}
		}

		// 作成
		const result = await db.insert(trackIsrcs).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/tracks/:trackId/isrcs");
	}
});

// ISRC更新
trackIsrcsRouter.put("/:trackId/isrcs/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");
		const body = await c.req.json();

		// ISRC存在チェック
		const existingIsrc = await db
			.select()
			.from(trackIsrcs)
			.where(and(eq(trackIsrcs.id, id), eq(trackIsrcs.trackId, trackId)))
			.limit(1);

		if (existingIsrc.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateTrackIsrcSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// isPrimary変更時の制約チェック
		if (parsed.data.isPrimary) {
			const primaryCheck = await db
				.select()
				.from(trackIsrcs)
				.where(
					and(eq(trackIsrcs.trackId, trackId), eq(trackIsrcs.isPrimary, true)),
				)
				.limit(1);

			if (primaryCheck.length > 0 && primaryCheck[0]?.id !== id) {
				return c.json(
					{ error: ERROR_MESSAGES.PRIMARY_ISRC_ALREADY_EXISTS },
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(trackIsrcs)
			.set(parsed.data)
			.where(eq(trackIsrcs.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/tracks/:trackId/isrcs/:id");
	}
});

// ISRC削除
trackIsrcsRouter.delete("/:trackId/isrcs/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");

		// ISRC存在チェック
		const existingIsrc = await db
			.select()
			.from(trackIsrcs)
			.where(and(eq(trackIsrcs.id, id), eq(trackIsrcs.trackId, trackId)))
			.limit(1);

		if (existingIsrc.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(trackIsrcs).where(eq(trackIsrcs.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/tracks/:trackId/isrcs/:id");
	}
});

export { trackIsrcsRouter };
