import {
	and,
	db,
	eq,
	insertTrackOfficialSongSchema,
	max,
	officialSongs,
	trackOfficialSongs,
	tracks,
	updateTrackOfficialSongSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const trackOfficialSongsRouter = new Hono<AdminContext>();

// トラックの原曲紐付け一覧取得
trackOfficialSongsRouter.get("/:trackId/official-songs", async (c) => {
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

		// 原曲紐付け一覧取得（公式楽曲情報を結合）
		const relations = await db
			.select({
				relation: trackOfficialSongs,
				officialSong: officialSongs,
			})
			.from(trackOfficialSongs)
			.leftJoin(
				officialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.where(eq(trackOfficialSongs.trackId, trackId))
			.orderBy(trackOfficialSongs.partPosition);

		return c.json(
			relations.map((row) => ({
				...row.relation,
				officialSong: row.officialSong,
			})),
		);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tracks/:trackId/official-songs");
	}
});

// 原曲紐付け追加
trackOfficialSongsRouter.post("/:trackId/official-songs", async (c) => {
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

		// 公式楽曲存在チェック（officialSongIdが指定されている場合のみ）
		if (body.officialSongId) {
			const existingOfficialSong = await db
				.select()
				.from(officialSongs)
				.where(eq(officialSongs.id, body.officialSongId))
				.limit(1);

			if (existingOfficialSong.length === 0) {
				return c.json({ error: ERROR_MESSAGES.SONG_NOT_FOUND }, 404);
			}
		}

		// partPositionが未指定の場合は自動付与（現在の最大値 + 1）
		let autoPartPosition = body.partPosition;
		if (autoPartPosition == null) {
			const maxResult = await db
				.select({ maxPos: max(trackOfficialSongs.partPosition) })
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.trackId, trackId));
			autoPartPosition = (maxResult[0]?.maxPos ?? 0) + 1;
		}

		// バリデーション
		const parsed = insertTrackOfficialSongSchema.safeParse({
			...body,
			trackId,
			partPosition: autoPartPosition,
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
			.from(trackOfficialSongs)
			.where(eq(trackOfficialSongs.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 一意性チェック（トラック × 公式楽曲 × 順序、公式楽曲が指定されている場合のみ）
		if (parsed.data.officialSongId) {
			const duplicateCheck = await db
				.select()
				.from(trackOfficialSongs)
				.where(
					and(
						eq(trackOfficialSongs.trackId, trackId),
						eq(trackOfficialSongs.officialSongId, parsed.data.officialSongId),
						parsed.data.partPosition != null
							? eq(trackOfficialSongs.partPosition, parsed.data.partPosition)
							: undefined,
					),
				)
				.limit(1);

			if (duplicateCheck.length > 0) {
				return c.json(
					{
						error: ERROR_MESSAGES.OFFICIAL_SONG_ALREADY_LINKED,
					},
					409,
				);
			}
		}

		// 作成
		const result = await db
			.insert(trackOfficialSongs)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"POST /admin/tracks/:trackId/official-songs",
		);
	}
});

// 原曲紐付け更新
trackOfficialSongsRouter.put("/:trackId/official-songs/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");
		const body = await c.req.json();

		// 紐付け存在チェック
		const existingRelation = await db
			.select()
			.from(trackOfficialSongs)
			.where(
				and(
					eq(trackOfficialSongs.id, id),
					eq(trackOfficialSongs.trackId, trackId),
				),
			)
			.limit(1);

		if (existingRelation.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateTrackOfficialSongSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 一意性チェック（partPositionを変更する場合）
		const currentRelation = existingRelation[0];
		const newPartPosition =
			parsed.data.partPosition ?? currentRelation?.partPosition;

		if (
			newPartPosition !== currentRelation?.partPosition &&
			newPartPosition != null
		) {
			const duplicateCheck = await db
				.select()
				.from(trackOfficialSongs)
				.where(
					and(
						eq(trackOfficialSongs.trackId, trackId),
						eq(
							trackOfficialSongs.officialSongId,
							currentRelation?.officialSongId ?? "",
						),
						eq(trackOfficialSongs.partPosition, newPartPosition),
					),
				)
				.limit(1);

			if (duplicateCheck.length > 0 && duplicateCheck[0]?.id !== id) {
				return c.json(
					{
						error: ERROR_MESSAGES.OFFICIAL_SONG_ALREADY_LINKED,
					},
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(trackOfficialSongs)
			.set(parsed.data)
			.where(eq(trackOfficialSongs.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/tracks/:trackId/official-songs/:id",
		);
	}
});

// 原曲紐付け削除
trackOfficialSongsRouter.delete("/:trackId/official-songs/:id", async (c) => {
	try {
		const trackId = c.req.param("trackId");
		const id = c.req.param("id");

		// 紐付け存在チェック
		const existingRelation = await db
			.select()
			.from(trackOfficialSongs)
			.where(
				and(
					eq(trackOfficialSongs.id, id),
					eq(trackOfficialSongs.trackId, trackId),
				),
			)
			.limit(1);

		if (existingRelation.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(trackOfficialSongs).where(eq(trackOfficialSongs.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/tracks/:trackId/official-songs/:id",
		);
	}
});

// 原曲紐付け並べ替え
trackOfficialSongsRouter.patch(
	"/:trackId/official-songs/:id/reorder",
	async (c) => {
		try {
			const trackId = c.req.param("trackId");
			const id = c.req.param("id");
			const body = await c.req.json<{ direction: "up" | "down" }>();

			// 現在の紐付け一覧を取得（順序順）
			const relations = await db
				.select()
				.from(trackOfficialSongs)
				.where(eq(trackOfficialSongs.trackId, trackId))
				.orderBy(trackOfficialSongs.partPosition);

			const currentIndex = relations.findIndex((r) => r.id === id);
			if (currentIndex === -1) {
				return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
			}

			const swapIndex =
				body.direction === "up" ? currentIndex - 1 : currentIndex + 1;
			if (swapIndex < 0 || swapIndex >= relations.length) {
				return c.json({ error: ERROR_MESSAGES.CANNOT_MOVE_FURTHER }, 400);
			}

			const currentItem = relations[currentIndex];
			const swapItem = relations[swapIndex];

			if (!currentItem || !swapItem) {
				return c.json({ error: ERROR_MESSAGES.INVALID_STATE }, 500);
			}

			// 順序を入れ替え
			await db
				.update(trackOfficialSongs)
				.set({ partPosition: swapItem.partPosition })
				.where(eq(trackOfficialSongs.id, currentItem.id));

			await db
				.update(trackOfficialSongs)
				.set({ partPosition: currentItem.partPosition })
				.where(eq(trackOfficialSongs.id, swapItem.id));

			// 更新後の一覧を返す
			const updatedRelations = await db
				.select({
					relation: trackOfficialSongs,
					officialSong: officialSongs,
				})
				.from(trackOfficialSongs)
				.leftJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.where(eq(trackOfficialSongs.trackId, trackId))
				.orderBy(trackOfficialSongs.partPosition);

			return c.json(
				updatedRelations.map((row) => ({
					...row.relation,
					officialSong: row.officialSong,
				})),
			);
		} catch (error) {
			return handleDbError(
				c,
				error,
				"PATCH /admin/tracks/:trackId/official-songs/:id/reorder",
			);
		}
	},
);

export { trackOfficialSongsRouter };
