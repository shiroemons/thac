/**
 * 公式作品（原作）・公式楽曲（原曲）関連の型定義
 * DBスキーマ（packages/db/src/data/*.tsv）に準拠
 */

// 作品カテゴリコード（全7種）
export type ProductType =
	| "pc98"
	| "windows"
	| "zuns_music_collection"
	| "akyus_untouched_score"
	| "commercial_books"
	| "tasofro"
	| "other";

// 作品カテゴリ情報
export interface ProductTypeInfo {
	code: ProductType;
	name: string;
	description: string;
	sortOrder: number;
}

// 公式作品
export interface OfficialWork {
	id: string; // "0201"
	name: string; // "東方紅魔郷　～ the Embodiment of Scarlet Devil."
	shortName: string; // "東方紅魔郷"
	productType: ProductType;
	seriesNumber: number; // 6.0
}

// 公式楽曲
export interface OfficialSong {
	id: string; // "02010001"
	productId: string; // "0201"
	trackNumber: number;
	name: string; // "赤より紅い夢"
	composer: string; // "ZUN"
	arranger: string | null;
	isOriginal: boolean;
}

// UI用: 作品情報付き楽曲
export interface OfficialSongWithWork extends OfficialSong {
	work: OfficialWork;
	arrangeCount: number; // モック値（将来はAPI経由で取得）
}

// UI用: 統計付き作品
export interface OfficialWorkWithStats extends OfficialWork {
	songCount: number;
	totalArrangeCount: number;
}

// アレンジトラック（原曲詳細ページ用）
export interface ArrangeTrack {
	trackId: string;
	trackName: string;
	release: {
		id: string;
		name: string;
		releaseDate: string | null;
	};
	circles: Array<{
		id: string;
		name: string;
	}>;
	artists: Array<{
		id: string;
		creditName: string;
		roles: string[];
	}>;
}
