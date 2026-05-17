import {
	artists,
	asc,
	circles,
	db,
	desc,
	eq,
	inArray,
	releases,
	tracks,
	userCollectionItems,
} from "@thac/db";

type CollectionItem = typeof userCollectionItems.$inferSelect;

type TrackRow = {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseId: string;
};

type ReleaseRow = {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
};

type CircleRow = {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
};

type ArtistRow = {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
};

type Target = TrackRow | ReleaseRow | CircleRow | ArtistRow | null;

export type CollectionItemWithTarget = CollectionItem & { target: Target };

export async function loadCollectionItemsWithTargets(
	collectionId: string,
): Promise<CollectionItemWithTarget[]> {
	const items = await db
		.select()
		.from(userCollectionItems)
		.where(eq(userCollectionItems.collectionId, collectionId))
		.orderBy(
			asc(userCollectionItems.position),
			desc(userCollectionItems.addedAt),
		);

	const trackIds = items
		.filter((i) => i.targetType === "track")
		.map((i) => i.targetId);
	const releaseIds = items
		.filter((i) => i.targetType === "release")
		.map((i) => i.targetId);
	const circleIds = items
		.filter((i) => i.targetType === "circle")
		.map((i) => i.targetId);
	const artistIds = items
		.filter((i) => i.targetType === "artist")
		.map((i) => i.targetId);

	const [trackRows, releaseRows, circleRows, artistRows] = await Promise.all([
		trackIds.length > 0
			? db
					.select({
						id: tracks.id,
						name: tracks.name,
						nameJa: tracks.nameJa,
						nameEn: tracks.nameEn,
						releaseId: tracks.releaseId,
					})
					.from(tracks)
					.where(inArray(tracks.id, trackIds))
			: Promise.resolve([] as TrackRow[]),
		releaseIds.length > 0
			? db
					.select({
						id: releases.id,
						name: releases.name,
						nameJa: releases.nameJa,
						nameEn: releases.nameEn,
						releaseDate: releases.releaseDate,
					})
					.from(releases)
					.where(inArray(releases.id, releaseIds))
			: Promise.resolve([] as ReleaseRow[]),
		circleIds.length > 0
			? db
					.select({
						id: circles.id,
						name: circles.name,
						nameJa: circles.nameJa,
						nameEn: circles.nameEn,
					})
					.from(circles)
					.where(inArray(circles.id, circleIds))
			: Promise.resolve([] as CircleRow[]),
		artistIds.length > 0
			? db
					.select({
						id: artists.id,
						name: artists.name,
						nameJa: artists.nameJa,
						nameEn: artists.nameEn,
					})
					.from(artists)
					.where(inArray(artists.id, artistIds))
			: Promise.resolve([] as ArtistRow[]),
	]);

	const trackMap = new Map(trackRows.map((r) => [r.id, r]));
	const releaseMap = new Map(releaseRows.map((r) => [r.id, r]));
	const circleMap = new Map(circleRows.map((r) => [r.id, r]));
	const artistMap = new Map(artistRows.map((r) => [r.id, r]));

	return items.map((item) => {
		let target: Target = null;
		if (item.targetType === "track") {
			target = trackMap.get(item.targetId) ?? null;
		} else if (item.targetType === "release") {
			target = releaseMap.get(item.targetId) ?? null;
		} else if (item.targetType === "circle") {
			target = circleMap.get(item.targetId) ?? null;
		} else if (item.targetType === "artist") {
			target = artistMap.get(item.targetId) ?? null;
		}
		return { ...item, target };
	});
}
