import {
	and,
	db,
	discs,
	eq,
	insertTrackSchema,
	isNull,
	releases,
	type Track,
	trackCredits,
	tracks,
	updateTrackSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const tracksRouter = new Hono<AdminContext>();

// リリースのトラック一覧取得（ディスク・トラック番号順）
tracksRouter.get("/:releaseId/tracks", async (c) => {
	const releaseId = c.req.param("releaseId");

	// リリース存在チェック
	const existingRelease = await db
		.select()
		.from(releases)
		.where(eq(releases.id, releaseId))
		.limit(1);

	if (existingRelease.length === 0) {
		return c.json({ error: "Release not found" }, 404);
	}

	// トラック一覧取得（クレジット数を含む）
	const releaseTracks = await db
		.select({
			track: tracks,
			creditCount: db.$count(trackCredits, eq(trackCredits.trackId, tracks.id)),
		})
		.from(tracks)
		.where(eq(tracks.releaseId, releaseId))
		.orderBy(tracks.discId, tracks.trackNumber);

	// レスポンス形式に変換
	const result = releaseTracks.map((row) => ({
		...row.track,
		creditCount: row.creditCount,
	}));

	return c.json(result);
});

// トラック追加
tracksRouter.post("/:releaseId/tracks", async (c) => {
	const releaseId = c.req.param("releaseId");
	const body = await c.req.json();

	// リリース存在チェック
	const existingRelease = await db
		.select()
		.from(releases)
		.where(eq(releases.id, releaseId))
		.limit(1);

	if (existingRelease.length === 0) {
		return c.json({ error: "Release not found" }, 404);
	}

	// ディスク存在チェック（指定された場合）
	if (body.discId) {
		const existingDisc = await db
			.select()
			.from(discs)
			.where(and(eq(discs.id, body.discId), eq(discs.releaseId, releaseId)))
			.limit(1);

		if (existingDisc.length === 0) {
			return c.json({ error: "Disc not found" }, 404);
		}
	}

	// バリデーション
	const parsed = insertTrackSchema.safeParse({
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

	// ID重複チェック
	const existingId = await db
		.select()
		.from(tracks)
		.where(eq(tracks.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// トラック番号重複チェック（ディスク有無で分岐）
	const discId = parsed.data.discId;
	let duplicateCheck: Track[];

	if (discId) {
		// ディスク内でトラック番号の一意性チェック
		duplicateCheck = await db
			.select()
			.from(tracks)
			.where(
				and(
					eq(tracks.discId, discId),
					eq(tracks.trackNumber, parsed.data.trackNumber),
				),
			)
			.limit(1);
	} else {
		// ディスクなし（単曲）の場合、リリース内でトラック番号の一意性チェック
		duplicateCheck = await db
			.select()
			.from(tracks)
			.where(
				and(
					eq(tracks.releaseId, releaseId),
					isNull(tracks.discId),
					eq(tracks.trackNumber, parsed.data.trackNumber),
				),
			)
			.limit(1);
	}

	if (duplicateCheck.length > 0) {
		return c.json(
			{
				error: discId
					? "Track number already exists for this disc"
					: "Track number already exists for this release",
			},
			409,
		);
	}

	// 作成
	const result = await db.insert(tracks).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// トラック更新
tracksRouter.put("/:releaseId/tracks/:trackId", async (c) => {
	const releaseId = c.req.param("releaseId");
	const trackId = c.req.param("trackId");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(tracks)
		.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// ディスク存在チェック（指定された場合）
	if (body.discId !== undefined && body.discId !== null) {
		const existingDisc = await db
			.select()
			.from(discs)
			.where(and(eq(discs.id, body.discId), eq(discs.releaseId, releaseId)))
			.limit(1);

		if (existingDisc.length === 0) {
			return c.json({ error: "Disc not found" }, 404);
		}
	}

	// バリデーション
	const parsed = updateTrackSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// トラック番号またはディスクが変更される場合の重複チェック
	const currentTrack = existing[0];
	const newDiscId =
		parsed.data.discId !== undefined
			? parsed.data.discId
			: currentTrack?.discId;
	const newTrackNumber =
		parsed.data.trackNumber !== undefined
			? parsed.data.trackNumber
			: currentTrack?.trackNumber;

	if (newTrackNumber !== undefined) {
		let duplicateCheck: Track[];

		if (newDiscId) {
			duplicateCheck = await db
				.select()
				.from(tracks)
				.where(
					and(
						eq(tracks.discId, newDiscId),
						eq(tracks.trackNumber, newTrackNumber),
					),
				)
				.limit(1);
		} else {
			duplicateCheck = await db
				.select()
				.from(tracks)
				.where(
					and(
						eq(tracks.releaseId, releaseId),
						isNull(tracks.discId),
						eq(tracks.trackNumber, newTrackNumber),
					),
				)
				.limit(1);
		}

		if (duplicateCheck.length > 0 && duplicateCheck[0]?.id !== trackId) {
			return c.json(
				{
					error: newDiscId
						? "Track number already exists for this disc"
						: "Track number already exists for this release",
				},
				409,
			);
		}
	}

	// 更新
	const result = await db
		.update(tracks)
		.set(parsed.data)
		.where(eq(tracks.id, trackId))
		.returning();

	return c.json(result[0]);
});

// トラック削除
tracksRouter.delete("/:releaseId/tracks/:trackId", async (c) => {
	const releaseId = c.req.param("releaseId");
	const trackId = c.req.param("trackId");

	// 存在チェック
	const existing = await db
		.select()
		.from(tracks)
		.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(tracks).where(eq(tracks.id, trackId));

	return c.json({ success: true });
});

// トラック並び順変更
tracksRouter.patch("/:releaseId/tracks/:trackId/reorder", async (c) => {
	const releaseId = c.req.param("releaseId");
	const trackId = c.req.param("trackId");
	const body = await c.req.json();

	const { direction } = body as { direction: "up" | "down" };

	if (direction !== "up" && direction !== "down") {
		return c.json({ error: "Invalid direction. Use 'up' or 'down'" }, 400);
	}

	// 対象トラック取得
	const targetTrack = await db
		.select()
		.from(tracks)
		.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
		.limit(1);

	if (targetTrack.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	const target = targetTrack[0];
	if (!target) {
		return c.json({ error: "Not found" }, 404);
	}

	// 同じスコープ内（同じディスクまたはディスクなし）のトラック取得
	let scopeTracks: Track[];
	if (target.discId) {
		scopeTracks = await db
			.select()
			.from(tracks)
			.where(eq(tracks.discId, target.discId))
			.orderBy(tracks.trackNumber);
	} else {
		scopeTracks = await db
			.select()
			.from(tracks)
			.where(and(eq(tracks.releaseId, releaseId), isNull(tracks.discId)))
			.orderBy(tracks.trackNumber);
	}

	// 対象トラックの位置を特定
	const targetIndex = scopeTracks.findIndex((t) => t.id === trackId);

	// 移動先トラックを特定
	const swapIndex = direction === "up" ? targetIndex - 1 : targetIndex + 1;

	if (swapIndex < 0 || swapIndex >= scopeTracks.length) {
		return c.json(
			{ error: direction === "up" ? "Already at top" : "Already at bottom" },
			400,
		);
	}

	const swapTrack = scopeTracks[swapIndex];
	if (!swapTrack) {
		return c.json({ error: "Swap target not found" }, 400);
	}

	// トラック番号を入れ替え
	const tempTrackNumber = target.trackNumber;
	await db
		.update(tracks)
		.set({ trackNumber: swapTrack.trackNumber })
		.where(eq(tracks.id, target.id));
	await db
		.update(tracks)
		.set({ trackNumber: tempTrackNumber })
		.where(eq(tracks.id, swapTrack.id));

	// 更新後のトラック一覧を取得
	let updatedTracks: Track[];
	if (target.discId) {
		updatedTracks = await db
			.select()
			.from(tracks)
			.where(eq(tracks.discId, target.discId))
			.orderBy(tracks.trackNumber);
	} else {
		updatedTracks = await db
			.select()
			.from(tracks)
			.where(and(eq(tracks.releaseId, releaseId), isNull(tracks.discId)))
			.orderBy(tracks.trackNumber);
	}

	return c.json(updatedTracks);
});

export { tracksRouter };
