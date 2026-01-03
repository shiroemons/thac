/**
 * 公式作品・公式楽曲のモックデータ
 * データソース: packages/db/src/data/official_works.tsv, official_songs.tsv
 */

import type {
	ArrangeTrack,
	OfficialSong,
	OfficialSongWithWork,
	OfficialWork,
	OfficialWorkWithStats,
	ProductType,
	ProductTypeInfo,
} from "@/types/official";

// ============================================
// カテゴリマスタ（全7種）
// ============================================
export const productTypes: ProductTypeInfo[] = [
	{
		code: "pc98",
		name: "PC-98作品",
		description: "PC-98シリーズで発売された作品",
		sortOrder: 1,
	},
	{
		code: "windows",
		name: "Windows作品",
		description: "Windows向けに発売された作品",
		sortOrder: 2,
	},
	{
		code: "zuns_music_collection",
		name: "ZUN's Music Collection",
		description: "ZUNの音楽CD作品集",
		sortOrder: 3,
	},
	{
		code: "akyus_untouched_score",
		name: "幺樂団の歴史",
		description: "東方旧作のサウンドトラック",
		sortOrder: 4,
	},
	{
		code: "commercial_books",
		name: "商業書籍",
		description: "書籍として発売された作品",
		sortOrder: 5,
	},
	{
		code: "tasofro",
		name: "黄昏フロンティア作品",
		description: "黄昏フロンティアとの共同制作作品",
		sortOrder: 6,
	},
	{
		code: "other",
		name: "その他",
		description: "その他の公式作品",
		sortOrder: 7,
	},
];

// ============================================
// 公式作品モックデータ
// ============================================
export const mockOfficialWorks: OfficialWork[] = [
	// PC-98作品
	{
		id: "0101",
		name: "東方靈異伝　～ Highly Responsive to Prayers.",
		shortName: "東方靈異伝",
		productType: "pc98",
		seriesNumber: 1.0,
	},
	{
		id: "0102",
		name: "東方封魔録　～ the Story of Eastern Wonderland.",
		shortName: "東方封魔録",
		productType: "pc98",
		seriesNumber: 2.0,
	},
	{
		id: "0103",
		name: "東方夢時空　～ Phantasmagoria of Dim.Dream.",
		shortName: "東方夢時空",
		productType: "pc98",
		seriesNumber: 3.0,
	},
	{
		id: "0104",
		name: "東方幻想郷　～ Lotus Land Story.",
		shortName: "東方幻想郷",
		productType: "pc98",
		seriesNumber: 4.0,
	},
	{
		id: "0105",
		name: "東方怪綺談　～ Mystic Square.",
		shortName: "東方怪綺談",
		productType: "pc98",
		seriesNumber: 5.0,
	},
	// Windows作品
	{
		id: "0201",
		name: "東方紅魔郷　～ the Embodiment of Scarlet Devil.",
		shortName: "東方紅魔郷",
		productType: "windows",
		seriesNumber: 6.0,
	},
	{
		id: "0202",
		name: "東方妖々夢　～ Perfect Cherry Blossom.",
		shortName: "東方妖々夢",
		productType: "windows",
		seriesNumber: 7.0,
	},
	{
		id: "0204",
		name: "東方永夜抄　～ Imperishable Night.",
		shortName: "東方永夜抄",
		productType: "windows",
		seriesNumber: 8.0,
	},
	{
		id: "0207",
		name: "東方風神録　～ Mountain of Faith.",
		shortName: "東方風神録",
		productType: "windows",
		seriesNumber: 10.0,
	},
	{
		id: "0209",
		name: "東方地霊殿　～ Subterranean Animism.",
		shortName: "東方地霊殿",
		productType: "windows",
		seriesNumber: 11.0,
	},
	{
		id: "0223",
		name: "東方鬼形獣　～ Wily Beast and Weakest Creature.",
		shortName: "東方鬼形獣",
		productType: "windows",
		seriesNumber: 17.0,
	},
	{
		id: "0225",
		name: "東方虹龍洞　～ Unconnected Marketeers.",
		shortName: "東方虹龍洞",
		productType: "windows",
		seriesNumber: 18.0,
	},
	{
		id: "0227",
		name: "東方獣王園　～ Unfinished Dream of All Living Ghost.",
		shortName: "東方獣王園",
		productType: "windows",
		seriesNumber: 19.0,
	},
	// ZUN's Music Collection
	{
		id: "0301",
		name: "蓬莱人形 ～ Dolls in Pseudo Paradise.",
		shortName: "蓬莱人形",
		productType: "zuns_music_collection",
		seriesNumber: 1.0,
	},
	{
		id: "0302",
		name: "蓮台野夜行　～ Ghostly Field Club",
		shortName: "蓮台野夜行",
		productType: "zuns_music_collection",
		seriesNumber: 2.0,
	},
	{
		id: "0303",
		name: "夢違科学世紀　～ Changeability of Strange Dream",
		shortName: "夢違科学世紀",
		productType: "zuns_music_collection",
		seriesNumber: 3.0,
	},
	// 幺樂団の歴史
	{
		id: "0401",
		name: "幺樂団の歴史1　～ Akyu's Untouched Score vol.1",
		shortName: "幺樂団の歴史1",
		productType: "akyus_untouched_score",
		seriesNumber: 1.0,
	},
	{
		id: "0402",
		name: "幺樂団の歴史2　～ Akyu's Untouched Score vol.2",
		shortName: "幺樂団の歴史2",
		productType: "akyus_untouched_score",
		seriesNumber: 2.0,
	},
	// 商業書籍
	{
		id: "0501",
		name: "東方香霖堂　～ Curiosities of Lotus Asia.",
		shortName: "東方香霖堂",
		productType: "commercial_books",
		seriesNumber: 1.0,
	},
	{
		id: "0502",
		name: "東方文花帖　～ Bohemian Archive in Japanese Red.",
		shortName: "東方文花帖（書籍）",
		productType: "commercial_books",
		seriesNumber: 2.0,
	},
	// 黄昏フロンティア作品
	{
		id: "0203",
		name: "東方萃夢想　～ Immaterial and Missing Power.",
		shortName: "東方萃夢想",
		productType: "tasofro",
		seriesNumber: 7.5,
	},
	{
		id: "0208",
		name: "東方緋想天　～ Scarlet Weather Rhapsody.",
		shortName: "東方緋想天",
		productType: "tasofro",
		seriesNumber: 10.5,
	},
	{
		id: "0211",
		name: "東方非想天則　～ 超弩級ギニョルの謎を追え",
		shortName: "東方非想天則",
		productType: "tasofro",
		seriesNumber: 12.3,
	},
	// その他
	{
		id: "0700",
		name: "秋霜玉",
		shortName: "秋霜玉",
		productType: "other",
		seriesNumber: 1.0,
	},
	{
		id: "0701",
		name: "稀翁玉",
		shortName: "稀翁玉",
		productType: "other",
		seriesNumber: 2.0,
	},
];

// ============================================
// 公式楽曲モックデータ
// ============================================
export const mockOfficialSongs: OfficialSong[] = [
	// 東方紅魔郷
	{
		id: "02010001",
		productId: "0201",
		trackNumber: 1,
		name: "赤より紅い夢",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010002",
		productId: "0201",
		trackNumber: 2,
		name: "ほおずきみたいに紅い魂",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010003",
		productId: "0201",
		trackNumber: 3,
		name: "妖魔夜行",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010004",
		productId: "0201",
		trackNumber: 4,
		name: "ルーネイトエルフ",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010005",
		productId: "0201",
		trackNumber: 5,
		name: "おてんば恋娘",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010006",
		productId: "0201",
		trackNumber: 6,
		name: "上海紅茶館　～ Chinese Tea",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010007",
		productId: "0201",
		trackNumber: 7,
		name: "明治十七年の上海アリス",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010008",
		productId: "0201",
		trackNumber: 8,
		name: "ヴワル魔法図書館",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010009",
		productId: "0201",
		trackNumber: 9,
		name: "ラクトガール　～ 少女密室",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010010",
		productId: "0201",
		trackNumber: 10,
		name: "メイドと血の懐中時計",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010011",
		productId: "0201",
		trackNumber: 11,
		name: "月時計　～ ルナ・ダイアル",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010012",
		productId: "0201",
		trackNumber: 12,
		name: "ツェペシュの幼き末裔",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010013",
		productId: "0201",
		trackNumber: 13,
		name: "亡き王女の為のセプテット",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010014",
		productId: "0201",
		trackNumber: 14,
		name: "魔法少女達の百年祭",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010015",
		productId: "0201",
		trackNumber: 15,
		name: "U.N.オーエンは彼女なのか？",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010016",
		productId: "0201",
		trackNumber: 16,
		name: "紅より儚い永遠",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02010017",
		productId: "0201",
		trackNumber: 17,
		name: "紅楼　～ Eastern Dream...",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方妖々夢
	{
		id: "02020001",
		productId: "0202",
		trackNumber: 1,
		name: "妖々夢　～ Snow or Cherry Petal",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02020002",
		productId: "0202",
		trackNumber: 2,
		name: "無何有の郷　～ Deep Mountain",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02020013",
		productId: "0202",
		trackNumber: 13,
		name: "幽雅に咲かせ、墨染の桜　～ Border of Life",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02020014",
		productId: "0202",
		trackNumber: 14,
		name: "ボーダーオブライフ",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方永夜抄
	{
		id: "02040016",
		productId: "0204",
		trackNumber: 16,
		name: "竹取飛翔　～ Lunatic Princess",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "02040017",
		productId: "0204",
		trackNumber: 17,
		name: "ヴォヤージュ1969",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方風神録
	{
		id: "02070008",
		productId: "0207",
		trackNumber: 8,
		name: "信仰は儚き人間の為に",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方地霊殿
	{
		id: "02090012",
		productId: "0209",
		trackNumber: 12,
		name: "霊知の太陽信仰　～ Nuclear Fusion",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方靈異伝
	{
		id: "01010001",
		productId: "0101",
		trackNumber: 1,
		name: "A Sacred Lot",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "01010002",
		productId: "0101",
		trackNumber: 2,
		name: "永遠の巫女",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 蓬莱人形
	{
		id: "03010001",
		productId: "0301",
		trackNumber: 1,
		name: "蓬莱伝説",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	{
		id: "03010002",
		productId: "0301",
		trackNumber: 2,
		name: "二色蓮花蝶　～ Red and White",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
	// 東方萃夢想
	{
		id: "02030001",
		productId: "0203",
		trackNumber: 1,
		name: "萃夢想",
		composer: "ZUN",
		arranger: null,
		isOriginal: true,
	},
];

// ============================================
// アレンジ数モック（曲ID → カウント）
// ============================================
export const mockArrangeCounts: Record<string, number> = {
	"02010001": 234, // 赤より紅い夢
	"02010002": 567, // ほおずきみたいに紅い魂
	"02010003": 189, // 妖魔夜行
	"02010004": 456, // ルーネイトエルフ
	"02010005": 678, // おてんば恋娘
	"02010006": 890, // 上海紅茶館
	"02010007": 345, // 明治十七年の上海アリス
	"02010008": 234, // ヴワル魔法図書館
	"02010009": 567, // ラクトガール
	"02010010": 345, // メイドと血の懐中時計
	"02010011": 456, // 月時計
	"02010012": 234, // ツェペシュの幼き末裔
	"02010013": 2345, // 亡き王女の為のセプテット
	"02010014": 345, // 魔法少女達の百年祭
	"02010015": 3456, // U.N.オーエンは彼女なのか？
	"02010016": 234, // 紅より儚い永遠
	"02010017": 345, // 紅楼
	"02020001": 123, // 妖々夢
	"02020002": 234, // 無何有の郷
	"02020013": 1876, // 幽雅に咲かせ、墨染の桜
	"02020014": 987, // ボーダーオブライフ
	"02040016": 1654, // 竹取飛翔
	"02040017": 432, // ヴォヤージュ1969
	"02070008": 1234, // 信仰は儚き人間の為に
	"02090012": 1567, // 霊知の太陽信仰
	"01010001": 89, // A Sacred Lot
	"01010002": 156, // 永遠の巫女
	"03010001": 234, // 蓬莱伝説
	"03010002": 567, // 二色蓮花蝶
	"02030001": 123, // 萃夢想
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * カテゴリで作品をフィルタリング
 */
export function getWorksByProductType(
	type: ProductType | "all",
): OfficialWork[] {
	if (type === "all") {
		return [...mockOfficialWorks].sort(
			(a, b) => a.seriesNumber - b.seriesNumber,
		);
	}
	return mockOfficialWorks
		.filter((w) => w.productType === type)
		.sort((a, b) => a.seriesNumber - b.seriesNumber);
}

/**
 * 作品IDで楽曲を取得
 */
export function getSongsByWorkId(workId: string): OfficialSong[] {
	return mockOfficialSongs
		.filter((s) => s.productId === workId)
		.sort((a, b) => a.trackNumber - b.trackNumber);
}

/**
 * 作品IDで作品を取得
 */
export function getWorkById(workId: string): OfficialWork | undefined {
	return mockOfficialWorks.find((w) => w.id === workId);
}

/**
 * 楽曲IDで楽曲を取得
 */
export function getSongById(songId: string): OfficialSong | undefined {
	return mockOfficialSongs.find((s) => s.id === songId);
}

/**
 * 楽曲IDでアレンジ数を取得
 */
export function getArrangeCount(songId: string): number {
	return mockArrangeCounts[songId] ?? 0;
}

/**
 * 作品の楽曲数を取得
 */
export function getSongCountByWorkId(workId: string): number {
	return mockOfficialSongs.filter((s) => s.productId === workId).length;
}

/**
 * 作品の総アレンジ数を取得
 */
export function getTotalArrangeCountByWorkId(workId: string): number {
	return mockOfficialSongs
		.filter((s) => s.productId === workId)
		.reduce((sum, s) => sum + getArrangeCount(s.id), 0);
}

/**
 * 作品に統計情報を付与
 */
export function getWorkWithStats(work: OfficialWork): OfficialWorkWithStats {
	return {
		...work,
		songCount: getSongCountByWorkId(work.id),
		totalArrangeCount: getTotalArrangeCountByWorkId(work.id),
	};
}

/**
 * 楽曲に作品情報とアレンジ数を付与
 */
export function getSongWithWork(
	song: OfficialSong,
): OfficialSongWithWork | null {
	const work = getWorkById(song.productId);
	if (!work) return null;
	return {
		...song,
		work,
		arrangeCount: getArrangeCount(song.id),
	};
}

/**
 * カテゴリ情報を取得
 */
export function getProductTypeInfo(
	code: ProductType,
): ProductTypeInfo | undefined {
	return productTypes.find((pt) => pt.code === code);
}

/**
 * アレンジトラックのモックデータを取得（原曲詳細用）
 */
export function getMockArrangeTracks(songId: string): ArrangeTrack[] {
	// モックアレンジトラック
	const arrangeCount = getArrangeCount(songId);
	if (arrangeCount === 0) return [];

	// サンプルデータを返す（実際はAPIから取得）
	return [
		{
			trackId: `${songId}-arr-001`,
			trackName: "サンプルアレンジ1",
			release: {
				id: "rel-001",
				name: "サンプルアルバム",
				releaseDate: "2024-08-11",
			},
			circles: [{ id: "cir-001", name: "サンプルサークル" }],
			artists: [
				{
					id: "art-001",
					creditName: "サンプルアーティスト",
					roles: ["arrange"],
				},
			],
		},
		{
			trackId: `${songId}-arr-002`,
			trackName: "サンプルアレンジ2",
			release: {
				id: "rel-002",
				name: "サンプルアルバム2",
				releaseDate: "2024-12-30",
			},
			circles: [{ id: "cir-002", name: "サンプルサークル2" }],
			artists: [
				{
					id: "art-002",
					creditName: "サンプルアーティスト2",
					roles: ["arrange", "vocal"],
				},
			],
		},
	];
}
