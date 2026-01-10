/**
 * 詳細ページタブユーティリティ
 *
 * サークル詳細、アーティスト詳細、イベント詳細ページの
 * タブ管理とURLパラメータバリデーションを提供。
 */

// =============================================================================
// 型定義
// =============================================================================

/** サークル詳細のタブ */
export type CircleDetailTab = "releases" | "tracks" | "stats";

/** アーティスト詳細のタブ */
export type ArtistDetailTab = "tracks" | "stats";

/** イベント詳細のタブ */
export type EventDetailTab = "releases" | "stats";

// =============================================================================
// 定数
// =============================================================================

/** サークル詳細タブの配列 */
export const CIRCLE_DETAIL_TABS: readonly CircleDetailTab[] = [
	"releases",
	"tracks",
	"stats",
] as const;

/** アーティスト詳細タブの配列 */
export const ARTIST_DETAIL_TABS: readonly ArtistDetailTab[] = [
	"tracks",
	"stats",
] as const;

/** イベント詳細タブの配列 */
export const EVENT_DETAIL_TABS: readonly EventDetailTab[] = [
	"releases",
	"stats",
] as const;

/** タブラベル */
export const TAB_LABELS = {
	releases: "リリース一覧",
	tracks: "曲一覧",
	stats: "統計",
} as const;

// =============================================================================
// バリデーション関数
// =============================================================================

/**
 * 有効なサークル詳細タブか判定
 */
export function isValidCircleDetailTab(
	value: unknown,
): value is CircleDetailTab {
	return (
		typeof value === "string" &&
		CIRCLE_DETAIL_TABS.includes(value as CircleDetailTab)
	);
}

/**
 * 有効なアーティスト詳細タブか判定
 */
export function isValidArtistDetailTab(
	value: unknown,
): value is ArtistDetailTab {
	return (
		typeof value === "string" &&
		ARTIST_DETAIL_TABS.includes(value as ArtistDetailTab)
	);
}

/**
 * 有効なイベント詳細タブか判定
 */
export function isValidEventDetailTab(value: unknown): value is EventDetailTab {
	return (
		typeof value === "string" &&
		EVENT_DETAIL_TABS.includes(value as EventDetailTab)
	);
}

// =============================================================================
// URL パラメータ用ヘルパー
// =============================================================================

/**
 * URLパラメータをパースしてサークル詳細タブを取得
 */
export function parseCircleDetailTab(value: unknown): CircleDetailTab {
	return isValidCircleDetailTab(value) ? value : "releases";
}

/**
 * URLパラメータをパースしてアーティスト詳細タブを取得
 */
export function parseArtistDetailTab(value: unknown): ArtistDetailTab {
	return isValidArtistDetailTab(value) ? value : "tracks";
}

/**
 * URLパラメータをパースしてイベント詳細タブを取得
 */
export function parseEventDetailTab(value: unknown): EventDetailTab {
	return isValidEventDetailTab(value) ? value : "releases";
}
