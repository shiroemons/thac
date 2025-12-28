import {
	and,
	db,
	eq,
	insertTrackPublicationSchema,
	platforms,
	trackPublications,
	tracks,
	updateTrackPublicationSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const trackPublicationsRouter = new Hono<AdminContext>();

// トラックの公開リンク一覧取得
trackPublicationsRouter.get("/:trackId/publications", async (c) => {
	try {
		const trackId = c.req.param("trackId");

		// トラック存在チェック
		const existingTrack = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, trackId))
			.limit(1);

		if (existingTrack.length === 0) {
			return c.json({ error: "Track not found" }, 404);
		}

		// 公開リンク一覧取得（プラットフォーム情報を結合）
		const publications = await db
			.select({
				publication: trackPublications,
				platform: platforms,
			})
			.from(trackPublications)
			.leftJoin(platforms, eq(trackPublications.platformCode, platforms.code))
			.where(eq(trackPublications.trackId, trackId));

		return c.json(
			publications.map((row) => ({
				...row.publication,
				platform: row.platform,
			})),
		);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tracks/:trackId/publications");
	}
});

// 公開リンク追加
trackPublicationsRouter.post("/:trackId/publications", async (c) => {
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
			return c.json({ error: "Track not found" }, 404);
		}

		// プラットフォーム存在チェック
		const existingPlatform = await db
			.select()
			.from(platforms)
			.where(eq(platforms.code, body.platformCode))
			.limit(1);

		if (existingPlatform.length === 0) {
			return c.json({ error: "Platform not found" }, 404);
		}

		// バリデーション
		const parsed = insertTrackPublicationSchema.safeParse({
			...body,
			trackId,
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

		// ID重複チェック
		const existingId = await db
			.select()
			.from(trackPublications)
			.where(eq(trackPublications.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: "ID already exists" }, 409);
		}

		// URL重複チェック
		const urlDuplicateCheck = await db
			.select()
			.from(trackPublications)
			.where(eq(trackPublications.url, parsed.data.url))
			.limit(1);

		if (urlDuplicateCheck.length > 0) {
			return c.json({ error: "URL already exists" }, 409);
		}

		// 作成
		const result = await db
			.insert(trackPublications)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/tracks/:trackId/publications");
	}
});

// 公開リンク更新
trackPublicationsRouter.put("/:trackId/publications/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");
		const body = await c.req.json();

		// 公開リンク存在チェック
		const existingPublication = await db
			.select()
			.from(trackPublications)
			.where(
				and(
					eq(trackPublications.id, id),
					eq(trackPublications.trackId, trackId),
				),
			)
			.limit(1);

		if (existingPublication.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// バリデーション
		const parsed = updateTrackPublicationSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// URL重複チェック（自分自身以外で）
		if (parsed.data.url) {
			const urlDuplicateCheck = await db
				.select()
				.from(trackPublications)
				.where(eq(trackPublications.url, parsed.data.url))
				.limit(1);

			if (urlDuplicateCheck.length > 0 && urlDuplicateCheck[0]?.id !== id) {
				return c.json({ error: "URL already exists" }, 409);
			}
		}

		// 更新
		const result = await db
			.update(trackPublications)
			.set(parsed.data)
			.where(eq(trackPublications.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/tracks/:trackId/publications/:id",
		);
	}
});

// 公開リンク削除
trackPublicationsRouter.delete("/:trackId/publications/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");

		// 公開リンク存在チェック
		const existingPublication = await db
			.select()
			.from(trackPublications)
			.where(
				and(
					eq(trackPublications.id, id),
					eq(trackPublications.trackId, trackId),
				),
			)
			.limit(1);

		if (existingPublication.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// 削除
		await db.delete(trackPublications).where(eq(trackPublications.id, id));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/tracks/:trackId/publications/:id",
		);
	}
});

export { trackPublicationsRouter };
