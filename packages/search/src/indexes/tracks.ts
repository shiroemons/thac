import type { IndexConfig } from "../types";

export const TRACKS_INDEX_NAME = "tracks";

export const tracksIndexConfig: IndexConfig = {
	name: TRACKS_INDEX_NAME,
	primaryKey: "id",
	searchableAttributes: [
		// 基本情報
		"name",
		// リリース情報
		"releaseName",
		// 検索用名前配列
		"circleNames",
		"vocalistNames",
		"arrangerNames",
		"lyricistNames",
		"composerNames",
		"remixerNames",
		"originalSongNames",
		"originalWorkNames",
		// ジャンル・タグ名
		"genreNames",
		"tagNames",
		// 階層検索（originalSongs内）
		"originalSongs.lvl0",
		"originalSongs.lvl1",
		"originalSongs.lvl2",
	],
	filterableAttributes: [
		// ID
		"releaseId",
		"eventId",
		"eventName",
		// 年・日付
		"releaseYear",
		"releaseDate",
		"releaseType",
		// 名前配列
		"circleNames",
		"vocalistNames",
		"arrangerNames",
		"lyricistNames",
		"composerNames",
		"originalSongNames",
		"originalWorkNames",
		// ジャンル・タグ
		"genreCodes",
		"genreNames",
		"tagNames",
		// 階層検索（originalSongs内）
		"originalSongs.lvl0",
		"originalSongs.lvl1",
		"originalSongs.lvl2",
		// フラグ
		"isTouhouArrange",
		// カウント
		"vocalistCount",
		"arrangerCount",
		"lyricistCount",
		"composerCount",
		"remixerCount",
		"circleCount",
		"originalSongCount",
		"genreCount",
		"tagCount",
	],
	sortableAttributes: [
		"releaseDate",
		"releaseYear",
		"trackNumber",
		"name",
		"createdAt",
		// カウント
		"vocalistCount",
		"arrangerCount",
		"lyricistCount",
		"composerCount",
		"remixerCount",
		"circleCount",
		"originalSongCount",
		"genreCount",
		"tagCount",
	],
	// NOTE: locales: ["jpn"] により検索は大文字小文字を区別しない（case-insensitive）
	// これは日本語検索の精度向上のための意図的な設定
	// 完全一致検索が必要な場合は将来的な検討が必要
	locales: ["jpn"],
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8,
		},
	},
};
