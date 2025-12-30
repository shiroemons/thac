import {
	and,
	db,
	discs,
	eq,
	inArray,
	insertTrackSchema,
	isNull,
	officialSongs,
	releases,
	type Track,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
	updateTrackSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

/**
 * リリースのトラック一覧を取得する関数
 * 統合エンドポイント用にロジックを分離
 */
export async function getReleaseTracks(releaseId: string) {
	// トラック一覧取得（クレジット数を含む）
	const releaseTracks = await db
		.select({
			track: tracks,
			creditCount: db.$count(trackCredits, eq(trackCredits.trackId, tracks.id)),
		})
		.from(tracks)
		.where(eq(tracks.releaseId, releaseId))
		.orderBy(tracks.discId, tracks.trackNumber);

	// 全トラックIDを取得
	const trackIds = releaseTracks.map((row) => row.track.id);

	// 役割別クレジット取得用のヘルパー
	const getCreditsByRole = async (roleCode: string) => {
		if (trackIds.length === 0) return new Map<string, string[]>();

		const credits = await db
			.select({
				trackId: trackCredits.trackId,
				creditName: trackCredits.creditName,
			})
			.from(trackCredits)
			.innerJoin(
				trackCreditRoles,
				eq(trackCredits.id, trackCreditRoles.trackCreditId),
			)
			.where(
				and(
					inArray(trackCredits.trackId, trackIds),
					eq(trackCreditRoles.roleCode, roleCode),
				),
			)
			.orderBy(trackCredits.creditPosition);

		const map = new Map<string, string[]>();
		for (const c of credits) {
			const existing = map.get(c.trackId) ?? [];
			existing.push(c.creditName);
			map.set(c.trackId, existing);
		}
		return map;
	};

	// 原曲取得
	const getOriginalSongs = async () => {
		if (trackIds.length === 0) return new Map<string, string[]>();

		const songs = await db
			.select({
				trackId: trackOfficialSongs.trackId,
				songName: officialSongs.name,
				customSongName: trackOfficialSongs.customSongName,
			})
			.from(trackOfficialSongs)
			.leftJoin(
				officialSongs,
				eq(trackOfficialSongs.officialSongId, officialSongs.id),
			)
			.where(inArray(trackOfficialSongs.trackId, trackIds))
			.orderBy(trackOfficialSongs.partPosition);

		const map = new Map<string, string[]>();
		for (const s of songs) {
			const name = s.songName ?? s.customSongName ?? "";
			if (name) {
				const existing = map.get(s.trackId) ?? [];
				existing.push(name);
				map.set(s.trackId, existing);
			}
		}
		return map;
	};

	// 並列で取得
	const [vocalistsMap, arrangersMap, lyricistsMap, originalSongsMap] =
		await Promise.all([
			getCreditsByRole("vocalist"),
			getCreditsByRole("arranger"),
			getCreditsByRole("lyricist"),
			getOriginalSongs(),
		]);

	// レスポンス形式に変換
	return releaseTracks.map((row) => ({
		...row.track,
		creditCount: row.creditCount,
		vocalists: vocalistsMap.get(row.track.id)?.join(" / ") ?? null,
		arrangers: arrangersMap.get(row.track.id)?.join(" / ") ?? null,
		lyricists: lyricistsMap.get(row.track.id)?.join(" / ") ?? null,
		originalSongs: originalSongsMap.get(row.track.id)?.join(" / ") ?? null,
	}));
}

const tracksRouter = new Hono<AdminContext>();

// リリースのトラック一覧取得（ディスク・トラック番号順）
tracksRouter.get("/:releaseId/tracks", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");

		// リリース存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		const result = await getReleaseTracks(releaseId);
		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases/:releaseId/tracks");
	}
});

// トラック追加
tracksRouter.post("/:releaseId/tracks", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const body = await c.req.json();

		// バリデーション（releaseIdはoptionalなので、bodyに含まれていればそれを使用、なければパスパラメータ）
		const parsed = insertTrackSchema.safeParse({
			...body,
			releaseId: body.releaseId || releaseId,
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

		// リリース存在チェック（releaseIdが指定されている場合のみ）
		if (parsed.data.releaseId) {
			const existingRelease = await db
				.select()
				.from(releases)
				.where(eq(releases.id, parsed.data.releaseId))
				.limit(1);

			if (existingRelease.length === 0) {
				return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
			}
		}

		// ディスク存在チェック（指定された場合）
		if (parsed.data.discId) {
			if (!parsed.data.releaseId) {
				return c.json({ error: ERROR_MESSAGES.DISC_REQUIRES_RELEASE }, 400);
			}
			const existingDisc = await db
				.select()
				.from(discs)
				.where(
					and(
						eq(discs.id, parsed.data.discId),
						eq(discs.releaseId, parsed.data.releaseId),
					),
				)
				.limit(1);

			if (existingDisc.length === 0) {
				return c.json({ error: ERROR_MESSAGES.DISC_NOT_FOUND }, 404);
			}
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(tracks)
			.where(eq(tracks.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
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
		} else if (parsed.data.releaseId) {
			// ディスクなし（単曲）の場合、リリース内でトラック番号の一意性チェック
			duplicateCheck = await db
				.select()
				.from(tracks)
				.where(
					and(
						eq(tracks.releaseId, parsed.data.releaseId),
						isNull(tracks.discId),
						eq(tracks.trackNumber, parsed.data.trackNumber),
					),
				)
				.limit(1);
		} else {
			// releaseIdもdiscIdもない場合は重複チェック不要
			duplicateCheck = [];
		}

		if (duplicateCheck.length > 0) {
			return c.json(
				{
					error: discId
						? ERROR_MESSAGES.TRACK_NUMBER_ALREADY_EXISTS_FOR_DISC
						: ERROR_MESSAGES.TRACK_NUMBER_ALREADY_EXISTS_FOR_RELEASE,
				},
				409,
			);
		}

		// 親リリースから日付・イベント情報を取得して自動設定（releaseIdがある場合のみ）
		let insertData = { ...parsed.data };
		if (parsed.data.releaseId) {
			const release = await db
				.select()
				.from(releases)
				.where(eq(releases.id, parsed.data.releaseId))
				.limit(1);

			if (release.length > 0 && release[0]) {
				insertData = {
					...insertData,
					releaseDate: release[0].releaseDate,
					releaseYear: release[0].releaseYear,
					releaseMonth: release[0].releaseMonth,
					releaseDay: release[0].releaseDay,
					eventId: release[0].eventId,
					eventDayId: release[0].eventDayId,
				};
			}
		}

		// 作成
		const result = await db.insert(tracks).values(insertData).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/releases/:releaseId/tracks");
	}
});

// トラック更新
tracksRouter.put("/:releaseId/tracks/:trackId", async (c) => {
	try {
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
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// ディスク存在チェック（指定された場合）
		if (body.discId !== undefined && body.discId !== null) {
			const existingDisc = await db
				.select()
				.from(discs)
				.where(and(eq(discs.id, body.discId), eq(discs.releaseId, releaseId)))
				.limit(1);

			if (existingDisc.length === 0) {
				return c.json({ error: ERROR_MESSAGES.DISC_NOT_FOUND }, 404);
			}
		}

		// バリデーション
		const parsed = updateTrackSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
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
							? ERROR_MESSAGES.TRACK_NUMBER_ALREADY_EXISTS_FOR_DISC
							: ERROR_MESSAGES.TRACK_NUMBER_ALREADY_EXISTS_FOR_RELEASE,
					},
					409,
				);
			}
		}

		// 日付フィールドが変更された場合、year/month/dayも自動設定
		let updateData = { ...parsed.data };
		if (parsed.data.releaseDate !== undefined) {
			const { year, month, day } = parseDateString(parsed.data.releaseDate);
			updateData = {
				...updateData,
				releaseYear: year,
				releaseMonth: month,
				releaseDay: day,
			};
		}

		// 更新
		const result = await db
			.update(tracks)
			.set(updateData)
			.where(eq(tracks.id, trackId))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/releases/:releaseId/tracks/:trackId",
		);
	}
});

// トラック削除
tracksRouter.delete("/:releaseId/tracks/:trackId", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const trackId = c.req.param("trackId");

		// 存在チェック
		const existing = await db
			.select()
			.from(tracks)
			.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(tracks).where(eq(tracks.id, trackId));

		return c.json({ success: true, id: trackId });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/releases/:releaseId/tracks/:trackId",
		);
	}
});

// トラック並び順変更
tracksRouter.patch("/:releaseId/tracks/:trackId/reorder", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const trackId = c.req.param("trackId");
		const body = await c.req.json();

		const { direction } = body as { direction: "up" | "down" };

		if (direction !== "up" && direction !== "down") {
			return c.json({ error: ERROR_MESSAGES.INVALID_DIRECTION }, 400);
		}

		// 対象トラック取得
		const targetTrack = await db
			.select()
			.from(tracks)
			.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
			.limit(1);

		if (targetTrack.length === 0) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
		}

		const target = targetTrack[0];
		if (!target) {
			return c.json({ error: ERROR_MESSAGES.TRACK_NOT_FOUND }, 404);
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
				{
					error:
						direction === "up"
							? ERROR_MESSAGES.ALREADY_AT_TOP
							: ERROR_MESSAGES.ALREADY_AT_BOTTOM,
				},
				400,
			);
		}

		const swapTrack = scopeTracks[swapIndex];
		if (!swapTrack) {
			return c.json({ error: ERROR_MESSAGES.SWAP_TARGET_NOT_FOUND }, 400);
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
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PATCH /admin/releases/:releaseId/tracks/:trackId/reorder",
		);
	}
});

// ユーティリティ関数: 日付文字列から年月日を抽出
function parseDateString(dateString: string | null): {
	year: number | null;
	month: number | null;
	day: number | null;
} {
	if (!dateString) {
		return { year: null, month: null, day: null };
	}

	const dateParts = dateString.split("-");
	if (dateParts.length >= 3) {
		return {
			year: Number.parseInt(dateParts[0] ?? "0", 10) || null,
			month: Number.parseInt(dateParts[1] ?? "0", 10) || null,
			day: Number.parseInt(dateParts[2] ?? "0", 10) || null,
		};
	}

	return { year: null, month: null, day: null };
}

export { tracksRouter };
