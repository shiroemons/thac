// 国コード一覧（ISO 3166-1 alpha-2）
export const COUNTRY_CODE_OPTIONS = [
	{ value: "JP", label: "JP - 日本" },
	{ value: "US", label: "US - アメリカ" },
	{ value: "GB", label: "GB - イギリス" },
	{ value: "DE", label: "DE - ドイツ" },
	{ value: "FR", label: "FR - フランス" },
	{ value: "CN", label: "CN - 中国" },
	{ value: "KR", label: "KR - 韓国" },
	{ value: "TW", label: "TW - 台湾" },
] as const;

// プラットフォームカテゴリのラベル（日本語）
export const PLATFORM_CATEGORY_LABELS: Record<string, string> = {
	streaming: "ストリーミング",
	video: "動画",
	download: "ダウンロード",
	shop: "ショップ",
	other: "その他",
};

// プラットフォームカテゴリの表示順序
export const PLATFORM_CATEGORY_ORDER = [
	"streaming",
	"video",
	"download",
	"shop",
	"other",
] as const;

// 公式作品カテゴリのラベル（日本語）
export const OFFICIAL_WORK_CATEGORY_LABELS: Record<string, string> = {
	windows: "Windows作品",
	pc98: "PC-98作品",
	zuns_music_collection: "ZUN's Music Collection",
	akyus_untouched_score: "幺樂団の歴史",
	tasofro: "黄昏フロンティア",
	other: "その他",
};

// 公式作品カテゴリの表示順序
export const OFFICIAL_WORK_CATEGORY_ORDER = [
	"windows",
	"pc98",
	"zuns_music_collection",
	"akyus_untouched_score",
	"tasofro",
	"other",
] as const;
