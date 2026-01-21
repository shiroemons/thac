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
		// 階層検索（originalSongs内）
		"originalSongs.lvl0",
		"originalSongs.lvl1",
		"originalSongs.lvl2",
	],
	filterableAttributes: [
		// ID
		"releaseId",
		"eventId",
		// 年・日付
		"releaseYear",
		"releaseDate",
		"releaseType",
		// 名前配列
		"circleNames",
		"originalWorkNames",
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
	],
	locales: ["jpn"],
	typoTolerance: {
		minWordSizeForTypos: {
			oneTypo: 4,
			twoTypos: 8,
		},
	},
};
