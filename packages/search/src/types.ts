/** Base interface for all search documents */
export interface SearchDocument {
	id: string;
	createdAt: number;
	updatedAt: number;
}

/** 配信URL（idなし） */
export interface Publication {
	platformCode: string;
	url: string;
}

/** アーティスト参照（artistAliasIdを使用、nullの場合はnull） */
export interface ArtistRef {
	id: string | null; // trackCredits.artistAliasId（nullの場合はnull）
	name: string; // trackCredits.creditName
}

/** サークル参照 */
export interface CircleRef {
	id: string; // circles.id
	name: string;
}

/** 原曲参照 */
export interface OriginalSongRef {
	id: string | null; // trackOfficialSongs.id（customSongNameのみの場合はnull相当）
	officialSongId: string | null; // officialSongs.id
	name: string;
	workId: string | null; // officialWorks.id
	workName: string | null;
	categoryCode: string | null;
	// 階層検索
	lvl0: string | null; // カテゴリ表示名
	lvl1: string | null; // 作品名
	lvl2: string | null; // 曲名
}

/** Track search document */
export interface TrackSearchDocument extends SearchDocument {
	// 基本情報
	name: string;

	// リリース情報
	releaseId: string | null;
	releaseName: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseType: string | null;
	trackNumber: number;
	discNumber: number | null;
	discName: string | null;

	// イベント情報
	eventId: string | null;
	eventName: string | null;

	// サークル（オブジェクト配列）
	circles: CircleRef[];

	// クレジット（オブジェクト配列）
	vocalists: ArtistRef[];
	arrangers: ArtistRef[];
	lyricists: ArtistRef[];
	composers: ArtistRef[];
	remixers: ArtistRef[];

	// 原曲（オブジェクト配列）
	originalSongs: OriginalSongRef[];

	// 配信URL
	releasePublications: Publication[];
	trackPublications: Publication[];

	// カウント
	vocalistCount: number;
	arrangerCount: number;
	lyricistCount: number;
	composerCount: number;
	remixerCount: number;
	circleCount: number;
	originalSongCount: number;
	releasePublicationCount: number;
	trackPublicationCount: number;

	// フラグ
	isTouhouArrange: boolean;

	// 未実装（型定義のみ）
	tags: string[];
	genres: string[];

	// 検索用名前配列
	circleNames: string[];
	vocalistNames: string[];
	arrangerNames: string[];
	lyricistNames: string[];
	composerNames: string[];
	remixerNames: string[];
	originalSongNames: string[];
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

/** Track search hit with optional highlighting */
export interface TrackSearchHit extends TrackSearchDocument {
	/** Highlighted fields from Meilisearch */
	_formatted?: Partial<TrackSearchDocument>;
}

/** Track search response from Meilisearch */
export interface TrackSearchResponse {
	/** Search results */
	hits: TrackSearchHit[];
	/** Original search query */
	query: string;
	/** Processing time in milliseconds */
	processingTimeMs: number;
	/** Estimated total hits (for pagination) */
	estimatedTotalHits: number;
	/** Current page (1-indexed) */
	page: number;
	/** Results per page */
	limit: number;
	/** Total pages */
	totalPages: number;
}
