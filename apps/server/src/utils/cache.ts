import type { Context } from "hono";

/**
 * インメモリキャッシュユーティリティ
 * シングルサーバー向けのシンプルなキャッシュ実装
 */

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

// インメモリキャッシュストア
const cache = new Map<string, CacheEntry<unknown>>();

// キャッシュTTL定数（秒）
export const CACHE_TTL = {
	CATEGORIES: 24 * 60 * 60, // 24時間
	WORKS_LIST: 5 * 60, // 5分
	WORK_DETAIL: 5 * 60, // 5分
	SONGS_LIST: 5 * 60, // 5分
	SONG_DETAIL: 5 * 60, // 5分
	TRACKS_LIST: 60, // 1分
	CIRCLES_LIST: 5 * 60, // 5分
	CIRCLE_DETAIL: 5 * 60, // 5分
	CIRCLE_RELEASES: 5 * 60, // 5分
	CIRCLE_TRACKS: 5 * 60, // 5分
	ARTISTS_LIST: 5 * 60, // 5分
	ARTIST_DETAIL: 5 * 60, // 5分
	ARTIST_TRACKS: 5 * 60, // 5分
} as const;

/**
 * キャッシュからデータを取得
 * 期限切れの場合はnullを返し、エントリを削除
 */
export function getCache<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;

	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}

	return entry.data as T;
}

/**
 * キャッシュにデータを設定
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
	cache.set(key, {
		data,
		expiresAt: Date.now() + ttlSeconds * 1000,
	});
}

/**
 * 特定のキャッシュを無効化
 */
export function invalidateCache(key: string): void {
	cache.delete(key);
}

/**
 * パターンマッチでキャッシュを無効化
 * 例: invalidateCacheByPattern("public:works:") で works 関連をすべて削除
 */
export function invalidateCacheByPattern(pattern: string): void {
	for (const key of cache.keys()) {
		if (key.startsWith(pattern)) {
			cache.delete(key);
		}
	}
}

/**
 * すべてのキャッシュをクリア
 */
export function clearAllCache(): void {
	cache.clear();
}

/**
 * 期限切れのキャッシュエントリを削除（メンテナンス用）
 */
export function pruneExpiredCache(): number {
	const now = Date.now();
	let count = 0;

	for (const [key, entry] of cache.entries()) {
		if (now > entry.expiresAt) {
			cache.delete(key);
			count++;
		}
	}

	return count;
}

/**
 * キャッシュの統計情報を取得
 */
export function getCacheStats(): { size: number; keys: string[] } {
	return {
		size: cache.size,
		keys: Array.from(cache.keys()),
	};
}

/**
 * HTTPキャッシュヘッダーを設定
 */
export function setCacheHeaders(
	c: Context,
	options: {
		maxAge: number;
		staleWhileRevalidate?: number;
		isPrivate?: boolean;
	},
): void {
	const { maxAge, staleWhileRevalidate = 60, isPrivate = false } = options;
	const visibility = isPrivate ? "private" : "public";

	c.header(
		"Cache-Control",
		`${visibility}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
	);
	c.header("Vary", "Accept-Encoding");
}

/**
 * キャッシュキー生成ヘルパー
 */
export const cacheKeys = {
	categories: () => "public:categories",

	worksList: (params: {
		page: number;
		limit: number;
		category?: string;
		search?: string;
	}) =>
		`public:works:page=${params.page}:limit=${params.limit}:category=${params.category || ""}:search=${params.search || ""}`,

	workDetail: (workId: string) => `public:works:${workId}`,

	songsList: (params: {
		page: number;
		limit: number;
		workId?: string;
		category?: string;
		search?: string;
	}) =>
		`public:songs:page=${params.page}:limit=${params.limit}:workId=${params.workId || ""}:category=${params.category || ""}:search=${params.search || ""}`,

	songDetail: (songId: string) => `public:songs:${songId}`,

	tracksList: (params: { songId: string; page: number; limit: number }) =>
		`public:songs:${params.songId}:tracks:page=${params.page}:limit=${params.limit}`,

	circlesList: (params: {
		page: number;
		limit: number;
		initialScript?: string;
		initial?: string;
		row?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: string;
	}) =>
		`public:circles:page=${params.page}:limit=${params.limit}:script=${params.initialScript || ""}:initial=${params.initial || ""}:row=${params.row || ""}:search=${params.search || ""}:sortBy=${params.sortBy || ""}:sortOrder=${params.sortOrder || ""}`,

	circleDetail: (circleId: string) => `public:circles:${circleId}`,

	circleReleases: (params: { circleId: string; page: number; limit: number }) =>
		`public:circles:${params.circleId}:releases:page=${params.page}:limit=${params.limit}`,

	circleTracks: (params: { circleId: string; page: number; limit: number }) =>
		`public:circles:${params.circleId}:tracks:page=${params.page}:limit=${params.limit}`,

	artistsList: (params: {
		page: number;
		limit: number;
		initialScript?: string;
		initial?: string;
		row?: string;
		role?: string;
		search?: string;
		sortBy?: string;
		sortOrder?: string;
	}) =>
		`public:artists:page=${params.page}:limit=${params.limit}:script=${params.initialScript || ""}:initial=${params.initial || ""}:row=${params.row || ""}:role=${params.role || ""}:search=${params.search || ""}:sortBy=${params.sortBy || ""}:sortOrder=${params.sortOrder || ""}`,

	artistDetail: (artistId: string) => `public:artists:${artistId}`,

	artistTracks: (params: {
		artistId: string;
		page: number;
		limit: number;
		aliasId?: string;
		role?: string;
	}) =>
		`public:artists:${params.artistId}:tracks:page=${params.page}:limit=${params.limit}:aliasId=${params.aliasId || ""}:role=${params.role || ""}`,
};
