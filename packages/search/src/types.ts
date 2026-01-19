/** Base interface for all search documents */
export interface SearchDocument {
	id: string;
	createdAt: number;
	updatedAt: number;
}

/** Track search document */
export interface TrackSearchDocument extends SearchDocument {
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseId: string | null;
	releaseName: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	trackNumber: number;
	discNumber: number | null;
	eventName: string | null;
	circleNames: string[];
	vocalists: string[];
	arrangers: string[];
	lyricists: string[];
	composers: string[];
	originalSongs: string[];
	originalWorkNames: string[];
}

/** Index configuration */
export interface IndexConfig {
	name: string;
	primaryKey: string;
	searchableAttributes: string[];
	filterableAttributes: string[];
	sortableAttributes: string[];
	locales?: string[];
	typoTolerance?: {
		minWordSizeForTypos: {
			oneTypo: number;
			twoTypos: number;
		};
	};
}

/** Reindex progress */
export interface ReindexProgress {
	index: string;
	phase: "fetching" | "transforming" | "indexing" | "completed" | "error";
	current: number;
	total: number;
	message: string;
}

/** Index status */
export interface IndexStatus {
	name: string;
	numberOfDocuments: number;
	isIndexing: boolean;
	lastUpdate: string | null;
}
