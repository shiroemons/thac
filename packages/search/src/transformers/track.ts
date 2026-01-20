import {
	asc,
	circles,
	count,
	db,
	discs,
	eq,
	events,
	inArray,
	officialSongs,
	officialWorks,
	releaseCircles,
	releases,
	trackCreditRoles,
	trackCredits,
	trackOfficialSongs,
	tracks,
} from "@thac/db";
import type { TrackSearchDocument } from "../types";

/**
 * Fetch tracks from database for indexing, yielding batches
 * Uses offset-based pagination for compatibility
 * @param batchSize - Number of tracks per batch
 */
export async function* fetchTracksForIndexing(
	batchSize = 1000,
): AsyncGenerator<TrackSearchDocument[]> {
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		// Step 1: Fetch basic track data with release, disc, and events
		const tracksData = await db
			.select({
				id: tracks.id,
				name: tracks.name,
				nameJa: tracks.nameJa,
				nameEn: tracks.nameEn,
				releaseId: tracks.releaseId,
				trackNumber: tracks.trackNumber,
				releaseDate: tracks.releaseDate,
				releaseYear: tracks.releaseYear,
				createdAt: tracks.createdAt,
				updatedAt: tracks.updatedAt,
				releaseName: releases.name,
				releaseReleaseDate: releases.releaseDate,
				releaseReleaseYear: releases.releaseYear,
				discNumber: discs.discNumber,
				trackEventName: events.name,
			})
			.from(tracks)
			.leftJoin(releases, eq(tracks.releaseId, releases.id))
			.leftJoin(discs, eq(tracks.discId, discs.id))
			.leftJoin(events, eq(tracks.eventId, events.id))
			.orderBy(asc(tracks.id))
			.limit(batchSize)
			.offset(offset);

		if (tracksData.length === 0) {
			hasMore = false;
			break;
		}

		const trackIds = tracksData.map((t) => t.id);
		const releaseIds = [
			...new Set(tracksData.map((t) => t.releaseId).filter(Boolean)),
		] as string[];

		// Step 2: Batch fetch related data
		const [circlesData, creditsData, officialSongsData, releaseEventsData] =
			await Promise.all([
				// Circles via release_circles
				releaseIds.length > 0
					? db
							.select({
								releaseId: releaseCircles.releaseId,
								circleName: circles.name,
							})
							.from(releaseCircles)
							.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
							.where(inArray(releaseCircles.releaseId, releaseIds))
					: Promise.resolve([]),

				// Credits with roles
				db
					.select({
						trackId: trackCredits.trackId,
						creditName: trackCredits.creditName,
						roleCode: trackCreditRoles.roleCode,
					})
					.from(trackCredits)
					.innerJoin(
						trackCreditRoles,
						eq(trackCredits.id, trackCreditRoles.trackCreditId),
					)
					.where(inArray(trackCredits.trackId, trackIds)),

				// Official songs
				db
					.select({
						trackId: trackOfficialSongs.trackId,
						customSongName: trackOfficialSongs.customSongName,
						songName: officialSongs.name,
						workName: officialWorks.name,
					})
					.from(trackOfficialSongs)
					.leftJoin(
						officialSongs,
						eq(trackOfficialSongs.officialSongId, officialSongs.id),
					)
					.leftJoin(
						officialWorks,
						eq(officialSongs.officialWorkId, officialWorks.id),
					)
					.where(inArray(trackOfficialSongs.trackId, trackIds)),

				// Release events (for tracks without direct event)
				releaseIds.length > 0
					? db
							.select({
								releaseId: releases.id,
								eventName: events.name,
							})
							.from(releases)
							.innerJoin(events, eq(releases.eventId, events.id))
							.where(inArray(releases.id, releaseIds))
					: Promise.resolve([]),
			]);

		// Step 3: Build lookup maps
		const circlesByRelease = new Map<string, string[]>();
		for (const c of circlesData) {
			const existing = circlesByRelease.get(c.releaseId) ?? [];
			if (!circlesByRelease.has(c.releaseId)) {
				circlesByRelease.set(c.releaseId, existing);
			}
			if (!existing.includes(c.circleName)) {
				existing.push(c.circleName);
			}
		}

		const creditsByTrack = new Map<
			string,
			{
				vocalists: string[];
				arrangers: string[];
				lyricists: string[];
				composers: string[];
			}
		>();
		for (const c of creditsData) {
			let entry = creditsByTrack.get(c.trackId);
			if (!entry) {
				entry = { vocalists: [], arrangers: [], lyricists: [], composers: [] };
				creditsByTrack.set(c.trackId, entry);
			}
			switch (c.roleCode) {
				case "vocalist":
					if (!entry.vocalists.includes(c.creditName)) {
						entry.vocalists.push(c.creditName);
					}
					break;
				case "arranger":
					if (!entry.arrangers.includes(c.creditName)) {
						entry.arrangers.push(c.creditName);
					}
					break;
				case "lyricist":
					if (!entry.lyricists.includes(c.creditName)) {
						entry.lyricists.push(c.creditName);
					}
					break;
				case "composer":
					if (!entry.composers.includes(c.creditName)) {
						entry.composers.push(c.creditName);
					}
					break;
			}
		}

		const songsByTrack = new Map<
			string,
			{ songs: string[]; works: string[] }
		>();
		for (const s of officialSongsData) {
			let entry = songsByTrack.get(s.trackId);
			if (!entry) {
				entry = { songs: [], works: [] };
				songsByTrack.set(s.trackId, entry);
			}
			const songName = s.customSongName ?? s.songName;
			if (songName && !entry.songs.includes(songName)) {
				entry.songs.push(songName);
			}
			if (s.workName && !entry.works.includes(s.workName)) {
				entry.works.push(s.workName);
			}
		}

		const eventByRelease = new Map<string, string>();
		for (const e of releaseEventsData) {
			eventByRelease.set(e.releaseId, e.eventName);
		}

		// Step 4: Transform to search documents
		const documents: TrackSearchDocument[] = tracksData.map((track) => {
			const credits = creditsByTrack.get(track.id) ?? {
				vocalists: [],
				arrangers: [],
				lyricists: [],
				composers: [],
			};
			const songs = songsByTrack.get(track.id) ?? { songs: [], works: [] };
			const circleNames = track.releaseId
				? (circlesByRelease.get(track.releaseId) ?? [])
				: [];
			const eventName =
				track.trackEventName ??
				(track.releaseId
					? (eventByRelease.get(track.releaseId) ?? null)
					: null);

			return {
				id: track.id,
				name: track.name,
				nameJa: track.nameJa,
				nameEn: track.nameEn,
				releaseId: track.releaseId,
				releaseName: track.releaseName,
				releaseDate: track.releaseDate ?? track.releaseReleaseDate,
				releaseYear: track.releaseYear ?? track.releaseReleaseYear,
				trackNumber: track.trackNumber,
				discNumber: track.discNumber,
				eventName,
				circleNames,
				vocalists: credits.vocalists,
				arrangers: credits.arrangers,
				lyricists: credits.lyricists,
				composers: credits.composers,
				originalSongs: songs.songs,
				originalWorkNames: songs.works,
				createdAt: track.createdAt.getTime(),
				updatedAt: track.updatedAt.getTime(),
			};
		});

		yield documents;

		offset += batchSize;
		if (tracksData.length < batchSize) {
			hasMore = false;
		}
	}
}

/**
 * Fetch a single track and transform to search document
 * Useful for real-time updates
 */
export async function fetchTrackForIndexing(
	trackId: string,
): Promise<TrackSearchDocument | null> {
	// Fetch track with release, disc, and event info
	const trackRows = await db
		.select({
			id: tracks.id,
			name: tracks.name,
			nameJa: tracks.nameJa,
			nameEn: tracks.nameEn,
			releaseId: tracks.releaseId,
			trackNumber: tracks.trackNumber,
			releaseDate: tracks.releaseDate,
			releaseYear: tracks.releaseYear,
			createdAt: tracks.createdAt,
			updatedAt: tracks.updatedAt,
			releaseName: releases.name,
			releaseReleaseDate: releases.releaseDate,
			releaseReleaseYear: releases.releaseYear,
			discNumber: discs.discNumber,
			trackEventName: events.name,
		})
		.from(tracks)
		.leftJoin(releases, eq(tracks.releaseId, releases.id))
		.leftJoin(discs, eq(tracks.discId, discs.id))
		.leftJoin(events, eq(tracks.eventId, events.id))
		.where(eq(tracks.id, trackId))
		.limit(1);

	const track = trackRows[0];
	if (!track) return null;

	const releaseIds = track.releaseId ? [track.releaseId] : [];

	// Fetch related data
	const [circlesData, creditsData, officialSongsData, releaseEventsData] =
		await Promise.all([
			// Circles
			releaseIds.length > 0
				? db
						.select({
							releaseId: releaseCircles.releaseId,
							circleName: circles.name,
						})
						.from(releaseCircles)
						.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
						.where(inArray(releaseCircles.releaseId, releaseIds))
				: Promise.resolve([]),

			// Credits
			db
				.select({
					trackId: trackCredits.trackId,
					creditName: trackCredits.creditName,
					roleCode: trackCreditRoles.roleCode,
				})
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCredits.id, trackCreditRoles.trackCreditId),
				)
				.where(eq(trackCredits.trackId, trackId)),

			// Official songs
			db
				.select({
					trackId: trackOfficialSongs.trackId,
					customSongName: trackOfficialSongs.customSongName,
					songName: officialSongs.name,
					workName: officialWorks.name,
				})
				.from(trackOfficialSongs)
				.leftJoin(
					officialSongs,
					eq(trackOfficialSongs.officialSongId, officialSongs.id),
				)
				.leftJoin(
					officialWorks,
					eq(officialSongs.officialWorkId, officialWorks.id),
				)
				.where(eq(trackOfficialSongs.trackId, trackId)),

			// Release event
			releaseIds.length > 0
				? db
						.select({
							releaseId: releases.id,
							eventName: events.name,
						})
						.from(releases)
						.innerJoin(events, eq(releases.eventId, events.id))
						.where(inArray(releases.id, releaseIds))
				: Promise.resolve([]),
		]);

	// Build data
	const circleNames: string[] = [];
	for (const c of circlesData) {
		if (!circleNames.includes(c.circleName)) {
			circleNames.push(c.circleName);
		}
	}

	const credits = {
		vocalists: [] as string[],
		arrangers: [] as string[],
		lyricists: [] as string[],
		composers: [] as string[],
	};
	for (const c of creditsData) {
		switch (c.roleCode) {
			case "vocalist":
				if (!credits.vocalists.includes(c.creditName)) {
					credits.vocalists.push(c.creditName);
				}
				break;
			case "arranger":
				if (!credits.arrangers.includes(c.creditName)) {
					credits.arrangers.push(c.creditName);
				}
				break;
			case "lyricist":
				if (!credits.lyricists.includes(c.creditName)) {
					credits.lyricists.push(c.creditName);
				}
				break;
			case "composer":
				if (!credits.composers.includes(c.creditName)) {
					credits.composers.push(c.creditName);
				}
				break;
		}
	}

	const songs: string[] = [];
	const works: string[] = [];
	for (const s of officialSongsData) {
		const songName = s.customSongName ?? s.songName;
		if (songName && !songs.includes(songName)) {
			songs.push(songName);
		}
		if (s.workName && !works.includes(s.workName)) {
			works.push(s.workName);
		}
	}

	const eventName =
		track.trackEventName ??
		(releaseEventsData.length > 0 ? releaseEventsData[0]?.eventName : null) ??
		null;

	return {
		id: track.id,
		name: track.name,
		nameJa: track.nameJa,
		nameEn: track.nameEn,
		releaseId: track.releaseId,
		releaseName: track.releaseName,
		releaseDate: track.releaseDate ?? track.releaseReleaseDate,
		releaseYear: track.releaseYear ?? track.releaseReleaseYear,
		trackNumber: track.trackNumber,
		discNumber: track.discNumber,
		eventName,
		circleNames,
		vocalists: credits.vocalists,
		arrangers: credits.arrangers,
		lyricists: credits.lyricists,
		composers: credits.composers,
		originalSongs: songs,
		originalWorkNames: works,
		createdAt: track.createdAt.getTime(),
		updatedAt: track.updatedAt.getTime(),
	};
}

/**
 * Count total tracks for progress reporting
 */
export async function countTracksForIndexing(): Promise<number> {
	const result = await db.select({ count: count() }).from(tracks);
	return result[0]?.count ?? 0;
}
