/**
 * 詳細検索UIのモックデータ
 * APIが実装されるまでの間、UIデモ用に使用
 */

import type { NestedOption } from "../ui/nested-grouped-searchable-select";

/** 原曲のモックデータ（3階層選択用） */
export const mockOriginalSongs: NestedOption[] = [
	// PC-98 - 東方靈異伝
	{
		value: "01001001",
		label: "A Sacred Lot",
		category: "PC-98",
		subgroup: "東方靈異伝",
	},
	{
		value: "01001002",
		label: "永遠の巫女",
		category: "PC-98",
		subgroup: "東方靈異伝",
	},
	{
		value: "01001003",
		label: "The Positive and Negative",
		category: "PC-98",
		subgroup: "東方靈異伝",
	},
	// PC-98 - 東方封魔録
	{
		value: "01002001",
		label: "博麗 〜Eastern Wind",
		category: "PC-98",
		subgroup: "東方封魔録",
	},
	{
		value: "01002002",
		label: "End of Daylight",
		category: "PC-98",
		subgroup: "東方封魔録",
	},
	// Windows - 東方紅魔郷
	{
		value: "07001001",
		label: "赤より紅い夢",
		category: "Windows",
		subgroup: "東方紅魔郷",
	},
	{
		value: "07001002",
		label: "ほおずきみたいに紅い魂",
		category: "Windows",
		subgroup: "東方紅魔郷",
	},
	{
		value: "07001003",
		label: "上海紅茶館　〜 Chinese Tea",
		category: "Windows",
		subgroup: "東方紅魔郷",
	},
	{
		value: "07001004",
		label: "U.N.オーエンは彼女なのか？",
		category: "Windows",
		subgroup: "東方紅魔郷",
	},
	// Windows - 東方妖々夢
	{
		value: "07002001",
		label: "無何有の郷 〜 Deep Mountain",
		category: "Windows",
		subgroup: "東方妖々夢",
	},
	{
		value: "07002002",
		label: "幽霊楽団　〜 Phantom Ensemble",
		category: "Windows",
		subgroup: "東方妖々夢",
	},
	{
		value: "07002003",
		label: "東方妖々夢 〜 Ancient Temple",
		category: "Windows",
		subgroup: "東方妖々夢",
	},
	// Windows - 東方永夜抄
	{
		value: "07003001",
		label: "永夜抄 〜 Eastern Night.",
		category: "Windows",
		subgroup: "東方永夜抄",
	},
	{
		value: "07003002",
		label: "竹取飛翔 〜 Lunatic Princess",
		category: "Windows",
		subgroup: "東方永夜抄",
	},
	// Windows - 東方花映塚
	{
		value: "07004001",
		label: "花映塚 〜 Higan Retour",
		category: "Windows",
		subgroup: "東方花映塚",
	},
	// Windows - 東方風神録
	{
		value: "07005001",
		label: "神々が恋した幻想郷",
		category: "Windows",
		subgroup: "東方風神録",
	},
	{
		value: "07005002",
		label: "ネイティブフェイス",
		category: "Windows",
		subgroup: "東方風神録",
	},
	// CD - 蓬莱人形
	{
		value: "08001001",
		label: "蓬莱伝説",
		category: "CD",
		subgroup: "蓬莱人形",
	},
	// その他
	{
		value: "99001001",
		label: "Bad Apple!!",
		category: "その他",
		subgroup: "作品なし",
	},
];

/** カテゴリの表示順序 */
export const originalSongCategoryOrder = [
	"PC-98",
	"Windows",
	"CD",
	"書籍",
	"その他",
];

/** サークルのモックデータ */
export interface MockCircle {
	id: string;
	name: string;
	nameJa?: string;
}

export const mockCircles: MockCircle[] = [
	{ id: "c001", name: "IOSYS", nameJa: "イオシス" },
	{ id: "c002", name: "幽閉サテライト" },
	{ id: "c003", name: "SOUND HOLIC" },
	{ id: "c004", name: "Silver Forest" },
	{ id: "c005", name: "Alstroemeria Records" },
	{ id: "c006", name: "凋叶棕" },
	{ id: "c007", name: "東方アレンジ" },
	{ id: "c008", name: "魂音泉" },
	{ id: "c009", name: "CROW'SCLAW" },
	{ id: "c010", name: "FELT" },
	{ id: "c011", name: "暁Records" },
	{ id: "c012", name: "A-One" },
];

/** アーティストのモックデータ */
export interface MockArtist {
	id: string;
	name: string;
	nameJa?: string;
}

export const mockArtists: MockArtist[] = [
	{ id: "a001", name: "miko", nameJa: "みこ" },
	{ id: "a002", name: "ARM" },
	{ id: "a003", name: "夕野ヨシミ" },
	{ id: "a004", name: "senya" },
	{ id: "a005", name: "Nana Takahashi", nameJa: "高橋菜々" },
	{ id: "a006", name: "あよ" },
	{ id: "a007", name: "709sec." },
	{ id: "a008", name: "Stack Bros." },
	{ id: "a009", name: "D.watt" },
	{ id: "a010", name: "あさな" },
	{ id: "a011", name: "小峠舞" },
	{ id: "a012", name: "IZNA" },
	{ id: "a013", name: "山本椛" },
	{ id: "a014", name: "Vivienne" },
	{ id: "a015", name: "めらみぽっぷ" },
];

/** イベントシリーズのモックデータ */
export interface MockEventSeries {
	id: string;
	name: string;
}

export interface MockEvent {
	id: string;
	name: string;
	seriesId: string;
	seriesName: string;
	date?: string;
}

export const mockEventSeries: MockEventSeries[] = [
	{ id: "es001", name: "コミックマーケット" },
	{ id: "es002", name: "博麗神社例大祭" },
	{ id: "es003", name: "東方紅楼夢" },
	{ id: "es004", name: "M3" },
];

export const mockEvents: MockEvent[] = [
	// コミックマーケット
	{
		id: "e001",
		name: "C103",
		seriesId: "es001",
		seriesName: "コミックマーケット",
		date: "2023-12",
	},
	{
		id: "e002",
		name: "C102",
		seriesId: "es001",
		seriesName: "コミックマーケット",
		date: "2023-08",
	},
	{
		id: "e003",
		name: "C101",
		seriesId: "es001",
		seriesName: "コミックマーケット",
		date: "2022-12",
	},
	{
		id: "e004",
		name: "C100",
		seriesId: "es001",
		seriesName: "コミックマーケット",
		date: "2022-08",
	},
	{
		id: "e005",
		name: "C99",
		seriesId: "es001",
		seriesName: "コミックマーケット",
		date: "2021-12",
	},
	// 博麗神社例大祭
	{
		id: "e010",
		name: "例大祭20",
		seriesId: "es002",
		seriesName: "博麗神社例大祭",
		date: "2023-05",
	},
	{
		id: "e011",
		name: "例大祭19",
		seriesId: "es002",
		seriesName: "博麗神社例大祭",
		date: "2022-05",
	},
	// 東方紅楼夢
	{
		id: "e020",
		name: "紅楼夢19",
		seriesId: "es003",
		seriesName: "東方紅楼夢",
		date: "2023-10",
	},
	{
		id: "e021",
		name: "紅楼夢18",
		seriesId: "es003",
		seriesName: "東方紅楼夢",
		date: "2022-10",
	},
	// M3
	{
		id: "e030",
		name: "M3-2023秋",
		seriesId: "es004",
		seriesName: "M3",
		date: "2023-10",
	},
	{
		id: "e031",
		name: "M3-2023春",
		seriesId: "es004",
		seriesName: "M3",
		date: "2023-04",
	},
];

/** 検索構文のヘルプ情報 */
export interface SearchSyntaxItem {
	keyword: string;
	description: string;
	example: string;
}

export const searchSyntaxHelp: SearchSyntaxItem[] = [
	{
		keyword: "arranger:",
		description: "編曲者で検索",
		example: "arranger:ARM",
	},
	{
		keyword: "vocalist:",
		description: "ボーカルで検索",
		example: "vocalist:miko",
	},
	{
		keyword: "lyricist:",
		description: "作詞者で検索",
		example: "lyricist:夕野ヨシミ",
	},
	{
		keyword: "circle:",
		description: "サークル名で検索",
		example: "circle:IOSYS",
	},
	{
		keyword: "originalsong:",
		description: "原曲名で検索",
		example: "originalsong:大吉キトゥン",
	},
	{
		keyword: "year:",
		description: "リリース年で検索",
		example: "year:2023",
	},
	{
		keyword: "songcount:",
		description: "原曲数で検索",
		example: "songcount:2",
	},
	{
		keyword: "songcount:>=",
		description: "原曲数（以上）で検索",
		example: "songcount:>=3",
	},
];

/** 検索結果のモックデータ */
export interface MockSearchResult {
	id: string;
	type: "artist" | "circle" | "track";
	title: string;
	subtitle: string;
}

export const mockSearchResults: MockSearchResult[] = [
	// Circles
	{
		id: "c001",
		type: "circle",
		title: "IOSYS",
		subtitle: "東方アレンジサークル",
	},
	{
		id: "c002",
		type: "circle",
		title: "幽閉サテライト",
		subtitle: "東方ボーカルアレンジ",
	},
	{
		id: "c003",
		type: "circle",
		title: "SOUND HOLIC",
		subtitle: "ユーロビート、トランス系アレンジ",
	},
	// Artists
	{ id: "a001", type: "artist", title: "miko", subtitle: "IOSYS所属ボーカル" },
	{
		id: "a002",
		type: "artist",
		title: "ARM",
		subtitle: "IOSYS代表・アレンジャー",
	},
	{
		id: "a003",
		type: "artist",
		title: "夕野ヨシミ",
		subtitle: "作詞家・シンガー",
	},
	{
		id: "a004",
		type: "artist",
		title: "senya",
		subtitle: "幽閉サテライト所属",
	},
	// Tracks
	{
		id: "t001",
		type: "track",
		title: "チルノのパーフェクトさんすう教室",
		subtitle: "IOSYS - U.N.オーエンは彼女なのか？",
	},
	{
		id: "t002",
		type: "track",
		title: "Bad Apple!! feat. nomico",
		subtitle: "Alstroemeria Records - Bad Apple!!",
	},
	{
		id: "t003",
		type: "track",
		title: "ナイト・オブ・ナイツ",
		subtitle: "COOL&CREATE - 月時計 〜 ルナ・ダイアル",
	},
	{
		id: "t004",
		type: "track",
		title: "魔理沙は大変なものを盗んでいきました",
		subtitle: "IOSYS - 人形裁判 〜 人の形弄びし少女",
	},
	{
		id: "t005",
		type: "track",
		title: "色は匂へど散りぬるを",
		subtitle: "幽閉サテライト - 亡き王女の為のセプテット",
	},
];

/** 人気の検索キーワード */
export const popularSearches = [
	"Bad Apple!!",
	"IOSYS",
	"ナイト・オブ・ナイツ",
	"ZUN",
	"幽閉サテライト",
];
