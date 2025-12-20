import {
	artistAliases,
	artists,
	creditRoles,
	db,
	discs,
	eq,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const tracksAdminRouter = new Hono<AdminContext>();

// トラック単体取得（詳細情報を含む）
tracksAdminRouter.get("/:trackId", async (c) => {
	const trackId = c.req.param("trackId");

	// トラック取得
	const trackResult = await db
		.select({
			track: tracks,
			release: releases,
			disc: discs,
		})
		.from(tracks)
		.leftJoin(releases, eq(tracks.releaseId, releases.id))
		.leftJoin(discs, eq(tracks.discId, discs.id))
		.where(eq(tracks.id, trackId))
		.limit(1);

	if (trackResult.length === 0) {
		return c.json({ error: "Track not found" }, 404);
	}

	const row = trackResult[0];
	if (!row) {
		return c.json({ error: "Track not found" }, 404);
	}

	// クレジット一覧取得（アーティスト・別名義・役割情報を結合）
	const creditsResult = await db
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
		creditsResult.map(async (creditRow) => {
			const roles = await db
				.select({
					trackCreditId: trackCreditRoles.trackCreditId,
					roleCode: trackCreditRoles.roleCode,
					rolePosition: trackCreditRoles.rolePosition,
					role: creditRoles,
				})
				.from(trackCreditRoles)
				.leftJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(eq(trackCreditRoles.trackCreditId, creditRow.credit.id))
				.orderBy(trackCreditRoles.rolePosition);

			return {
				...creditRow.credit,
				artist: creditRow.artist,
				artistAlias: creditRow.artistAlias,
				roles,
			};
		}),
	);

	return c.json({
		...row.track,
		release: row.release,
		disc: row.disc,
		credits: creditsWithRoles,
	});
});

export { tracksAdminRouter };
