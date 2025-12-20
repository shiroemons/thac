import {
	and,
	artistAliases,
	artists,
	creditRoles,
	db,
	eq,
	inArray,
	insertTrackCreditSchema,
	isNull,
	type TrackCredit,
	trackCreditRoles,
	trackCredits,
	tracks,
	updateTrackCreditSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const trackCreditsRouter = new Hono<AdminContext>();

// トラックのクレジット一覧取得（役割情報を含む）
trackCreditsRouter.get("/:releaseId/tracks/:trackId/credits", async (c) => {
	const releaseId = c.req.param("releaseId");
	const trackId = c.req.param("trackId");

	// トラック存在チェック
	const existingTrack = await db
		.select()
		.from(tracks)
		.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
		.limit(1);

	if (existingTrack.length === 0) {
		return c.json({ error: "Track not found" }, 404);
	}

	// クレジット一覧取得（アーティスト・別名義・役割情報を結合）
	const credits = await db
		.select({
			credit: trackCredits,
			artist: artists,
			artistAlias: artistAliases,
		})
		.from(trackCredits)
		.leftJoin(artists, eq(trackCredits.artistId, artists.id))
		.leftJoin(artistAliases, eq(trackCredits.artistAliasId, artistAliases.id))
		.where(eq(trackCredits.trackId, trackId))
		.orderBy(trackCredits.creditPosition);

	// 各クレジットの役割を取得
	const creditsWithRoles = await Promise.all(
		credits.map(async (row) => {
			const roles = await db
				.select({
					trackCreditId: trackCreditRoles.trackCreditId,
					roleCode: trackCreditRoles.roleCode,
					rolePosition: trackCreditRoles.rolePosition,
					role: creditRoles,
				})
				.from(trackCreditRoles)
				.leftJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(eq(trackCreditRoles.trackCreditId, row.credit.id))
				.orderBy(trackCreditRoles.rolePosition);

			return {
				...row.credit,
				artist: row.artist,
				artistAlias: row.artistAlias,
				roles,
			};
		}),
	);

	return c.json(creditsWithRoles);
});

// クレジット追加
trackCreditsRouter.post("/:releaseId/tracks/:trackId/credits", async (c) => {
	const releaseId = c.req.param("releaseId");
	const trackId = c.req.param("trackId");
	const body = await c.req.json();

	// トラック存在チェック
	const existingTrack = await db
		.select()
		.from(tracks)
		.where(and(eq(tracks.id, trackId), eq(tracks.releaseId, releaseId)))
		.limit(1);

	if (existingTrack.length === 0) {
		return c.json({ error: "Track not found" }, 404);
	}

	// アーティスト存在チェック
	const existingArtist = await db
		.select()
		.from(artists)
		.where(eq(artists.id, body.artistId))
		.limit(1);

	if (existingArtist.length === 0) {
		return c.json({ error: "Artist not found" }, 404);
	}

	// 別名義存在チェック（指定された場合）
	if (body.artistAliasId) {
		const existingAlias = await db
			.select()
			.from(artistAliases)
			.where(
				and(
					eq(artistAliases.id, body.artistAliasId),
					eq(artistAliases.artistId, body.artistId),
				),
			)
			.limit(1);

		if (existingAlias.length === 0) {
			return c.json(
				{ error: "Artist alias not found or does not belong to the artist" },
				404,
			);
		}
	}

	// バリデーション
	const parsed = insertTrackCreditSchema.safeParse({
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
		.from(trackCredits)
		.where(eq(trackCredits.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// 同一アーティスト・同一別名義の重複チェック
	let duplicateCheck: TrackCredit[];
	if (parsed.data.artistAliasId) {
		duplicateCheck = await db
			.select()
			.from(trackCredits)
			.where(
				and(
					eq(trackCredits.trackId, trackId),
					eq(trackCredits.artistId, parsed.data.artistId),
					eq(trackCredits.artistAliasId, parsed.data.artistAliasId),
				),
			)
			.limit(1);
	} else {
		duplicateCheck = await db
			.select()
			.from(trackCredits)
			.where(
				and(
					eq(trackCredits.trackId, trackId),
					eq(trackCredits.artistId, parsed.data.artistId),
					isNull(trackCredits.artistAliasId),
				),
			)
			.limit(1);
	}

	if (duplicateCheck.length > 0) {
		return c.json(
			{
				error:
					"Credit for this artist (with same alias) already exists on this track",
			},
			409,
		);
	}

	// 作成
	const result = await db.insert(trackCredits).values(parsed.data).returning();
	const creditId = result[0]?.id;

	// 役割の登録（rolesCodes が指定されている場合）
	if (creditId && body.rolesCodes && Array.isArray(body.rolesCodes)) {
		const rolesCodes = body.rolesCodes as string[];
		if (rolesCodes.length > 0) {
			// 役割マスター存在チェック
			const existingRoles = await db
				.select()
				.from(creditRoles)
				.where(inArray(creditRoles.code, rolesCodes));

			const validRoleCodes = existingRoles.map((r) => r.code);

			// 有効な役割のみ登録
			const roleInserts = validRoleCodes.map((roleCode, index) => ({
				trackCreditId: creditId,
				roleCode,
				rolePosition: index + 1,
			}));

			if (roleInserts.length > 0) {
				await db.insert(trackCreditRoles).values(roleInserts);
			}
		}
	}

	return c.json(result[0], 201);
});

// クレジット更新
trackCreditsRouter.put(
	"/:releaseId/tracks/:trackId/credits/:creditId",
	async (c) => {
		const releaseId = c.req.param("releaseId");
		const trackId = c.req.param("trackId");
		const creditId = c.req.param("creditId");
		const body = await c.req.json();

		// クレジット存在チェック（トラック・リリースとの関連確認含む）
		const existingCredit = await db
			.select()
			.from(trackCredits)
			.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
			.where(
				and(
					eq(trackCredits.id, creditId),
					eq(trackCredits.trackId, trackId),
					eq(tracks.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingCredit.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// アーティスト存在チェック（変更される場合）
		if (body.artistId) {
			const existingArtist = await db
				.select()
				.from(artists)
				.where(eq(artists.id, body.artistId))
				.limit(1);

			if (existingArtist.length === 0) {
				return c.json({ error: "Artist not found" }, 404);
			}
		}

		// 別名義存在チェック（変更される場合）
		if (body.artistAliasId !== undefined && body.artistAliasId !== null) {
			const artistIdToCheck =
				body.artistId || existingCredit[0]?.track_credits.artistId;
			const existingAlias = await db
				.select()
				.from(artistAliases)
				.where(
					and(
						eq(artistAliases.id, body.artistAliasId),
						eq(artistAliases.artistId, artistIdToCheck),
					),
				)
				.limit(1);

			if (existingAlias.length === 0) {
				return c.json(
					{ error: "Artist alias not found or does not belong to the artist" },
					404,
				);
			}
		}

		// バリデーション
		const parsed = updateTrackCreditSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 同一アーティスト・同一別名義の重複チェック（自身以外）
		const currentCredit = existingCredit[0]?.track_credits;
		const newArtistId = parsed.data.artistId ?? currentCredit?.artistId;
		const newAliasId =
			parsed.data.artistAliasId !== undefined
				? parsed.data.artistAliasId
				: currentCredit?.artistAliasId;

		if (newArtistId) {
			let duplicateCheck: TrackCredit[];
			if (newAliasId) {
				duplicateCheck = await db
					.select()
					.from(trackCredits)
					.where(
						and(
							eq(trackCredits.trackId, trackId),
							eq(trackCredits.artistId, newArtistId),
							eq(trackCredits.artistAliasId, newAliasId),
						),
					)
					.limit(1);
			} else {
				duplicateCheck = await db
					.select()
					.from(trackCredits)
					.where(
						and(
							eq(trackCredits.trackId, trackId),
							eq(trackCredits.artistId, newArtistId),
							isNull(trackCredits.artistAliasId),
						),
					)
					.limit(1);
			}

			if (duplicateCheck.length > 0 && duplicateCheck[0]?.id !== creditId) {
				return c.json(
					{
						error:
							"Credit for this artist (with same alias) already exists on this track",
					},
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(trackCredits)
			.set(parsed.data)
			.where(eq(trackCredits.id, creditId))
			.returning();

		// 役割の更新（rolesCodes が指定されている場合）
		if (body.rolesCodes !== undefined && Array.isArray(body.rolesCodes)) {
			// 既存の役割を削除
			await db
				.delete(trackCreditRoles)
				.where(eq(trackCreditRoles.trackCreditId, creditId));

			// 新しい役割を登録
			const rolesCodes = body.rolesCodes as string[];
			if (rolesCodes.length > 0) {
				// 役割マスター存在チェック
				const existingRoles = await db
					.select()
					.from(creditRoles)
					.where(inArray(creditRoles.code, rolesCodes));

				const validRoleCodes = existingRoles.map((r) => r.code);

				// 有効な役割のみ登録
				const roleInserts = validRoleCodes.map((roleCode, index) => ({
					trackCreditId: creditId,
					roleCode,
					rolePosition: index + 1,
				}));

				if (roleInserts.length > 0) {
					await db.insert(trackCreditRoles).values(roleInserts);
				}
			}
		}

		return c.json(result[0]);
	},
);

// クレジット削除
trackCreditsRouter.delete(
	"/:releaseId/tracks/:trackId/credits/:creditId",
	async (c) => {
		const releaseId = c.req.param("releaseId");
		const trackId = c.req.param("trackId");
		const creditId = c.req.param("creditId");

		// クレジット存在チェック（トラック・リリースとの関連確認含む）
		const existingCredit = await db
			.select()
			.from(trackCredits)
			.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
			.where(
				and(
					eq(trackCredits.id, creditId),
					eq(trackCredits.trackId, trackId),
					eq(tracks.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingCredit.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// 削除（役割はCASCADEで自動削除）
		await db.delete(trackCredits).where(eq(trackCredits.id, creditId));

		return c.json({ success: true });
	},
);

export { trackCreditsRouter };
