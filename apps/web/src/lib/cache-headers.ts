/**
 * SSRレスポンスのキャッシュヘッダー設定
 *
 * TanStack Startのheadersプロパティで使用するキャッシュ設定を一元管理
 */
export const CACHE_HEADERS = {
	/**
	 * 公開詳細ページ用
	 * - max-age: 5分（300秒）
	 * - stale-while-revalidate: 10分（600秒）
	 */
	PUBLIC_DETAIL: {
		"Cache-Control": "public, max-age=300, stale-while-revalidate=600",
	},
	/**
	 * 静的ページ用（about, privacy, stats）
	 * - max-age: 1時間（3600秒）
	 * - stale-while-revalidate: 24時間（86400秒）
	 */
	PUBLIC_STATIC: {
		"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
	},
	/**
	 * 管理画面用（キャッシュ無効化）
	 */
	PRIVATE: {
		"Cache-Control": "private, no-cache",
	},
} as const;
