/**
 * 公開ページ用 TanStack Query オプション
 * 統計データのプリフェッチとキャッシュ管理に使用
 */
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import {
	type ArtistRankingItem,
	type CircleRankingItem,
	type OriginalSongRankingItem,
	type PaginatedResponse,
	type PublicArtistItem,
	type PublicCircleItem,
	type PublicEventRelease,
	publicApi,
	type SongPairRankingItem,
	type SongStatsResponse,
	type StackedWorkStatsResponse,
	type TrackSearchParams,
	type WorkStatsResponse,
} from "./public-api";

export type StatsEntityType = "circle" | "artist" | "event";

/** 公開ページ用のstaleTime設定 */
export const STALE_TIME_PUBLIC = {
	/** 統計データ: 1分（頻繁に変わらない） */
	STATS: 60_000,
	/** ランキング: 5分 */
	RANKINGS: 5 * 60_000,
	/** 最近の更新: 1分 */
	RECENT_UPDATES: 60_000,
	/** マスタデータ: 30分（ジャンルなど滅多に変わらない） */
	MASTER: 30 * 60_000,
} as const;

/**
 * 原作統計（積み上げモード）のクエリオプション
 * デスクトップ向け: 原曲ごとの内訳を含む
 */
export const publicWorkStatsStackedQueryOptions = (
	entityType: StatsEntityType,
	entityId: string,
) =>
	queryOptions({
		queryKey: ["public", entityType, entityId, "stats", "works", "stacked"],
		queryFn: async () => {
			switch (entityType) {
				case "circle":
					return publicApi.circles.stats(
						entityId,
						undefined,
						true,
					) as Promise<StackedWorkStatsResponse>;
				case "artist":
					return publicApi.artists.stats(
						entityId,
						undefined,
						true,
					) as Promise<StackedWorkStatsResponse>;
				case "event":
					return publicApi.events.stats(
						entityId,
						undefined,
						true,
					) as Promise<StackedWorkStatsResponse>;
			}
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

/**
 * 原作統計（シンプルモード）のクエリオプション
 * モバイル向け: 原作ごとの合計トラック数のみ
 */
export const publicWorkStatsSimpleQueryOptions = (
	entityType: StatsEntityType,
	entityId: string,
) =>
	queryOptions({
		queryKey: ["public", entityType, entityId, "stats", "works", "simple"],
		queryFn: async () => {
			switch (entityType) {
				case "circle":
					return publicApi.circles.stats(
						entityId,
						undefined,
						false,
					) as Promise<WorkStatsResponse>;
				case "artist":
					return publicApi.artists.stats(
						entityId,
						undefined,
						false,
					) as Promise<WorkStatsResponse>;
				case "event":
					return publicApi.events.stats(
						entityId,
						undefined,
						false,
					) as Promise<WorkStatsResponse>;
			}
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

/**
 * 原曲詳細統計のクエリオプション（ドリルダウン用）
 * 特定の原作内の原曲ごとのトラック数を取得
 */
export const publicSongStatsQueryOptions = (
	entityType: StatsEntityType,
	entityId: string,
	workId: string,
) =>
	queryOptions({
		queryKey: ["public", entityType, entityId, "stats", "songs", workId],
		queryFn: async () => {
			switch (entityType) {
				case "circle":
					return publicApi.circles.stats(
						entityId,
						workId,
						false,
					) as Promise<SongStatsResponse>;
				case "artist":
					return publicApi.artists.stats(
						entityId,
						workId,
						false,
					) as Promise<SongStatsResponse>;
				case "event":
					return publicApi.events.stats(
						entityId,
						workId,
						false,
					) as Promise<SongStatsResponse>;
			}
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

// =============================================================================
// ジャンルマスタ用クエリオプション
// =============================================================================

/**
 * ジャンルマスタ一覧のクエリオプション
 * 検索結果のジャンル表示などで使用
 */
export const publicGenresListOptions = () =>
	queryOptions({
		queryKey: ["public", "genres", "list"],
		queryFn: () => publicApi.genres.list(),
		staleTime: STALE_TIME_PUBLIC.MASTER,
	});

// =============================================================================
// 無限スクロール用クエリオプション
// =============================================================================

/** サークル一覧無限スクロール用パラメータ */
interface PublicCircleInfiniteParams {
	limit: number;
	search?: string;
	initialScript?: string;
	initial?: string;
	row?: string;
}

/**
 * サークル一覧の無限スクロールクエリオプション
 * 公開画面でのサークル一覧表示に使用
 */
export const publicCirclesInfiniteQueryOptions = (
	params: PublicCircleInfiniteParams,
) => {
	return infiniteQueryOptions({
		queryKey: [
			"public",
			"circles",
			"infinite",
			params.limit,
			params.search,
			params.initialScript,
			params.initial,
			params.row,
		],
		queryFn: ({ pageParam }) =>
			publicApi.circles.list({
				page: pageParam,
				limit: params.limit,
				initialScript: params.initialScript,
				initial: params.initial,
				row: params.row,
				search: params.search,
				sortBy: "name",
				sortOrder: "asc",
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<PublicCircleItem>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});
};

/** アーティスト一覧無限スクロール用パラメータ */
interface PublicArtistInfiniteParams {
	limit: number;
	search?: string;
	initialScript?: string;
	initial?: string;
	row?: string;
	role?: string;
}

/**
 * アーティスト一覧の無限スクロールクエリオプション
 * 公開画面でのアーティスト一覧表示に使用
 */
export const publicArtistsInfiniteQueryOptions = (
	params: PublicArtistInfiniteParams,
) => {
	return infiniteQueryOptions({
		queryKey: [
			"public",
			"artists",
			"infinite",
			params.limit,
			params.search,
			params.initialScript,
			params.initial,
			params.row,
			params.role,
		],
		queryFn: ({ pageParam }) =>
			publicApi.artists.list({
				page: pageParam,
				limit: params.limit,
				initialScript: params.initialScript,
				initial: params.initial,
				row: params.row,
				role: params.role,
				search: params.search,
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<PublicArtistItem>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});
};

// =============================================================================
// イベントシリーズ一覧用クエリオプション
// =============================================================================

/**
 * イベントシリーズ一覧のクエリオプション
 * 詳細検索のイベント選択で使用
 */
export const publicEventSeriesListOptions = () =>
	queryOptions({
		queryKey: ["public", "event-series", "list"],
		queryFn: () => publicApi.eventSeries.list(),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

// =============================================================================
// 詳細検索用マスターデータ クエリオプション
// =============================================================================

/**
 * アーティスト全件一覧のクエリオプション
 * 詳細検索のアーティスト選択で使用
 */
export const publicArtistsAllListOptions = () =>
	queryOptions({
		queryKey: ["public", "artists", "all"],
		queryFn: () => publicApi.artists.list({ limit: 10000 }),
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});

/**
 * サークル全件一覧のクエリオプション
 * 詳細検索のサークル選択で使用
 */
export const publicCirclesAllListOptions = () =>
	queryOptions({
		queryKey: ["public", "circles", "all"],
		queryFn: () => publicApi.circles.list({ limit: 10000 }),
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});

/**
 * イベント全件一覧のクエリオプション
 * 詳細検索のイベント選択で使用
 */
export const publicEventsAllListOptions = () =>
	queryOptions({
		queryKey: ["public", "events", "all"],
		queryFn: () => publicApi.events.list({ limit: 10000 }),
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});

/**
 * 原曲全件一覧のクエリオプション
 * 詳細検索の原曲選択で使用
 */
export const publicSongsAllListOptions = () =>
	queryOptions({
		queryKey: ["public", "original-songs", "all"],
		queryFn: () => publicApi.songs.list({ limit: 10000 }),
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});

// =============================================================================
// 統計ランキング・最近の更新用クエリオプション
// =============================================================================

/**
 * 統計ランキングのクエリオプション
 * 人気曲、活発サークル、活発アーティストのランキング
 */
export const publicStatsRankingsQueryOptions = () =>
	queryOptions({
		queryKey: ["public", "stats", "rankings"],
		queryFn: () => publicApi.stats.rankings(),
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});

/**
 * 最近の更新のクエリオプション
 * 新着・更新作品の一覧
 */
export const publicRecentUpdatesQueryOptions = () =>
	queryOptions({
		queryKey: ["public", "stats", "recent-updates"],
		queryFn: () => publicApi.stats.recentUpdates(),
		staleTime: STALE_TIME_PUBLIC.RECENT_UPDATES,
	});

// =============================================================================
// ランキング無限スクロール用クエリオプション
// =============================================================================

/**
 * 原曲アレンジ数ランキングの無限スクロールクエリオプション
 */
export const originalSongsRankingInfiniteQueryOptions = (limit = 20) => {
	return infiniteQueryOptions({
		queryKey: ["public", "stats", "rankings", "original-songs", limit],
		queryFn: ({ pageParam }) =>
			publicApi.stats.originalSongsRanking({ page: pageParam, limit }),
		initialPageParam: 1,
		getNextPageParam: (
			lastPage: PaginatedResponse<OriginalSongRankingItem>,
		) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});
};

/**
 * サークル作品数ランキングの無限スクロールクエリオプション
 */
export const circlesRankingInfiniteQueryOptions = (limit = 20) => {
	return infiniteQueryOptions({
		queryKey: ["public", "stats", "rankings", "circles", limit],
		queryFn: ({ pageParam }) =>
			publicApi.stats.circlesRanking({ page: pageParam, limit }),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<CircleRankingItem>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});
};

/**
 * アーティスト楽曲数ランキングの無限スクロールクエリオプション
 */
export const artistsRankingInfiniteQueryOptions = (limit = 20) => {
	return infiniteQueryOptions({
		queryKey: ["public", "stats", "rankings", "artists", limit],
		queryFn: ({ pageParam }) =>
			publicApi.stats.artistsRanking({ page: pageParam, limit }),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<ArtistRankingItem>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});
};

/**
 * 原曲2曲組み合わせランキングの無限スクロールクエリオプション
 */
export const songPairsRankingInfiniteQueryOptions = (limit = 20) => {
	return infiniteQueryOptions({
		queryKey: ["public", "stats", "rankings", "song-pairs", limit],
		queryFn: ({ pageParam }) =>
			publicApi.stats.songPairsRanking({ page: pageParam, limit }),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<SongPairRankingItem>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.RANKINGS,
	});
};

// =============================================================================
// イベント詳細ページ用無限スクロールクエリオプション
// =============================================================================

/** イベント作品一覧無限スクロール用パラメータ */
interface PublicEventReleasesInfiniteParams {
	eventId: string;
	limit?: number;
	search?: string;
	sortBy?: string;
	sortOrder?: string;
}

/**
 * イベント作品一覧の無限スクロールクエリオプション
 * イベント詳細ページでの作品一覧表示に使用
 */
export const publicEventReleasesInfiniteQueryOptions = (
	params: PublicEventReleasesInfiniteParams,
) => {
	return infiniteQueryOptions({
		queryKey: [
			"public",
			"events",
			params.eventId,
			"releases",
			"infinite",
			{
				limit: params.limit,
				search: params.search,
				sortBy: params.sortBy,
				sortOrder: params.sortOrder,
			},
		],
		queryFn: ({ pageParam }) =>
			publicApi.events.releases(params.eventId, {
				page: pageParam,
				limit: params.limit || 20,
				search: params.search,
				sortBy: params.sortBy,
				sortOrder: params.sortOrder,
			}),
		initialPageParam: 1,
		getNextPageParam: (lastPage: PaginatedResponse<PublicEventRelease>) => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		},
		staleTime: STALE_TIME_PUBLIC.STATS,
	});
};

// =============================================================================
// 検索用クエリオプション
// =============================================================================

/** 検索結果のstaleTime: 30秒（検索結果は頻繁に変わる可能性がある） */
const STALE_TIME_SEARCH = 30_000;

/**
 * トラック検索のクエリオプション
 * 検索ページでの結果表示に使用
 */
export const searchTracksQueryOptions = (params: TrackSearchParams) =>
	queryOptions({
		queryKey: ["public", "search", "tracks", params],
		queryFn: () => publicApi.search.tracks(params),
		staleTime: STALE_TIME_SEARCH,
		enabled: !!params.q, // クエリが空の場合は実行しない
	});

// =============================================================================
// 詳細ページ用 ページネーションクエリオプション
// =============================================================================

/** アーティスト名義のトラック一覧パラメータ */
interface PublicArtistTracksParams {
	page: number;
	limit: number;
	role?: string;
}

/**
 * アーティスト名義のトラック一覧クエリオプション
 * アーティスト詳細ページのトラックタブで使用
 */
export const publicArtistTracksQueryOptions = (
	artistId: string,
	params: PublicArtistTracksParams,
) =>
	queryOptions({
		queryKey: ["public", "artists", artistId, "tracks", params],
		queryFn: () => publicApi.artists.tracks(artistId, params),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

/** サークル作品/トラック一覧パラメータ */
interface PublicCirclePaginationParams {
	page: number;
	limit: number;
}

/**
 * サークルの作品一覧クエリオプション
 * サークル詳細ページの作品タブで使用
 */
export const publicCircleReleasesQueryOptions = (
	circleId: string,
	params: PublicCirclePaginationParams,
) =>
	queryOptions({
		queryKey: ["public", "circles", circleId, "releases", params],
		queryFn: () => publicApi.circles.releases(circleId, params),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

/**
 * サークルのトラック一覧クエリオプション
 * サークル詳細ページのトラックタブで使用
 */
export const publicCircleTracksQueryOptions = (
	circleId: string,
	params: PublicCirclePaginationParams,
) =>
	queryOptions({
		queryKey: ["public", "circles", circleId, "tracks", params],
		queryFn: () => publicApi.circles.tracks(circleId, params),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

// =============================================================================
// タグ用クエリオプション
// =============================================================================

/**
 * タグ一覧のクエリオプション
 */
export const publicTagsListQueryOptions = (params?: {
	page?: number;
	limit?: number;
	search?: string;
}) =>
	queryOptions({
		queryKey: ["public", "tags", "list", params],
		queryFn: () => publicApi.tags.list(params),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});

/**
 * タグ詳細のクエリオプション
 */
export const publicTagDetailQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["public", "tags", id],
		queryFn: () => publicApi.tags.get(id),
		staleTime: STALE_TIME_PUBLIC.STATS,
		enabled: !!id,
	});

/**
 * タグクラウドのクエリオプション
 */
export const publicTagCloudQueryOptions = (limit?: number) =>
	queryOptions({
		queryKey: ["public", "tags", "cloud", limit],
		queryFn: () => publicApi.tags.cloud(limit),
		staleTime: STALE_TIME_PUBLIC.STATS,
	});
