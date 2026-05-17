/**
 * 公開API用クライアント
 * 認証不要の公開APIエンドポイントにアクセスするための関数群
 */

// SSR時はSERVER_URL、クライアント側はVITE_SERVER_URLを使用
const getApiBaseUrl = () => {
	if (typeof window === "undefined") {
		return (
			process.env.SERVER_URL ||
			import.meta.env.VITE_SERVER_URL ||
			"http://localhost:3001"
		);
	}
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
};

async function publicFetch<T>(endpoint: string): Promise<T> {
	const baseUrl = getApiBaseUrl();
	const res = await fetch(`${baseUrl}${endpoint}`);

	if (!res.ok) {
		const errorData = await res
			.json()
			.catch(() => ({ error: "Unknown error" }));
		throw new Error(errorData.error || `HTTP ${res.status}`);
	}

	return res.json();
}

// =============================================================================
// 型定義
// =============================================================================

/** 公開統計情報 */
export interface PublicStats {
	events: number;
	circles: number;
	artists: number;
	tracks: number;
	originalSongs: number;
	releases: number;
	eventSeries: number;
	totalTracks: number;
	vocalists: number;
	arrangers: number;
	lyricists: number;
}

/** ランキング項目 */
export interface RankingItem {
	id: string;
	name: string;
	count: number;
}

/** ランキングレスポンス */
export interface PublicStatsRankings {
	popularSongs: RankingItem[];
	activeCircles: RankingItem[];
	activeArtists: RankingItem[];
}

/** 最近の更新項目 */
export interface RecentUpdateItem {
	id: string;
	title: string;
	circles: Array<{ id: string; name: string }>;
	date: string | null;
	type: "new" | "update";
}

/** 最近の更新レスポンス */
export interface PublicStatsRecentUpdates {
	data: RecentUpdateItem[];
}

/** カテゴリ */
export interface PublicCategory {
	code: string;
	name: string;
	description: string | null;
	sortOrder: number;
}

/** 原作一覧項目 */
export interface PublicWorkItem {
	id: string;
	categoryCode: string;
	categoryName: string | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	shortNameJa: string | null;
	shortNameEn: string | null;
	numberInSeries: number | null;
	releaseDate: string | null;
	songCount: number;
	totalArrangeCount: number;
}

/** 原作詳細 */
export interface PublicWorkDetail extends PublicWorkItem {
	officialOrganization: string | null;
	notes: string | null;
	links: Array<{
		platformCode: string;
		platformName: string | null;
		url: string;
	}>;
	songs: Array<{
		id: string;
		trackNumber: number | null;
		name: string;
		nameJa: string;
		nameEn: string | null;
		composerName: string | null;
		arrangeCount: number;
	}>;
}

/** 原曲一覧項目 */
export interface PublicSongItem {
	id: string;
	officialWorkId: string | null;
	workName: string | null;
	workShortName: string | null;
	workCategoryCode: string | null;
	workCategoryName: string | null;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	arrangeCount: number;
}

/** 原曲詳細 */
export interface PublicSongDetail {
	id: string;
	officialWorkId: string | null;
	trackNumber: number | null;
	name: string;
	nameJa: string;
	nameEn: string | null;
	composerName: string | null;
	arrangerName: string | null;
	isOriginal: boolean;
	sourceSongId: string | null;
	sourceSongName: string | null;
	notes: string | null;
	work: {
		id: string;
		name: string;
		shortNameJa: string | null;
		categoryCode: string;
		categoryName: string | null;
	} | null;
	links: Array<{
		platformCode: string;
		platformName: string | null;
		url: string;
	}>;
	arrangeCount: number;
	circleCount: number;
	artistCount: number;
	prevSong: { id: string | null; name: string | null };
	nextSong: { id: string | null; name: string | null };
}

/** アレンジトラック */
export interface PublicArrangeTrack {
	trackId: string;
	trackName: string;
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
	} | null;
	circles: Array<{
		id: string;
		name: string;
	}>;
	artists: Array<{
		id: string;
		artistAliasId: string;
		creditName: string;
		roles: string[];
	}>;
	genres: Array<{
		code: string;
		nameJa: string;
		color: string;
		icon: string;
	}>;
	tags?: Array<{ id: string; name: string }>;
}

/** ページネーションレスポンス */
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

/** サークル一覧項目 */
export interface PublicCircleItem {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	releaseCount: number;
	trackCount: number;
}

/** サークル詳細 */
export interface PublicCircleDetail {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	sortName: string | null;
	nameInitial: string | null;
	initialScript: string;
	notes: string | null;
	links: Array<{
		id: string;
		platformCode: string;
		platformName: string | null;
		url: string;
		isOfficial: boolean;
		isPrimary: boolean;
	}>;
	stats: {
		releaseCount: number;
		trackCount: number;
	};
}

/** サークル作品 */
export interface PublicCircleRelease {
	id: string;
	name: string;
	nameJa: string | null;
	releaseDate: string | null;
	releaseType: string | null;
	participationType: string;
	event: { id: string; name: string | null } | null;
	trackCount: number;
}

/** サークルトラック */
export interface PublicCircleTrack {
	id: string;
	name: string;
	releaseId: string;
	releaseName: string | null;
	trackNumber: number;
	artists: Array<{
		id: string;
		artistAliasId: string;
		creditName: string;
		roles: string[];
	}>;
	originalSong: { id: string; name: string | null } | null;
	genres: Array<{
		code: string;
		nameJa: string;
		color: string;
		icon: string;
	}>;
	tags?: Array<{ id: string; name: string }>;
}

/** アーティストの役割 */
export interface PublicArtistRole {
	roleCode: string;
	label: string;
}

/** 名義一覧項目（アーティスト一覧は名義単位で表示） */
export interface PublicArtistItem {
	id: string; // 名義ID（{artistId}__main__ または aliasId）
	name: string; // 表示名
	artistId: string; // 親アーティストID
	artistName: string; // アーティスト本名
	isMainName: boolean; // メイン名義かどうか
	aliasTypeCode: string | null; // 別名義の場合のタイプ
	nameInitial: string | null;
	initialScript: string;
	roles: PublicArtistRole[];
	trackCount: number;
}

/** 他名義情報 */
export interface PublicOtherAlias {
	id: string;
	name: string;
	isMainName: boolean;
	aliasTypeCode: string | null;
	trackCount: number;
}

/** 名義詳細（アーティスト詳細は名義単位で表示） */
export interface PublicArtistDetail {
	id: string; // 名義ID
	name: string; // 表示名
	artistId: string; // 親アーティストID
	artistName: string; // アーティスト本名
	isMainName: boolean;
	aliasTypeCode: string | null;
	roles: PublicArtistRole[];
	stats: {
		trackCount: number;
		releaseCount: number;
	};
	otherAliases: PublicOtherAlias[]; // 同じアーティストの他名義
}

/** アーティストトラック（クレジット） */
export interface PublicArtistTrack {
	id: string;
	creditName: string;
	aliasId: string | null;
	aliasTypeCode: string | null;
	roles: Array<{
		roleCode: string;
		label: string;
	}>;
	track: {
		id: string;
		name: string;
	};
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
	};
	circles: Array<{
		id: string;
		name: string;
	}>;
	originalSong: { id: string; name: string | null } | null;
	genres: PublicGenre[];
	tags?: Array<{ id: string; name: string }>;
}

/** イベントシリーズ一覧項目 */
export interface PublicEventSeriesItem {
	id: string;
	name: string;
	sortOrder: number;
}

/** イベント一覧項目 */
export interface PublicEventItem {
	id: string;
	name: string;
	eventSeriesId: string | null;
	eventSeriesName: string | null;
	edition: number | null;
	startDate: string | null;
	endDate: string | null;
	totalDays: number | null;
	venue: string | null;
	releaseCount: number;
	trackCount: number;
}

/** イベント日 */
export interface PublicEventDay {
	id: string;
	dayNumber: number;
	date: string;
}

/** イベント詳細 */
export interface PublicEventDetail {
	id: string;
	name: string;
	eventSeriesId: string | null;
	eventSeriesName: string | null;
	edition: number | null;
	startDate: string | null;
	endDate: string | null;
	totalDays: number | null;
	venue: string | null;
	eventDays: PublicEventDay[];
	stats: {
		releaseCount: number;
		circleCount: number;
		trackCount: number;
	};
}

/** イベント作品 */
export interface PublicEventRelease {
	id: string;
	name: string;
	nameJa: string | null;
	releaseDate: string | null;
	releaseType: string | null;
	trackCount: number;
	circles: Array<{
		id: string;
		name: string;
		participationType: string;
	}>;
}

/** 作品詳細 */
export interface PublicReleaseDetail {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	releaseType: string | null;
	notes: string | null;
	event: { id: string; name: string | null } | null;
	circles: Array<{
		circleId: string;
		circleName: string;
		participationType: string;
		position: number | null;
	}>;
	discs: Array<{
		id: string;
		discNumber: number;
		discName: string | null;
	}>;
	tracks: Array<{
		id: string;
		discId: string | null;
		trackNumber: number;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		credits: Array<{
			artistId: string;
			artistAliasId: string;
			creditName: string;
			aliasName: string | null;
			artistName: string | null;
			roles: Array<{ roleCode: string; roleName: string | null }>;
		}>;
		officialSongs: Array<{
			officialSongId: string | null;
			songName: string;
		}>;
		genres?: PublicGenre[];
		tags?: Array<{ id: string; name: string }>;
	}>;
	trackCount: number;
	artistCount: number;
	publications: Array<{
		id: string;
		platformCode: string;
		url: string;
		platform: {
			code: string;
			name: string;
			category: "streaming" | "video" | "download" | "shop" | "other";
		};
	}>;
}

// =============================================================================
// ランキングAPI型定義
// =============================================================================

/** 原曲アレンジ数ランキング項目 */
export interface OriginalSongRankingItem {
	id: string;
	name: string;
	workId: string | null;
	workName: string | null;
	count: number;
}

/** サークル作品数ランキング項目 */
export interface CircleRankingItem {
	id: string;
	name: string;
	count: number;
}

/** アーティスト楽曲数ランキング項目 */
export interface ArtistRankingItem {
	id: string;
	name: string;
	artistId: string;
	count: number;
}

/** 原曲2曲組み合わせランキング項目 */
export interface SongPairRankingItem {
	song1Id: string;
	song1Name: string;
	song2Id: string;
	song2Name: string;
	count: number;
}

// =============================================================================
// 統計API型定義
// =============================================================================

/** 原曲統計 */
export interface SongStat {
	id: string;
	name: string | null;
	trackCount: number;
}

/** 原作統計（単純モード） */
export interface WorkStat {
	id: string;
	name: string | null;
	shortName: string | null;
	trackCount: number;
}

/** 原作統計（積み上げモード） */
export interface StackedWorkStat {
	id: string;
	name: string | null;
	shortName: string | null;
	songs: SongStat[];
	totalTrackCount: number;
}

/** 単純モードレスポンス */
export interface WorkStatsResponse {
	works: WorkStat[];
}

/** 積み上げモードレスポンス */
export interface StackedWorkStatsResponse {
	works: StackedWorkStat[];
}

/** 原曲詳細レスポンス（ドリルダウン用） */
export interface SongStatsResponse {
	songs: SongStat[];
}

/** ジャンル情報 */
export interface PublicGenre {
	code: string;
	nameJa: string;
	color: string;
	icon?: string;
}

/** タグ一覧項目 */
export interface PublicTagItem {
	id: string;
	name: string;
	trackCount: number;
}

/** タグ詳細 */
export interface PublicTagDetail {
	id: string;
	name: string;
	trackCount: number;
}

/** タグクラウド項目 */
export interface PublicTagCloudItem {
	id: string;
	name: string;
	count: number;
	weight: number;
}

/** 公開コレクションのオーナー情報 */
export interface PublicCollectionOwner {
	id: string;
	name: string;
}

/** 公開コレクション詳細 */
export interface PublicCollectionDetail {
	id: string;
	shortId: string;
	name: string;
	description: string | null;
	kind: "collection" | "playlist";
	visibility: "public" | "unlisted";
	ordered: boolean;
	itemType: "track" | "release" | "circle" | "artist" | null;
	owner: PublicCollectionOwner;
	createdAt: string;
	updatedAt: string;
	items: PublicCollectionItem[];
}

/** 公開コレクションのアイテム */
export interface PublicCollectionItem {
	id: string;
	collectionId: string;
	targetType: "track" | "release" | "circle" | "artist";
	targetId: string;
	position: number | null;
	note: string | null;
	addedAt: string;
	target: {
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		releaseId?: string;
		releaseDate?: string | null;
	} | null;
}

/** 公開コレクション API レスポンス */
interface PublicCollectionResponse {
	collection: Omit<PublicCollectionDetail, "items">;
	items: PublicCollectionItem[];
}

/** ジャンルマスタ項目 */
export interface PublicGenreItem {
	code: string;
	nameJa: string;
	nameEn: string;
	color: string;
	icon: string;
	description: string | null;
}

/** トラック詳細 */
export interface PublicTrackDetail {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	trackNumber: number;
	credits: Array<{
		artistId: string;
		artistAliasId: string;
		creditName: string;
		roles: Array<{ roleCode: string; roleName: string | null }>;
	}>;
	officialSongs: Array<{
		officialSongId: string | null;
		songName: string;
		workName: string;
		partPosition: number | null;
		startSecond: number | null;
		endSecond: number | null;
	}>;
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
		releaseType: string | null;
	} | null;
	disc: {
		id: string;
		discNumber: number;
		discName: string | null;
	} | null;
	event: { id: string; name: string } | null;
	parentTracks: Array<{
		parentTrackId: string;
		parentTrackName: string;
		parentReleaseName: string;
	}>;
	siblingTracks: {
		prev: { id: string; name: string; trackNumber: number } | null;
		next: { id: string; name: string; trackNumber: number } | null;
	};
	publications: Array<{
		id: string;
		platformCode: string;
		url: string;
		platform: {
			code: string;
			name: string;
			category: "streaming" | "video" | "download" | "shop" | "other";
		};
	}>;
	genres?: PublicGenre[];
	tags?: Array<{ id: string; name: string }>;
}

// =============================================================================
// 検索API型定義
// =============================================================================

/** アーティスト参照 */
export interface TrackArtistRef {
	id: string | null;
	name: string;
}

/** サークル参照 */
export interface TrackCircleRef {
	id: string;
	name: string;
}

/** 原曲参照 */
export interface TrackOriginalSongRef {
	id: string | null;
	officialSongId: string | null;
	name: string;
	workId: string | null;
	workName: string | null;
	categoryCode: string | null;
	lvl0: string | null;
	lvl1: string | null;
	lvl2: string | null;
}

/** 配信URL */
export interface TrackPublication {
	platformCode: string;
	url: string;
}

/** ジャンル参照（検索結果用） */
export interface TrackGenreRef {
	code: string;
	nameJa: string;
	color: string;
	icon: string;
}

/** タグ参照（検索結果用） */
export interface TrackTagRef {
	id: string;
	name: string;
}

/** トラック検索結果のヒット */
export interface TrackSearchHit {
	id: string;
	name: string;
	releaseId: string | null;
	releaseName: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseType: string | null;
	trackNumber: number;
	discNumber: number | null;
	discName: string | null;
	eventId: string | null;
	eventName: string | null;
	circles: TrackCircleRef[];
	vocalists: TrackArtistRef[];
	arrangers: TrackArtistRef[];
	lyricists: TrackArtistRef[];
	composers: TrackArtistRef[];
	remixers: TrackArtistRef[];
	originalSongs: TrackOriginalSongRef[];
	releasePublications: TrackPublication[];
	trackPublications: TrackPublication[];
	vocalistCount: number;
	arrangerCount: number;
	lyricistCount: number;
	composerCount: number;
	remixerCount: number;
	circleCount: number;
	originalSongCount: number;
	releasePublicationCount: number;
	trackPublicationCount: number;
	isTouhouArrange: boolean;
	tags: TrackTagRef[];
	genres: TrackGenreRef[];
	circleNames: string[];
	vocalistNames: string[];
	arrangerNames: string[];
	lyricistNames: string[];
	composerNames: string[];
	remixerNames: string[];
	originalSongNames: string[];
	originalWorkNames: string[];
	createdAt: number;
	updatedAt: number;
	/** ハイライト付きフィールド */
	_formatted?: Partial<TrackSearchHit>;
}

/** トラック検索レスポンス */
export interface TrackSearchResponse {
	hits: TrackSearchHit[];
	query: string;
	processingTimeMs: number;
	estimatedTotalHits: number;
	page: number;
	limit: number;
	totalPages: number;
}

/** トラック検索パラメータ */
export interface TrackSearchParams {
	q: string;
	page?: number;
	limit?: number;
	sort?: string;
}

// =============================================================================
// API関数
// =============================================================================

export const publicApi = {
	/** サイト全体の統計情報を取得 */
	stats: Object.assign(() => publicFetch<PublicStats>("/api/public/stats"), {
		/** ランキング */
		rankings: () =>
			publicFetch<PublicStatsRankings>("/api/public/stats/rankings"),
		/** 最近の更新 */
		recentUpdates: () =>
			publicFetch<PublicStatsRecentUpdates>("/api/public/stats/recent-updates"),
		/** 原曲アレンジ数ランキング（ページネーション対応） */
		originalSongsRanking: (params?: { page?: number; limit?: number }) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<OriginalSongRankingItem>>(
				`/api/public/stats/rankings/original-songs${query ? `?${query}` : ""}`,
			);
		},
		/** サークル作品数ランキング（ページネーション対応） */
		circlesRanking: (params?: { page?: number; limit?: number }) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<CircleRankingItem>>(
				`/api/public/stats/rankings/circles${query ? `?${query}` : ""}`,
			);
		},
		/** アーティスト楽曲数ランキング（ページネーション対応） */
		artistsRanking: (params?: { page?: number; limit?: number }) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<ArtistRankingItem>>(
				`/api/public/stats/rankings/artists${query ? `?${query}` : ""}`,
			);
		},
		/** 原曲2曲組み合わせランキング（ページネーション対応） */
		songPairsRanking: (params?: { page?: number; limit?: number }) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<SongPairRankingItem>>(
				`/api/public/stats/rankings/song-pairs${query ? `?${query}` : ""}`,
			);
		},
	}),

	/** カテゴリマスタ一覧を取得 */
	categories: () =>
		publicFetch<{ data: PublicCategory[] }>(
			"/api/public/official-work-categories",
		),

	/** ジャンルマスタ一覧を取得 */
	genres: {
		list: () => publicFetch<{ data: PublicGenreItem[] }>("/api/public/genres"),
	},

	works: {
		/** 原作一覧を取得 */
		list: (params?: {
			page?: number;
			limit?: number;
			category?: string;
			search?: string;
		}) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.category) sp.set("category", params.category);
			if (params?.search) sp.set("search", params.search);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicWorkItem>>(
				`/api/public/official-works${query ? `?${query}` : ""}`,
			);
		},

		/** 原作詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicWorkDetail>(`/api/public/official-works/${id}`),
	},

	songs: {
		/** 原曲一覧を取得 */
		list: (params?: {
			page?: number;
			limit?: number;
			workId?: string;
			category?: string;
			search?: string;
		}) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.workId) sp.set("workId", params.workId);
			if (params?.category) sp.set("category", params.category);
			if (params?.search) sp.set("search", params.search);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicSongItem>>(
				`/api/public/original-songs${query ? `?${query}` : ""}`,
			);
		},

		/** 原曲詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicSongDetail>(`/api/public/original-songs/${id}`),

		/** 原曲のアレンジトラック一覧を取得 */
		tracks: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicArrangeTrack>>(
				`/api/public/original-songs/${id}/tracks${query ? `?${query}` : ""}`,
			);
		},
	},

	circles: {
		/** サークル一覧を取得 */
		list: (params?: {
			page?: number;
			limit?: number;
			initialScript?: string;
			initial?: string;
			row?: string;
			search?: string;
			sortBy?: string;
			sortOrder?: string;
		}) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.initialScript) sp.set("initialScript", params.initialScript);
			if (params?.initial) sp.set("initial", params.initial);
			if (params?.row) sp.set("row", params.row);
			if (params?.search) sp.set("search", params.search);
			if (params?.sortBy) sp.set("sortBy", params.sortBy);
			if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicCircleItem>>(
				`/api/public/circles${query ? `?${query}` : ""}`,
			);
		},

		/** サークル詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicCircleDetail>(`/api/public/circles/${id}`),

		/** サークルの作品一覧を取得 */
		releases: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicCircleRelease>>(
				`/api/public/circles/${id}/releases${query ? `?${query}` : ""}`,
			);
		},

		/** サークルのトラック一覧を取得 */
		tracks: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicCircleTrack>>(
				`/api/public/circles/${id}/tracks${query ? `?${query}` : ""}`,
			);
		},

		/** サークルの原作/原曲統計を取得 */
		stats: (
			id: string,
			workId?: string,
			stacked?: boolean,
		): Promise<
			WorkStatsResponse | StackedWorkStatsResponse | SongStatsResponse
		> => {
			const sp = new URLSearchParams();
			if (workId) sp.set("workId", workId);
			if (stacked) sp.set("stacked", "true");
			const query = sp.toString();
			return publicFetch(
				`/api/public/circles/${id}/stats/works${query ? `?${query}` : ""}`,
			);
		},
	},

	artists: {
		/** アーティスト一覧を取得 */
		list: (params?: {
			page?: number;
			limit?: number;
			initialScript?: string;
			initial?: string;
			row?: string;
			role?: string;
			search?: string;
			sortBy?: string;
			sortOrder?: string;
		}) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.initialScript) sp.set("initialScript", params.initialScript);
			if (params?.initial) sp.set("initial", params.initial);
			if (params?.row) sp.set("row", params.row);
			if (params?.role) sp.set("role", params.role);
			if (params?.search) sp.set("search", params.search);
			if (params?.sortBy) sp.set("sortBy", params.sortBy);
			if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicArtistItem>>(
				`/api/public/artists${query ? `?${query}` : ""}`,
			);
		},

		/** アーティスト詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicArtistDetail>(`/api/public/artists/${id}`),

		/** 名義のトラック一覧を取得（idは名義ID: {artistId}__main__ または aliasId） */
		tracks: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
				role?: string;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.role) sp.set("role", params.role);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicArtistTrack>>(
				`/api/public/artists/${id}/tracks${query ? `?${query}` : ""}`,
			);
		},

		/** 名義の原作/原曲統計を取得 */
		stats: (
			id: string,
			workId?: string,
			stacked?: boolean,
		): Promise<
			WorkStatsResponse | StackedWorkStatsResponse | SongStatsResponse
		> => {
			const sp = new URLSearchParams();
			if (workId) sp.set("workId", workId);
			if (stacked) sp.set("stacked", "true");
			const query = sp.toString();
			return publicFetch(
				`/api/public/artists/${id}/stats/works${query ? `?${query}` : ""}`,
			);
		},
	},

	eventSeries: {
		/** イベントシリーズ一覧を取得 */
		list: () =>
			publicFetch<{ data: PublicEventSeriesItem[] }>(
				"/api/public/event-series",
			),
	},

	events: {
		/** イベント一覧を取得 */
		list: (params?: {
			page?: number;
			limit?: number;
			seriesId?: string;
			search?: string;
			sortBy?: string;
			sortOrder?: string;
		}) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.seriesId) sp.set("seriesId", params.seriesId);
			if (params?.search) sp.set("search", params.search);
			if (params?.sortBy) sp.set("sortBy", params.sortBy);
			if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicEventItem>>(
				`/api/public/events${query ? `?${query}` : ""}`,
			);
		},

		/** イベント詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicEventDetail>(`/api/public/events/${id}`),

		/** イベントの作品一覧を取得 */
		releases: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
				search?: string;
				sortBy?: string;
				sortOrder?: string;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.search) sp.set("search", params.search);
			if (params?.sortBy) sp.set("sortBy", params.sortBy);
			if (params?.sortOrder) sp.set("sortOrder", params.sortOrder);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicEventRelease>>(
				`/api/public/events/${id}/releases${query ? `?${query}` : ""}`,
			);
		},

		/** イベントの原作/原曲統計を取得 */
		stats: (
			id: string,
			workId?: string,
			stacked?: boolean,
		): Promise<
			WorkStatsResponse | StackedWorkStatsResponse | SongStatsResponse
		> => {
			const sp = new URLSearchParams();
			if (workId) sp.set("workId", workId);
			if (stacked) sp.set("stacked", "true");
			const query = sp.toString();
			return publicFetch(
				`/api/public/events/${id}/stats/works${query ? `?${query}` : ""}`,
			);
		},
	},

	releases: {
		/** 作品詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicReleaseDetail>(`/api/public/releases/${id}`),
	},

	tracks: {
		/** トラック詳細を取得 */
		get: (id: string) =>
			publicFetch<PublicTrackDetail>(`/api/public/tracks/${id}`),
	},

	/** トラック検索 */
	search: {
		tracks: (params: TrackSearchParams) => {
			const sp = new URLSearchParams();
			sp.set("q", params.q);
			if (params.page) sp.set("page", String(params.page));
			if (params.limit) sp.set("limit", String(params.limit));
			if (params.sort) sp.set("sort", params.sort);
			return publicFetch<TrackSearchResponse>(
				`/api/public/search/tracks?${sp.toString()}`,
			);
		},
	},

	tags: {
		/** タグ一覧を取得 */
		list: (params?: { page?: number; limit?: number; search?: string }) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			if (params?.search) sp.set("search", params.search);
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicTagItem>>(
				`/api/public/tags${query ? `?${query}` : ""}`,
			);
		},

		/** タグ詳細を取得 */
		get: (id: string) => publicFetch<PublicTagDetail>(`/api/public/tags/${id}`),

		/** タグのトラック一覧を取得 */
		tracks: (
			id: string,
			params?: {
				page?: number;
				limit?: number;
			},
		) => {
			const sp = new URLSearchParams();
			if (params?.page) sp.set("page", String(params.page));
			if (params?.limit) sp.set("limit", String(params.limit));
			const query = sp.toString();
			return publicFetch<PaginatedResponse<PublicArrangeTrack>>(
				`/api/public/tags/${id}/tracks${query ? `?${query}` : ""}`,
			);
		},

		/** タグクラウドを取得 */
		cloud: (limit?: number) => {
			const sp = new URLSearchParams();
			if (limit) sp.set("limit", String(limit));
			const query = sp.toString();
			return publicFetch<{ data: PublicTagCloudItem[] }>(
				`/api/public/tags/cloud${query ? `?${query}` : ""}`,
			);
		},
	},

	collections: {
		/** 公開コレクション詳細を shortId で取得 */
		getByShortId: async (shortId: string): Promise<PublicCollectionDetail> => {
			const res = await publicFetch<PublicCollectionResponse>(
				`/api/public/collections/${shortId}`,
			);
			return { ...res.collection, items: res.items };
		},
	},
};
