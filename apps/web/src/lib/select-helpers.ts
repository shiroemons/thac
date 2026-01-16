/**
 * セレクトオプション変換ヘルパー
 *
 * queryOptionsのselectで使用する変換関数を提供。
 * @tanstack/react-startへの依存を避けて単体テスト可能にするため、
 * query-options.tsから切り出している。
 */

import type {
	Event,
	EventDay,
	PaginatedResponse,
	Platform,
} from "./api-client";

export interface SelectOption {
	value: string;
	label: string;
}

export interface GroupedSelectOptions {
	label: string;
	options: SelectOption[];
}

/**
 * イベントリストをセレクトオプションに変換
 */
export function transformEventsToSelectOptions(
	data: PaginatedResponse<Event>,
): SelectOption[] {
	return data.data.map((e) => ({
		value: e.id,
		label: e.seriesName ? `【${e.seriesName}】${e.name}` : e.name,
	}));
}

/**
 * イベント日リストをセレクトオプションに変換
 */
export function transformEventDaysToSelectOptions(
	days: EventDay[],
): SelectOption[] {
	const hasMultipleDays = days.length > 1;
	return days.map((d) => ({
		value: d.id,
		label: hasMultipleDays ? `${d.dayNumber}日目（${d.date}）` : d.date,
	}));
}

// プラットフォームカテゴリのラベル定義
const PLATFORM_CATEGORY_LABELS: Record<string, string> = {
	streaming: "ストリーミング",
	download: "ダウンロード",
	video: "動画",
	shop: "ショップ",
	other: "その他",
};

// カテゴリの表示順序
const CATEGORY_ORDER = ["streaming", "download", "video", "shop", "other"];

/**
 * プラットフォームリストをカテゴリ別グループに変換
 */
export function transformPlatformsToGroupedOptions(
	data: PaginatedResponse<Platform>,
): GroupedSelectOptions[] {
	const groups: Record<string, Platform[]> = {};
	for (const p of data.data) {
		const category = p.category || "other";
		if (!groups[category]) groups[category] = [];
		groups[category].push(p);
	}

	return Object.keys(groups)
		.sort((a, b) => {
			const aIndex = CATEGORY_ORDER.indexOf(a);
			const bIndex = CATEGORY_ORDER.indexOf(b);
			if (aIndex === -1 && bIndex === -1) return a.localeCompare(b, "ja");
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		})
		.map((category) => ({
			label: PLATFORM_CATEGORY_LABELS[category] || "その他",
			options: groups[category].map((p) => ({
				value: p.code,
				label: p.name,
			})),
		}));
}
