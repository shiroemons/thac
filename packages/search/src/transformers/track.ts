import {
	artistAliases,
	asc,
	circles,
	count,
	db,
	discs,
	eq,
	events,
	genres,
	inArray,
	officialSongs,
	officialWorks,
	releaseCircles,
	releasePublications,
	releases,
	tags,
	trackCreditRoles,
	trackCredits,
	trackGenres,
	trackOfficialSongs,
	trackPublications,
	trackTags,
	tracks,
} from "@thac/db";
import type {
	ArtistRef,
	CircleRef,
	GenreRef,
	OriginalSongRef,
	Publication,
	TagRef,
	TrackSearchDocument,
} from "../types";

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
	pc98: "01. PC-98作品",
	windows: "02. Windows作品",
	zuns_music_collection: "03. ZUN's Music Collection",
	akyus_untouched_score: "04. 幺樂団の歴史",
	commercial_books: "05. 商業書籍",
	tasofro: "06. 黄昏フロンティア作品",
	other: "07. その他",
};

const TOUHOU_CATEGORIES = [
	"pc98",
	"windows",
	"zuns_music_collection",
	"akyus_untouched_score",
	"commercial_books",
	"tasofro",
];

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
				releaseId: tracks.releaseId,
				trackNumber: tracks.trackNumber,
				releaseDate: tracks.releaseDate,
				releaseYear: tracks.releaseYear,
				createdAt: tracks.createdAt,
				updatedAt: tracks.updatedAt,
				releaseName: releases.name,
				releaseReleaseDate: releases.releaseDate,
				releaseReleaseYear: releases.releaseYear,
				releaseType: releases.releaseType,
				releaseEventId: releases.eventId,
				discNumber: discs.discNumber,
				discName: discs.discName,
				trackEventId: events.id,
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
		const [
			circlesData,
			creditsData,
			officialSongsData,
			releaseEventsData,
			trackPublicationsData,
			releasePublicationsData,
			genresData,
			tagsData,
		] = await Promise.all([
			// Circles via release_circles with full data
			releaseIds.length > 0
				? db
						.select({
							releaseId: releaseCircles.releaseId,
							circleId: circles.id,
							circleName: circles.name,
						})
						.from(releaseCircles)
						.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
						.where(inArray(releaseCircles.releaseId, releaseIds))
				: Promise.resolve([]),

			// Credits with roles and artist alias info
			db
				.select({
					trackId: trackCredits.trackId,
					creditName: trackCredits.creditName,
					artistAliasId: trackCredits.artistAliasId,
					aliasName: artistAliases.name,
					roleCode: trackCreditRoles.roleCode,
				})
				.from(trackCredits)
				.innerJoin(
					trackCreditRoles,
					eq(trackCredits.id, trackCreditRoles.trackCreditId),
				)
				.leftJoin(
					artistAliases,
					eq(trackCredits.artistAliasId, artistAliases.id),
				)
				.where(inArray(trackCredits.trackId, trackIds)),

			// Official songs with full data
			db
				.select({
					trackId: trackOfficialSongs.trackId,
					trackOfficialSongId: trackOfficialSongs.id,
					customSongName: trackOfficialSongs.customSongName,
					officialSongId: officialSongs.id,
					songName: officialSongs.name,
					songTrackNumber: officialSongs.trackNumber,
					workId: officialWorks.id,
					workName: officialWorks.name,
					categoryCode: officialWorks.categoryCode,
					shortNameJa: officialWorks.shortNameJa,
					numberInSeries: officialWorks.numberInSeries,
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
							eventId: events.id,
							eventName: events.name,
						})
						.from(releases)
						.innerJoin(events, eq(releases.eventId, events.id))
						.where(inArray(releases.id, releaseIds))
				: Promise.resolve([]),

			// Track publications
			db
				.select({
					trackId: trackPublications.trackId,
					platformCode: trackPublications.platformCode,
					url: trackPublications.url,
				})
				.from(trackPublications)
				.where(inArray(trackPublications.trackId, trackIds)),

			// Release publications
			releaseIds.length > 0
				? db
						.select({
							releaseId: releasePublications.releaseId,
							platformCode: releasePublications.platformCode,
							url: releasePublications.url,
						})
						.from(releasePublications)
						.where(inArray(releasePublications.releaseId, releaseIds))
				: Promise.resolve([]),

			// Track genres with full genre data
			db
				.select({
					trackId: trackGenres.trackId,
					genreCode: genres.code,
					nameJa: genres.nameJa,
					color: genres.color,
					icon: genres.icon,
					position: trackGenres.position,
				})
				.from(trackGenres)
				.innerJoin(genres, eq(trackGenres.genreCode, genres.code))
				.where(inArray(trackGenres.trackId, trackIds))
				.orderBy(asc(trackGenres.position)),

			// Track tags with full tag data
			db
				.select({
					trackId: trackTags.trackId,
					tagId: tags.id,
					tagName: tags.name,
					position: trackTags.position,
				})
				.from(trackTags)
				.innerJoin(tags, eq(trackTags.tagId, tags.id))
				.where(inArray(trackTags.trackId, trackIds))
				.orderBy(asc(trackTags.position)),
		]);

		// Step 3: Build lookup maps
		const circlesByRelease = new Map<string, CircleRef[]>();
		for (const c of circlesData) {
			const existing = circlesByRelease.get(c.releaseId) ?? [];
			if (!circlesByRelease.has(c.releaseId)) {
				circlesByRelease.set(c.releaseId, existing);
			}
			// Check if circle already exists in the array
			if (!existing.some((circle) => circle.id === c.circleId)) {
				existing.push({
					id: c.circleId,
					name: c.circleName,
				});
			}
		}

		const creditsByTrack = new Map<
			string,
			{
				vocalists: ArtistRef[];
				arrangers: ArtistRef[];
				lyricists: ArtistRef[];
				composers: ArtistRef[];
				remixers: ArtistRef[];
			}
		>();
		for (const c of creditsData) {
			let entry = creditsByTrack.get(c.trackId);
			if (!entry) {
				entry = {
					vocalists: [],
					arrangers: [],
					lyricists: [],
					composers: [],
					remixers: [],
				};
				creditsByTrack.set(c.trackId, entry);
			}
			const artistRef: ArtistRef = {
				id: c.artistAliasId,
				name: c.creditName,
			};

			const addIfNotExists = (arr: ArtistRef[], ref: ArtistRef) => {
				if (!arr.some((a) => a.name === ref.name)) {
					arr.push(ref);
				}
			};

			switch (c.roleCode) {
				case "vocalist":
					addIfNotExists(entry.vocalists, artistRef);
					break;
				case "arranger":
					addIfNotExists(entry.arrangers, artistRef);
					break;
				case "lyricist":
					addIfNotExists(entry.lyricists, artistRef);
					break;
				case "composer":
					addIfNotExists(entry.composers, artistRef);
					break;
				case "remixer":
					addIfNotExists(entry.remixers, artistRef);
					break;
			}
		}

		const songsByTrack = new Map<string, OriginalSongRef[]>();
		for (const s of officialSongsData) {
			let entry = songsByTrack.get(s.trackId);
			if (!entry) {
				entry = [];
				songsByTrack.set(s.trackId, entry);
			}
			const songName = s.customSongName ?? s.songName;
			if (songName) {
				// Check if song already exists
				if (
					!entry.some(
						(song) =>
							song.name === songName &&
							song.officialSongId === s.officialSongId,
					)
				) {
					// Generate lvl0/lvl1/lvl2 for hierarchical search
					const categoryCode = s.categoryCode;
					const lvl0 = categoryCode
						? (CATEGORY_DISPLAY_NAMES[categoryCode] ?? null)
						: null;

					// lvl1: lvl0 + " > " + formatted numberInSeries + ". " + shortNameJa
					// Format numberInSeries as "NN.N" (e.g., 4.0 -> "04.0", 10.5 -> "10.5")
					const lvl1 =
						lvl0 && s.numberInSeries != null && s.shortNameJa
							? `${lvl0} > ${s.numberInSeries.toFixed(1).padStart(4, "0")}. ${s.shortNameJa}`
							: null;

					// lvl2: lvl1 + " > " + formatted trackNumber + ". " + name
					// Format trackNumber as "NN" (e.g., 3 -> "03")
					const lvl2 =
						lvl1 && s.songTrackNumber != null
							? `${lvl1} > ${String(s.songTrackNumber).padStart(2, "0")}. ${songName}`
							: null;

					entry.push({
						id: s.trackOfficialSongId,
						officialSongId: s.officialSongId,
						name: songName,
						workId: s.workId,
						workName: s.workName,
						categoryCode: s.categoryCode,
						lvl0,
						lvl1,
						lvl2,
					});
				}
			}
		}

		const eventByRelease = new Map<string, { id: string; name: string }>();
		for (const e of releaseEventsData) {
			eventByRelease.set(e.releaseId, { id: e.eventId, name: e.eventName });
		}

		const trackPublicationsByTrack = new Map<string, Publication[]>();
		for (const p of trackPublicationsData) {
			const existing = trackPublicationsByTrack.get(p.trackId) ?? [];
			if (!trackPublicationsByTrack.has(p.trackId)) {
				trackPublicationsByTrack.set(p.trackId, existing);
			}
			existing.push({
				platformCode: p.platformCode,
				url: p.url,
			});
		}

		const releasePublicationsByRelease = new Map<string, Publication[]>();
		for (const p of releasePublicationsData) {
			const existing = releasePublicationsByRelease.get(p.releaseId) ?? [];
			if (!releasePublicationsByRelease.has(p.releaseId)) {
				releasePublicationsByRelease.set(p.releaseId, existing);
			}
			existing.push({
				platformCode: p.platformCode,
				url: p.url,
			});
		}

		const genresByTrack = new Map<string, GenreRef[]>();
		for (const g of genresData) {
			let entry = genresByTrack.get(g.trackId);
			if (!entry) {
				entry = [];
				genresByTrack.set(g.trackId, entry);
			}
			// Check if genre already exists (shouldn't happen with proper constraints)
			if (!entry.some((genre) => genre.code === g.genreCode)) {
				entry.push({
					code: g.genreCode,
					nameJa: g.nameJa,
					color: g.color,
					icon: g.icon,
				});
			}
		}

		const tagsByTrack = new Map<string, TagRef[]>();
		for (const t of tagsData) {
			let entry = tagsByTrack.get(t.trackId);
			if (!entry) {
				entry = [];
				tagsByTrack.set(t.trackId, entry);
			}
			// Check if tag already exists (shouldn't happen with proper constraints)
			if (!entry.some((tag) => tag.id === t.tagId)) {
				entry.push({
					id: t.tagId,
					name: t.tagName,
				});
			}
		}

		// Step 4: Transform to search documents
		const documents: TrackSearchDocument[] = tracksData.map((track) => {
			const credits = creditsByTrack.get(track.id) ?? {
				vocalists: [],
				arrangers: [],
				lyricists: [],
				composers: [],
				remixers: [],
			};
			const originalSongs = songsByTrack.get(track.id) ?? [];
			const circleRefs = track.releaseId
				? (circlesByRelease.get(track.releaseId) ?? [])
				: [];
			const releaseEvent = track.releaseId
				? eventByRelease.get(track.releaseId)
				: null;
			const eventId = track.trackEventId ?? releaseEvent?.id ?? null;
			const eventName = track.trackEventName ?? releaseEvent?.name ?? null;

			const trackPubs = trackPublicationsByTrack.get(track.id) ?? [];
			const releasePubs = track.releaseId
				? (releasePublicationsByRelease.get(track.releaseId) ?? [])
				: [];

			// Determine isTouhouArrange
			const isTouhouArrange = originalSongs.some(
				(s) => s.categoryCode && TOUHOU_CATEGORIES.includes(s.categoryCode),
			);

			// Get genres and tags for this track
			const trackGenreRefs = genresByTrack.get(track.id) ?? [];
			const trackTagRefs = tagsByTrack.get(track.id) ?? [];

			// Build search name arrays
			const circleNames = circleRefs.map((c) => c.name);
			const vocalistNames = credits.vocalists.map((a) => a.name);
			const arrangerNames = credits.arrangers.map((a) => a.name);
			const lyricistNames = credits.lyricists.map((a) => a.name);
			const composerNames = credits.composers.map((a) => a.name);
			const remixerNames = credits.remixers.map((a) => a.name);
			const originalSongNames = originalSongs.map((s) => s.name);
			const originalWorkNames = [
				...new Set(
					originalSongs.map((s) => s.workName).filter(Boolean) as string[],
				),
			];
			const genreNames = trackGenreRefs.map((g) => g.nameJa);
			const genreCodes = trackGenreRefs.map((g) => g.code);
			const tagNames = trackTagRefs.map((t) => t.name);

			return {
				id: track.id,
				name: track.name,
				releaseId: track.releaseId,
				releaseName: track.releaseName,
				releaseDate: track.releaseDate ?? track.releaseReleaseDate,
				releaseYear: track.releaseYear ?? track.releaseReleaseYear,
				releaseType: track.releaseType,
				trackNumber: track.trackNumber,
				discNumber: track.discNumber,
				discName: track.discName,
				eventId,
				eventName,
				circles: circleRefs,
				vocalists: credits.vocalists,
				arrangers: credits.arrangers,
				lyricists: credits.lyricists,
				composers: credits.composers,
				remixers: credits.remixers,
				originalSongs,
				releasePublications: releasePubs,
				trackPublications: trackPubs,
				vocalistCount: credits.vocalists.length,
				arrangerCount: credits.arrangers.length,
				lyricistCount: credits.lyricists.length,
				composerCount: credits.composers.length,
				remixerCount: credits.remixers.length,
				circleCount: circleRefs.length,
				originalSongCount: originalSongs.length,
				releasePublicationCount: releasePubs.length,
				trackPublicationCount: trackPubs.length,
				isTouhouArrange,
				genres: trackGenreRefs,
				tags: trackTagRefs,
				genreNames,
				genreCodes,
				tagNames,
				genreCount: trackGenreRefs.length,
				tagCount: trackTagRefs.length,
				circleNames,
				vocalistNames,
				arrangerNames,
				lyricistNames,
				composerNames,
				remixerNames,
				originalSongNames,
				originalWorkNames,
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
			releaseId: tracks.releaseId,
			trackNumber: tracks.trackNumber,
			releaseDate: tracks.releaseDate,
			releaseYear: tracks.releaseYear,
			createdAt: tracks.createdAt,
			updatedAt: tracks.updatedAt,
			releaseName: releases.name,
			releaseReleaseDate: releases.releaseDate,
			releaseReleaseYear: releases.releaseYear,
			releaseType: releases.releaseType,
			releaseEventId: releases.eventId,
			discNumber: discs.discNumber,
			discName: discs.discName,
			trackEventId: events.id,
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
	const [
		circlesData,
		creditsData,
		officialSongsData,
		releaseEventsData,
		trackPublicationsData,
		releasePublicationsData,
		genresData,
		tagsData,
	] = await Promise.all([
		// Circles with full data
		releaseIds.length > 0
			? db
					.select({
						releaseId: releaseCircles.releaseId,
						circleId: circles.id,
						circleName: circles.name,
					})
					.from(releaseCircles)
					.innerJoin(circles, eq(releaseCircles.circleId, circles.id))
					.where(inArray(releaseCircles.releaseId, releaseIds))
			: Promise.resolve([]),

		// Credits with artist alias info
		db
			.select({
				trackId: trackCredits.trackId,
				creditName: trackCredits.creditName,
				artistAliasId: trackCredits.artistAliasId,
				aliasName: artistAliases.name,
				roleCode: trackCreditRoles.roleCode,
			})
			.from(trackCredits)
			.innerJoin(
				trackCreditRoles,
				eq(trackCredits.id, trackCreditRoles.trackCreditId),
			)
			.leftJoin(artistAliases, eq(trackCredits.artistAliasId, artistAliases.id))
			.where(eq(trackCredits.trackId, trackId)),

		// Official songs with full data
		db
			.select({
				trackId: trackOfficialSongs.trackId,
				trackOfficialSongId: trackOfficialSongs.id,
				customSongName: trackOfficialSongs.customSongName,
				officialSongId: officialSongs.id,
				songName: officialSongs.name,
				songTrackNumber: officialSongs.trackNumber,
				workId: officialWorks.id,
				workName: officialWorks.name,
				categoryCode: officialWorks.categoryCode,
				shortNameJa: officialWorks.shortNameJa,
				numberInSeries: officialWorks.numberInSeries,
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
						eventId: events.id,
						eventName: events.name,
					})
					.from(releases)
					.innerJoin(events, eq(releases.eventId, events.id))
					.where(inArray(releases.id, releaseIds))
			: Promise.resolve([]),

		// Track publications
		db
			.select({
				trackId: trackPublications.trackId,
				platformCode: trackPublications.platformCode,
				url: trackPublications.url,
			})
			.from(trackPublications)
			.where(eq(trackPublications.trackId, trackId)),

		// Release publications
		releaseIds.length > 0
			? db
					.select({
						releaseId: releasePublications.releaseId,
						platformCode: releasePublications.platformCode,
						url: releasePublications.url,
					})
					.from(releasePublications)
					.where(inArray(releasePublications.releaseId, releaseIds))
			: Promise.resolve([]),

		// Track genres with full genre data
		db
			.select({
				genreCode: genres.code,
				nameJa: genres.nameJa,
				color: genres.color,
				icon: genres.icon,
				position: trackGenres.position,
			})
			.from(trackGenres)
			.innerJoin(genres, eq(trackGenres.genreCode, genres.code))
			.where(eq(trackGenres.trackId, trackId))
			.orderBy(asc(trackGenres.position)),

		// Track tags with full tag data
		db
			.select({
				tagId: tags.id,
				tagName: tags.name,
				position: trackTags.position,
			})
			.from(trackTags)
			.innerJoin(tags, eq(trackTags.tagId, tags.id))
			.where(eq(trackTags.trackId, trackId))
			.orderBy(asc(trackTags.position)),
	]);

	// Build circles
	const circleRefs: CircleRef[] = [];
	for (const c of circlesData) {
		if (!circleRefs.some((circle) => circle.id === c.circleId)) {
			circleRefs.push({
				id: c.circleId,
				name: c.circleName,
			});
		}
	}

	// Build credits
	const credits = {
		vocalists: [] as ArtistRef[],
		arrangers: [] as ArtistRef[],
		lyricists: [] as ArtistRef[],
		composers: [] as ArtistRef[],
		remixers: [] as ArtistRef[],
	};

	const addIfNotExists = (arr: ArtistRef[], ref: ArtistRef) => {
		if (!arr.some((a) => a.name === ref.name)) {
			arr.push(ref);
		}
	};

	for (const c of creditsData) {
		const artistRef: ArtistRef = {
			id: c.artistAliasId,
			name: c.creditName,
		};
		switch (c.roleCode) {
			case "vocalist":
				addIfNotExists(credits.vocalists, artistRef);
				break;
			case "arranger":
				addIfNotExists(credits.arrangers, artistRef);
				break;
			case "lyricist":
				addIfNotExists(credits.lyricists, artistRef);
				break;
			case "composer":
				addIfNotExists(credits.composers, artistRef);
				break;
			case "remixer":
				addIfNotExists(credits.remixers, artistRef);
				break;
		}
	}

	// Build original songs
	const originalSongs: OriginalSongRef[] = [];
	for (const s of officialSongsData) {
		const songName = s.customSongName ?? s.songName;
		if (songName) {
			if (
				!originalSongs.some(
					(song) =>
						song.name === songName && song.officialSongId === s.officialSongId,
				)
			) {
				// Generate lvl0/lvl1/lvl2 for hierarchical search
				const categoryCode = s.categoryCode;
				const lvl0 = categoryCode
					? (CATEGORY_DISPLAY_NAMES[categoryCode] ?? null)
					: null;

				// lvl1: lvl0 + " > " + formatted numberInSeries + ". " + shortNameJa
				// Format numberInSeries as "NN.N" (e.g., 4.0 -> "04.0", 10.5 -> "10.5")
				const lvl1 =
					lvl0 && s.numberInSeries != null && s.shortNameJa
						? `${lvl0} > ${s.numberInSeries.toFixed(1).padStart(4, "0")}. ${s.shortNameJa}`
						: null;

				// lvl2: lvl1 + " > " + formatted trackNumber + ". " + name
				// Format trackNumber as "NN" (e.g., 3 -> "03")
				const lvl2 =
					lvl1 && s.songTrackNumber != null
						? `${lvl1} > ${String(s.songTrackNumber).padStart(2, "0")}. ${songName}`
						: null;

				originalSongs.push({
					id: s.trackOfficialSongId,
					officialSongId: s.officialSongId,
					name: songName,
					workId: s.workId,
					workName: s.workName,
					categoryCode: s.categoryCode,
					lvl0,
					lvl1,
					lvl2,
				});
			}
		}
	}

	// Get event info
	const releaseEvent =
		releaseEventsData.length > 0 ? releaseEventsData[0] : null;
	const eventId = track.trackEventId ?? releaseEvent?.eventId ?? null;
	const eventName = track.trackEventName ?? releaseEvent?.eventName ?? null;

	// Build publications
	const trackPubs: Publication[] = trackPublicationsData.map((p) => ({
		platformCode: p.platformCode,
		url: p.url,
	}));
	const releasePubs: Publication[] = releasePublicationsData.map((p) => ({
		platformCode: p.platformCode,
		url: p.url,
	}));

	// Determine isTouhouArrange
	const isTouhouArrange = originalSongs.some(
		(s) => s.categoryCode && TOUHOU_CATEGORIES.includes(s.categoryCode),
	);

	// Build genres and tags refs
	const genreRefs: GenreRef[] = genresData.map((g) => ({
		code: g.genreCode,
		nameJa: g.nameJa,
		color: g.color,
		icon: g.icon,
	}));
	const tagRefs: TagRef[] = tagsData.map((t) => ({
		id: t.tagId,
		name: t.tagName,
	}));

	// Build search name arrays
	const circleNames = circleRefs.map((c) => c.name);
	const vocalistNames = credits.vocalists.map((a) => a.name);
	const arrangerNames = credits.arrangers.map((a) => a.name);
	const lyricistNames = credits.lyricists.map((a) => a.name);
	const composerNames = credits.composers.map((a) => a.name);
	const remixerNames = credits.remixers.map((a) => a.name);
	const originalSongNames = originalSongs.map((s) => s.name);
	const originalWorkNames = [
		...new Set(
			originalSongs.map((s) => s.workName).filter(Boolean) as string[],
		),
	];
	const genreNames = genreRefs.map((g) => g.nameJa);
	const genreCodes = genreRefs.map((g) => g.code);
	const tagNames = tagRefs.map((t) => t.name);

	return {
		id: track.id,
		name: track.name,
		releaseId: track.releaseId,
		releaseName: track.releaseName,
		releaseDate: track.releaseDate ?? track.releaseReleaseDate,
		releaseYear: track.releaseYear ?? track.releaseReleaseYear,
		releaseType: track.releaseType,
		trackNumber: track.trackNumber,
		discNumber: track.discNumber,
		discName: track.discName,
		eventId,
		eventName,
		circles: circleRefs,
		vocalists: credits.vocalists,
		arrangers: credits.arrangers,
		lyricists: credits.lyricists,
		composers: credits.composers,
		remixers: credits.remixers,
		originalSongs,
		releasePublications: releasePubs,
		trackPublications: trackPubs,
		vocalistCount: credits.vocalists.length,
		arrangerCount: credits.arrangers.length,
		lyricistCount: credits.lyricists.length,
		composerCount: credits.composers.length,
		remixerCount: credits.remixers.length,
		circleCount: circleRefs.length,
		originalSongCount: originalSongs.length,
		releasePublicationCount: releasePubs.length,
		trackPublicationCount: trackPubs.length,
		isTouhouArrange,
		genres: genreRefs,
		tags: tagRefs,
		genreNames,
		genreCodes,
		tagNames,
		genreCount: genreRefs.length,
		tagCount: tagRefs.length,
		circleNames,
		vocalistNames,
		arrangerNames,
		lyricistNames,
		composerNames,
		remixerNames,
		originalSongNames,
		originalWorkNames,
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
