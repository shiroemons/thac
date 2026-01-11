/**
 * 公開ページ用 TanStack Query オプション
 * 統計データのプリフェッチとキャッシュ管理に使用
 */
import { queryOptions } from "@tanstack/react-query";
import {
	publicApi,
	type SongStatsResponse,
	type StackedWorkStatsResponse,
	type WorkStatsResponse,
} from "./public-api";

export type StatsEntityType = "circle" | "artist" | "event";

/** 公開ページ用のstaleTime設定 */
export const STALE_TIME_PUBLIC = {
	/** 統計データ: 1分（頻繁に変わらない） */
	STATS: 60_000,
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
