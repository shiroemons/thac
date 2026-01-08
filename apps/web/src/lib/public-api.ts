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
			"http://localhost:3000"
		);
	}
	return import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
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
		creditName: string;
		roles: string[];
	}>;
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

/** サークルリリース */
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
		creditName: string;
		roles: string[];
	}>;
	originalSong: { id: string; name: string | null } | null;
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

/** イベントリリース */
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

// =============================================================================
// API関数
// =============================================================================

export const publicApi = {
	/** カテゴリマスタ一覧を取得 */
	categories: () =>
		publicFetch<{ data: PublicCategory[] }>(
			"/api/public/official-work-categories",
		),

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

		/** サークルのリリース一覧を取得 */
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

		/** イベントのリリース一覧を取得 */
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
			return publicFetch<PaginatedResponse<PublicEventRelease>>(
				`/api/public/events/${id}/releases${query ? `?${query}` : ""}`,
			);
		},
	},
};
