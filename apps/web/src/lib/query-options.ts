/**
 * TanStack Query用のqueryOptionsファクトリ
 *
 * このファイルは、ルーターローダーとコンポーネントで共通のqueryOptionsを提供する。
 * ensureQueryData + queryOptionsパターンを使用することで、
 * ローダーでプリフェッチしたデータをコンポーネントで自動的に使用できる。
 *
 * @example
 * // ルートのloader
 * loader: ({ context, params }) =>
 *   context.queryClient.ensureQueryData(artistDetailQueryOptions(params.id))
 *
 * // コンポーネント
 * const { data } = useQuery(artistDetailQueryOptions(id))
 */
import { queryOptions } from "@tanstack/react-query";
import { ssrFetch } from "@/functions/ssr-fetcher";
import type {
	AliasType,
	Artist,
	ArtistAlias,
	ArtistCircle,
	ArtistTracksResponse,
	ArtistWithAliases,
	Circle,
	CircleWithLinks,
	CreditRole,
	Event,
	EventSeries,
	EventSeriesWithEvents,
	EventWithDays,
	OfficialSong,
	OfficialWork,
	OfficialWorkCategory,
	PaginatedResponse,
	Platform,
	ReleaseWithCounts,
	ReleaseWithDiscs,
	TrackDetail,
	TrackWithCreditCount,
} from "@/lib/api-client";

/**
 * staleTime定数
 * データの種類に応じて適切なstaleTimeを設定
 */
export const STALE_TIME = {
	/** 30秒 - 頻繁に変更されるデータ */
	SHORT: 30_000,
	/** 1分 - マスターデータなど */
	MEDIUM: 60_000,
	/** 5分 - ほとんど変更されないデータ */
	LONG: 300_000,
} as const;

// ===== アーティスト =====

interface ArtistListParams {
	page: number;
	limit: number;
	search?: string;
	initialScript?: string;
}

/**
 * アーティスト一覧のqueryOptions
 */
export const artistsListQueryOptions = (params: ArtistListParams) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.initialScript)
		searchParams.set("initialScript", params.initialScript);

	return queryOptions({
		queryKey: [
			"artists",
			params.page,
			params.limit,
			params.search,
			params.initialScript,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<Artist>>(
				`/api/admin/artists?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * アーティスト詳細のqueryOptions
 */
export const artistDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artist", id],
		queryFn: () => ssrFetch<ArtistWithAliases>(`/api/admin/artists/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

/**
 * アーティストの関連楽曲のqueryOptions
 */
export const artistTracksQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artist", id, "tracks"],
		queryFn: () =>
			ssrFetch<ArtistTracksResponse>(`/api/admin/artists/${id}/tracks`),
		staleTime: STALE_TIME.SHORT,
	});

/**
 * アーティストの参加サークルのqueryOptions
 */
export const artistCirclesQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artist", id, "circles"],
		queryFn: () => ssrFetch<ArtistCircle[]>(`/api/admin/artists/${id}/circles`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== アーティストエイリアス =====

interface ArtistAliasListParams {
	page: number;
	limit: number;
	search?: string;
	artistId?: string;
}

/**
 * アーティストエイリアス一覧のqueryOptions
 */
export const artistAliasesListQueryOptions = (
	params: ArtistAliasListParams,
) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.artistId) searchParams.set("artistId", params.artistId);

	return queryOptions({
		queryKey: [
			"artistAliases",
			params.page,
			params.limit,
			params.search,
			params.artistId,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<ArtistAlias>>(
				`/api/admin/artist-aliases?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * アーティストエイリアス詳細のqueryOptions
 */
export const artistAliasDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artistAlias", id],
		queryFn: () => ssrFetch<ArtistAlias>(`/api/admin/artist-aliases/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

/**
 * アーティストエイリアスの関連楽曲のqueryOptions
 */
export const artistAliasTracksQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["artistAlias", id, "tracks"],
		queryFn: () =>
			ssrFetch<ArtistTracksResponse>(`/api/admin/artist-aliases/${id}/tracks`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== サークル =====

interface CircleListParams {
	page: number;
	limit: number;
	search?: string;
	initialScript?: string;
}

/**
 * サークル一覧のqueryOptions
 */
export const circlesListQueryOptions = (params: CircleListParams) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.initialScript)
		searchParams.set("initialScript", params.initialScript);

	return queryOptions({
		queryKey: [
			"circles",
			params.page,
			params.limit,
			params.search,
			params.initialScript,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<Circle>>(
				`/api/admin/circles?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * サークル詳細のqueryOptions
 */
export const circleDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["circle", id],
		queryFn: () => ssrFetch<CircleWithLinks>(`/api/admin/circles/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== イベント =====

interface EventListParams {
	page: number;
	limit: number;
	search?: string;
	seriesId?: string;
}

/**
 * イベント一覧のqueryOptions
 */
export const eventsListQueryOptions = (params: EventListParams) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.seriesId) searchParams.set("seriesId", params.seriesId);

	return queryOptions({
		queryKey: [
			"events",
			params.page,
			params.limit,
			params.search,
			params.seriesId,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<Event>>(
				`/api/admin/events?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * イベント詳細のqueryOptions
 */
export const eventDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["event", id],
		queryFn: () => ssrFetch<EventWithDays>(`/api/admin/events/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== イベントシリーズ =====

interface EventSeriesListParams {
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

/**
 * イベントシリーズ一覧のqueryOptions
 */
export const eventSeriesListQueryOptions = (params?: EventSeriesListParams) => {
	const searchParams = new URLSearchParams();
	if (params?.search) searchParams.set("search", params.search);
	if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
	if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
	const query = searchParams.toString();

	return queryOptions({
		queryKey: [
			"eventSeries",
			params?.search,
			params?.sortBy,
			params?.sortOrder,
		],
		queryFn: () =>
			ssrFetch<{ data: EventSeries[]; total: number }>(
				`/api/admin/event-series${query ? `?${query}` : ""}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * イベントシリーズ詳細のqueryOptions
 */
export const eventSeriesDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["eventSeries", id],
		queryFn: () =>
			ssrFetch<EventSeriesWithEvents>(`/api/admin/event-series/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== リリース =====

interface ReleaseListParams {
	page: number;
	limit: number;
	search?: string;
	releaseType?: string;
}

/**
 * リリース一覧のqueryOptions
 */
export const releasesListQueryOptions = (params: ReleaseListParams) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.releaseType) searchParams.set("releaseType", params.releaseType);

	return queryOptions({
		queryKey: [
			"releases",
			params.page,
			params.limit,
			params.search,
			params.releaseType,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<ReleaseWithCounts>>(
				`/api/admin/releases?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * リリース詳細のqueryOptions
 */
export const releaseDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["release", id],
		queryFn: () => ssrFetch<ReleaseWithDiscs>(`/api/admin/releases/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

/**
 * リリースのトラック一覧のqueryOptions
 */
export const releaseTracksQueryOptions = (releaseId: string) =>
	queryOptions({
		queryKey: ["release", releaseId, "tracks"],
		queryFn: () =>
			ssrFetch<TrackWithCreditCount[]>(
				`/api/admin/releases/${releaseId}/tracks`,
			),
		staleTime: STALE_TIME.SHORT,
	});

// ===== トラック =====

/**
 * トラック詳細のqueryOptions
 */
export const trackDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["track", id],
		queryFn: () => ssrFetch<TrackDetail>(`/api/admin/tracks/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== 公式作品 =====

interface OfficialWorkListParams {
	page: number;
	limit: number;
	search?: string;
	category?: string;
}

/**
 * 公式作品一覧のqueryOptions
 */
export const officialWorksListQueryOptions = (
	params: OfficialWorkListParams,
) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.category) searchParams.set("category", params.category);

	return queryOptions({
		queryKey: [
			"officialWorks",
			params.page,
			params.limit,
			params.search,
			params.category,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<OfficialWork>>(
				`/api/admin/official/works?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * 公式作品詳細のqueryOptions
 */
export const officialWorkDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["officialWork", id],
		queryFn: () => ssrFetch<OfficialWork>(`/api/admin/official/works/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== 公式楽曲 =====

interface OfficialSongListParams {
	page: number;
	limit: number;
	search?: string;
	workId?: string;
}

/**
 * 公式楽曲一覧のqueryOptions
 */
export const officialSongsListQueryOptions = (
	params: OfficialSongListParams,
) => {
	const searchParams = new URLSearchParams();
	searchParams.set("page", String(params.page));
	searchParams.set("limit", String(params.limit));
	if (params.search) searchParams.set("search", params.search);
	if (params.workId) searchParams.set("workId", params.workId);

	return queryOptions({
		queryKey: [
			"officialSongs",
			params.page,
			params.limit,
			params.search,
			params.workId,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<OfficialSong>>(
				`/api/admin/official/songs?${searchParams.toString()}`,
			),
		staleTime: STALE_TIME.SHORT,
	});
};

/**
 * 公式楽曲詳細のqueryOptions
 */
export const officialSongDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["officialSong", id],
		queryFn: () => ssrFetch<OfficialSong>(`/api/admin/official/songs/${id}`),
		staleTime: STALE_TIME.SHORT,
	});

// ===== マスターデータ: プラットフォーム =====

interface PlatformListParams {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
}

/**
 * プラットフォーム一覧のqueryOptions
 */
export const platformsListQueryOptions = (params?: PlatformListParams) => {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	if (params?.category) searchParams.set("category", params.category);
	const query = searchParams.toString();

	return queryOptions({
		queryKey: [
			"platforms",
			params?.page,
			params?.limit,
			params?.search,
			params?.category,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<Platform>>(
				`/api/admin/master/platforms${query ? `?${query}` : ""}`,
			),
		staleTime: STALE_TIME.MEDIUM,
	});
};

/**
 * プラットフォーム詳細のqueryOptions
 */
export const platformDetailQueryOptions = (code: string) =>
	queryOptions({
		queryKey: ["platform", code],
		queryFn: () => ssrFetch<Platform>(`/api/admin/master/platforms/${code}`),
		staleTime: STALE_TIME.MEDIUM,
	});

// ===== マスターデータ: 名義種別 =====

interface AliasTypeListParams {
	page?: number;
	limit?: number;
	search?: string;
}

/**
 * 名義種別一覧のqueryOptions
 */
export const aliasTypesListQueryOptions = (params?: AliasTypeListParams) => {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	const query = searchParams.toString();

	return queryOptions({
		queryKey: ["aliasTypes", params?.page, params?.limit, params?.search],
		queryFn: () =>
			ssrFetch<PaginatedResponse<AliasType>>(
				`/api/admin/master/alias-types${query ? `?${query}` : ""}`,
			),
		staleTime: STALE_TIME.MEDIUM,
	});
};

/**
 * 名義種別詳細のqueryOptions
 */
export const aliasTypeDetailQueryOptions = (code: string) =>
	queryOptions({
		queryKey: ["aliasType", code],
		queryFn: () => ssrFetch<AliasType>(`/api/admin/master/alias-types/${code}`),
		staleTime: STALE_TIME.MEDIUM,
	});

// ===== マスターデータ: クレジット役割 =====

interface CreditRoleListParams {
	page?: number;
	limit?: number;
	search?: string;
}

/**
 * クレジット役割一覧のqueryOptions
 */
export const creditRolesListQueryOptions = (params?: CreditRoleListParams) => {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	const query = searchParams.toString();

	return queryOptions({
		queryKey: ["creditRoles", params?.page, params?.limit, params?.search],
		queryFn: () =>
			ssrFetch<PaginatedResponse<CreditRole>>(
				`/api/admin/master/credit-roles${query ? `?${query}` : ""}`,
			),
		staleTime: STALE_TIME.MEDIUM,
	});
};

/**
 * クレジット役割詳細のqueryOptions
 */
export const creditRoleDetailQueryOptions = (code: string) =>
	queryOptions({
		queryKey: ["creditRole", code],
		queryFn: () =>
			ssrFetch<CreditRole>(`/api/admin/master/credit-roles/${code}`),
		staleTime: STALE_TIME.MEDIUM,
	});

// ===== マスターデータ: 公式作品カテゴリ =====

interface OfficialWorkCategoryListParams {
	page?: number;
	limit?: number;
	search?: string;
}

/**
 * 公式作品カテゴリ一覧のqueryOptions
 */
export const officialWorkCategoriesListQueryOptions = (
	params?: OfficialWorkCategoryListParams,
) => {
	const searchParams = new URLSearchParams();
	if (params?.page) searchParams.set("page", String(params.page));
	if (params?.limit) searchParams.set("limit", String(params.limit));
	if (params?.search) searchParams.set("search", params.search);
	const query = searchParams.toString();

	return queryOptions({
		queryKey: [
			"officialWorkCategories",
			params?.page,
			params?.limit,
			params?.search,
		],
		queryFn: () =>
			ssrFetch<PaginatedResponse<OfficialWorkCategory>>(
				`/api/admin/master/official-work-categories${query ? `?${query}` : ""}`,
			),
		staleTime: STALE_TIME.MEDIUM,
	});
};

/**
 * 公式作品カテゴリ詳細のqueryOptions
 */
export const officialWorkCategoryDetailQueryOptions = (code: string) =>
	queryOptions({
		queryKey: ["officialWorkCategory", code],
		queryFn: () =>
			ssrFetch<OfficialWorkCategory>(
				`/api/admin/master/official-work-categories/${code}`,
			),
		staleTime: STALE_TIME.MEDIUM,
	});
