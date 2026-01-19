import type { IndexConfig } from "../types";

export const TRACKS_INDEX_NAME = "tracks";

export const tracksIndexConfig: IndexConfig = {
	name: TRACKS_INDEX_NAME,
	primaryKey: "id",
	searchableAttributes: [
		"name",
		"nameJa",
		"nameEn",
		"releaseName",
		"circleNames",
		"vocalists",
		"arrangers",
		"lyricists",
		"originalSongs",
	],
	filterableAttributes: [
		"releaseId",
		"releaseYear",
		"eventName",
		"circleNames",
		"originalWorkNames",
	],
	sortableAttributes: [
		"releaseDate",
		"releaseYear",
		"trackNumber",
		"name",
		"createdAt",
	],
	locales: ["jpn"],
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8,
		},
	},
};
