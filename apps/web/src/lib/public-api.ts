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
};
