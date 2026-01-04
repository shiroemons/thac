/**
 * 詳細検索フィルターの型定義
 */

/** 検索カテゴリ */
export type SearchCategory = "all" | "artist" | "circle" | "track";

/** クレジットロール（役割） */
export type CreditRole =
	| "vocalist"
	| "lyricist"
	| "arranger"
	| "composer"
	| "performer"
	| "mixer"
	| "producer";

/** 原曲数フィルターの値 */
export type SongCountFilter = "any" | "1" | "2" | "3+" | number;

/** 選択された原曲 */
export interface SelectedOriginalSong {
	id: string;
	name: string;
	workName?: string;
	categoryName?: string;
}

/** 選択されたサークル */
export interface SelectedCircle {
	id: string;
	name: string;
}

/** 選択されたアーティスト（役割付き） */
export interface SelectedArtist {
	id: string;
	name: string;
	role: CreditRole;
}

/** 選択されたイベント */
export interface SelectedEvent {
	id: string;
	name: string;
	seriesName?: string;
}

/** 日付範囲 */
export interface DateRange {
	from?: string; // YYYY-MM形式
	to?: string; // YYYY-MM形式
}

/** テキスト検索フィルター（直接入力） */
export interface TextSearchFilters {
	artistName: string;
	circleName: string;
	albumName: string;
	trackName: string;
}

/** 役割者数のマッチタイプ */
export type RoleCountMatchType = "exact" | "gte" | "lte"; // exact = 一致, gte = 以上, lte = 以下

/** 役割者数フィルターのエントリ */
export interface RoleCountEntry {
	count: number;
	matchType: RoleCountMatchType;
}

/** 役割者数フィルターの値 */
export type RoleCountValue = "any" | RoleCountEntry;

/** 役割者数フィルター */
export interface RoleCountFilters {
	vocalistCount: RoleCountValue;
	lyricistCount: RoleCountValue;
	composerCount: RoleCountValue;
	arrangerCount: RoleCountValue;
}

/** 詳細検索フィルター */
export interface AdvancedSearchFilters {
	/** テキスト検索（直接入力） */
	textSearch: TextSearchFilters;
	/** 選択された原曲 */
	originalSongs: SelectedOriginalSong[];
	/** 選択されたアーティスト（役割付き） */
	artists: SelectedArtist[];
	/** 選択されたサークル */
	circles: SelectedCircle[];
	/** 役割者数フィルター */
	roleCounts: RoleCountFilters;
	/** 原曲数フィルター */
	songCount: SongCountFilter;
	/** 日付範囲 */
	dateRange: DateRange;
	/** 選択されたイベント */
	event: SelectedEvent | null;
}

/** URLパラメータ用の検索パラメータ */
export interface AdvancedSearchParams {
	// 基本
	q?: string;
	category?: SearchCategory;

	// 詳細フィルター
	originals?: string[]; // 原曲ID配列
	circles?: string[]; // サークルID配列
	vocalist?: string[]; // ボーカルアーティストID
	lyricist?: string[]; // 作詞者ID
	arranger?: string[]; // 編曲者ID
	composer?: string[]; // 作曲者ID

	// 期間
	dateFrom?: string; // YYYY-MM
	dateTo?: string; // YYYY-MM
	event?: string; // イベントID

	// その他
	songCount?: SongCountFilter;

	// UI状態
	mode?: "simple" | "advanced";
}

/** フィルターチップの種類 */
export type FilterChipType =
	| "textSearch"
	| "originalSong"
	| "artist"
	| "circle"
	| "roleCount"
	| "songCount"
	| "date"
	| "event";

/** フィルターチップのデータ */
export interface FilterChip {
	id: string;
	type: FilterChipType;
	label: string;
	sublabel?: string;
	value: string | number;
}

/** フィルターセクションの開閉状態 */
export interface FilterSectionState {
	textSearch: boolean;
	originalSongs: boolean;
	artists: boolean;
	circles: boolean;
	roleCounts: boolean;
	songCount: boolean;
	dateRange: boolean;
	event: boolean;
}

/** 役割ラベルのマッピング */
export const ROLE_LABELS: Record<CreditRole, string> = {
	vocalist: "ボーカル",
	lyricist: "作詞",
	arranger: "編曲",
	composer: "作曲",
	performer: "演奏",
	mixer: "ミキサー",
	producer: "プロデューサー",
};

/** フィルターチップの色マッピング */
export const CHIP_COLORS: Record<FilterChipType, string> = {
	textSearch: "badge-neutral",
	originalSong: "badge-primary",
	artist: "badge-accent",
	circle: "badge-secondary",
	roleCount: "badge-warning",
	songCount: "badge-ghost",
	date: "badge-info",
	event: "badge-info",
};

/** デフォルトのテキスト検索状態 */
export const DEFAULT_TEXT_SEARCH: TextSearchFilters = {
	artistName: "",
	circleName: "",
	albumName: "",
	trackName: "",
};

/** デフォルトの役割者数状態 */
export const DEFAULT_ROLE_COUNTS: RoleCountFilters = {
	vocalistCount: "any",
	lyricistCount: "any",
	composerCount: "any",
	arrangerCount: "any",
};

/** デフォルトのフィルター状態 */
export const DEFAULT_FILTERS: AdvancedSearchFilters = {
	textSearch: DEFAULT_TEXT_SEARCH,
	originalSongs: [],
	artists: [],
	circles: [],
	roleCounts: DEFAULT_ROLE_COUNTS,
	songCount: "any",
	dateRange: {},
	event: null,
};

/** デフォルトのセクション開閉状態 */
export const DEFAULT_SECTION_STATE: FilterSectionState = {
	textSearch: true, // デフォルト展開
	originalSongs: true, // デフォルト展開
	artists: false,
	circles: false,
	roleCounts: false,
	songCount: false,
	dateRange: false,
	event: false,
};
