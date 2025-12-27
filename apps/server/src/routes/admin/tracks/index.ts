import {
	and,
	artistAliases,
	artists,
	circles,
	count,
	creditRoles,
	db,
	discs,
	eq,
	eventDays,
	events,
	officialSongs,
	or,
	releaseCircles,
	releases,
	sql,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { trackDerivationsRouter } from "./derivations";
import { trackIsrcsRouter } from "./isrcs";
import { trackOfficialSongsRouter } from "./official-songs";
import { trackPublicationsRouter } from "./publications";

const tracksAdminRouter = new Hono<AdminContext>();

// 原曲紐付けルートをマウント
tracksAdminRouter.route("/", trackOfficialSongsRouter);

// 派生関係ルートをマウント
tracksAdminRouter.route("/", trackDerivationsRouter);

// 公開リンク・ISRCルートをマウント
tracksAdminRouter.route("/", trackPublicationsRouter);
tracksAdminRouter.route("/", trackIsrcsRouter);

// ページネーション対応トラック一覧取得
tracksAdminRouter.get("/", async (c) => {
	const page = Number.parseInt(c.req.query("page") ?? "1", 10);
	const limit = Number.parseInt(c.req.query("limit") ?? "20", 10);
	const search = c.req.query("search") ?? "";
	const releaseId = c.req.query("releaseId") ?? "";

	const offset = (page - 1) * limit;

	// 検索条件の構築
	const searchConditions = [];
	if (search) {
		const searchPattern = `%${search}%`;
		searchConditions.push(
			or(
				sql`${tracks.name} LIKE ${searchPattern}`,
				sql`${tracks.nameJa} LIKE ${searchPattern}`,
				sql`${tracks.nameEn} LIKE ${searchPattern}`,
				sql`${releases.name} LIKE ${searchPattern}`,
			),
		);
	}
	if (releaseId) {
		searchConditions.push(eq(tracks.releaseId, releaseId));
	}

	const whereCondition =
		searchConditions.length > 0 ? and(...searchConditions) : undefined;

	// トラック一覧取得（リリース名、ディスク番号、イベント情報付き）
	const result = await db
		.select({
			track: tracks,
			releaseName: releases.name,
			discNumber: discs.discNumber,
			eventName: events.name,
			eventDayNumber: eventDays.dayNumber,
			eventDayDate: eventDays.date,
		})
		.from(tracks)
		.leftJoin(releases, eq(tracks.releaseId, releases.id))
		.leftJoin(discs, eq(tracks.discId, discs.id))
		.leftJoin(events, eq(tracks.eventId, events.id))
		.leftJoin(eventDays, eq(tracks.eventDayId, eventDays.id))
		.where(whereCondition)
		.orderBy(releases.name, discs.discNumber, tracks.trackNumber)
		.limit(limit)
		.offset(offset);

	// トラックIDリスト
	const trackIds = result.map((r) => r.track.id);

	// クレジット情報を一括取得（role別にグループ化）
	const creditsData =
		trackIds.length > 0
			? await db
					.select({
						trackId: trackCredits.trackId,
						creditName: trackCredits.creditName,
						roleCode: trackCreditRoles.roleCode,
					})
					.from(trackCredits)
					.leftJoin(
						trackCreditRoles,
						eq(trackCredits.id, trackCreditRoles.trackCreditId),
					)
					.where(
						sql`${trackCredits.trackId} IN (${sql.join(
							trackIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					)
			: [];

	// 原曲情報を一括取得（officialSongsテーブルと結合）
	const officialSongsData =
		trackIds.length > 0
			? await db
					.select({
						trackId: trackOfficialSongs.trackId,
						customSongName: trackOfficialSongs.customSongName,
						officialSongName: officialSongs.name,
					})
					.from(trackOfficialSongs)
					.leftJoin(
						officialSongs,
						eq(trackOfficialSongs.officialSongId, officialSongs.id),
					)
					.where(
						sql`${trackOfficialSongs.trackId} IN (${sql.join(
							trackIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					)
			: [];

	// トラックごとのクレジット情報をマップに集約
	const creditsByTrack = new Map<
		string,
		{
			vocalists: Set<string>;
			arrangers: Set<string>;
			lyricists: Set<string>;
			creditCount: number;
		}
	>();

	for (const credit of creditsData) {
		if (!creditsByTrack.has(credit.trackId)) {
			creditsByTrack.set(credit.trackId, {
				vocalists: new Set(),
				arrangers: new Set(),
				lyricists: new Set(),
				creditCount: 0,
			});
		}
		const trackCreditsInfo = creditsByTrack.get(credit.trackId);
		if (trackCreditsInfo) {
			if (credit.roleCode === "vocalist") {
				trackCreditsInfo.vocalists.add(credit.creditName);
			} else if (credit.roleCode === "arranger") {
				trackCreditsInfo.arrangers.add(credit.creditName);
			} else if (credit.roleCode === "lyricist") {
				trackCreditsInfo.lyricists.add(credit.creditName);
			}
		}
	}

	// ユニークなクレジットをカウント
	const creditCountByTrack = new Map<string, number>();
	const uniqueCredits = new Map<string, Set<string>>();
	for (const credit of creditsData) {
		if (!uniqueCredits.has(credit.trackId)) {
			uniqueCredits.set(credit.trackId, new Set());
		}
		uniqueCredits.get(credit.trackId)?.add(credit.creditName);
	}
	for (const [trackId, names] of uniqueCredits) {
		creditCountByTrack.set(trackId, names.size);
	}

	// 原曲情報をマップに集約
	const originalSongsByTrack = new Map<string, Set<string>>();
	for (const song of officialSongsData) {
		if (!originalSongsByTrack.has(song.trackId)) {
			originalSongsByTrack.set(song.trackId, new Set());
		}
		// カスタム曲名があればそれを使用、なければ公式曲名を使用
		const songName = song.customSongName || song.officialSongName;
		if (songName) {
			originalSongsByTrack.get(song.trackId)?.add(songName);
		}
	}

	// リリースIDリスト（サークル情報取得用）
	const releaseIds = [
		...new Set(result.map((r) => r.track.releaseId).filter(Boolean)),
	] as string[];

	// サークル情報を一括取得
	const circlesData =
		releaseIds.length > 0
			? await db
					.select({
						releaseId: releaseCircles.releaseId,
						circleName: circles.name,
						position: releaseCircles.position,
					})
					.from(releaseCircles)
					.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
					.where(
						sql`${releaseCircles.releaseId} IN (${sql.join(
							releaseIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					)
					.orderBy(releaseCircles.position)
			: [];

	// リリースごとのサークル情報をマップに集約
	const circlesByRelease = new Map<string, string[]>();
	for (const circle of circlesData) {
		if (!circlesByRelease.has(circle.releaseId)) {
			circlesByRelease.set(circle.releaseId, []);
		}
		circlesByRelease.get(circle.releaseId)?.push(circle.circleName);
	}

	// 総件数を取得
	const [totalResult] = await db
		.select({ count: count() })
		.from(tracks)
		.leftJoin(releases, eq(tracks.releaseId, releases.id))
		.where(whereCondition);

	const total = totalResult?.count ?? 0;

	// レスポンス形成
	const data = result.map((row) => {
		const trackCreditsInfo = creditsByTrack.get(row.track.id);
		const originalSongs = originalSongsByTrack.get(row.track.id);
		const releaseCircleNames = row.track.releaseId
			? circlesByRelease.get(row.track.releaseId)
			: null;
		return {
			...row.track,
			releaseName: row.releaseName ?? null,
			discNumber: row.discNumber ?? null,
			eventName: row.eventName ?? null,
			eventDayNumber: row.eventDayNumber ?? null,
			eventDayDate: row.eventDayDate ?? null,
			creditCount: creditCountByTrack.get(row.track.id) ?? 0,
			vocalists: trackCreditsInfo
				? Array.from(trackCreditsInfo.vocalists).join(", ")
				: null,
			arrangers: trackCreditsInfo
				? Array.from(trackCreditsInfo.arrangers).join(", ")
				: null,
			lyricists: trackCreditsInfo
				? Array.from(trackCreditsInfo.lyricists).join(", ")
				: null,
			originalSongs: originalSongs
				? Array.from(originalSongs).join(", ")
				: null,
			circles: releaseCircleNames ? releaseCircleNames.join(" / ") : null,
		};
	});

	return c.json({
		data,
		total,
		page,
		limit,
	});
});

// トラック単体取得（詳細情報を含む）
tracksAdminRouter.get("/:trackId", async (c) => {
	const trackId = c.req.param("trackId");

	// トラック取得（イベント情報を含む）
	const trackResult = await db
		.select({
			track: tracks,
			release: releases,
			disc: discs,
			eventName: events.name,
			eventDayNumber: eventDays.dayNumber,
			eventDayDate: eventDays.date,
		})
		.from(tracks)
		.leftJoin(releases, eq(tracks.releaseId, releases.id))
		.leftJoin(discs, eq(tracks.discId, discs.id))
		.leftJoin(events, eq(tracks.eventId, events.id))
		.leftJoin(eventDays, eq(tracks.eventDayId, eventDays.id))
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
		eventName: row.eventName ?? null,
		eventDayNumber: row.eventDayNumber ?? null,
		eventDayDate: row.eventDayDate ?? null,
	});
});

export { tracksAdminRouter };
