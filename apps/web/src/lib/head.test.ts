/**
 * head.ts のユニットテスト
 *
 * ページヘッド生成関数が正しいタイトル、説明文、OGタグ、Twitterタグを返すことを検証する。
 */
import { describe, expect, test } from "bun:test";
import {
	APP_NAME,
	createArtistAliasDetailHead,
	createArtistDetailHead,
	createCircleDetailHead,
	createEventDetailHead,
	createEventSeriesDetailHead,
	createMasterDetailHead,
	createPageHead,
	createPublicArtistHead,
	createPublicCircleHead,
	createPublicEventHead,
	createPublicOfficialWorkHead,
	createPublicOriginalSongHead,
	createPublicReleaseHead,
	createPublicTrackHead,
	createReleaseDetailHead,
	createTrackDetailHead,
} from "./head";
import type {
	PublicArtistDetail,
	PublicCircleDetail,
	PublicEventDetail,
	PublicReleaseDetail,
	PublicSongDetail,
	PublicTrackDetail,
	PublicWorkDetail,
} from "./public-api";

// =============================================================================
// モックデータ
// =============================================================================

const mockArtist: PublicArtistDetail = {
	id: "artist-1",
	name: "テストアーティスト",
	artistId: "artist-1",
	artistName: "テストアーティスト",
	isMainName: true,
	aliasTypeCode: null,
	roles: [
		{ roleCode: "arrange", label: "編曲" },
		{ roleCode: "vocal", label: "Vo" },
	],
	stats: { trackCount: 100, releaseCount: 20 },
	otherAliases: [],
};

const mockArtistManyRoles: PublicArtistDetail = {
	id: "artist-2",
	name: "多役アーティスト",
	artistId: "artist-2",
	artistName: "多役アーティスト",
	isMainName: true,
	aliasTypeCode: null,
	roles: [
		{ roleCode: "arrange", label: "編曲" },
		{ roleCode: "vocal", label: "Vo" },
		{ roleCode: "lyric", label: "作詞" },
		{ roleCode: "compose", label: "作曲" },
	],
	stats: { trackCount: 50, releaseCount: 10 },
	otherAliases: [],
};

const mockArtistNoRoles: PublicArtistDetail = {
	id: "artist-3",
	name: "ノーロールアーティスト",
	artistId: "artist-3",
	artistName: "ノーロールアーティスト",
	isMainName: true,
	aliasTypeCode: null,
	roles: [],
	stats: { trackCount: 5, releaseCount: 1 },
	otherAliases: [],
};

const mockCircle: PublicCircleDetail = {
	id: "circle-1",
	name: "テストサークル",
	nameJa: null,
	nameEn: null,
	sortName: null,
	nameInitial: "テ",
	initialScript: "hiragana",
	notes: "東方アレンジサークル",
	links: [],
	stats: { releaseCount: 50, trackCount: 300 },
};

const mockCircleNoNotes: PublicCircleDetail = {
	id: "circle-2",
	name: "ノートなしサークル",
	nameJa: null,
	nameEn: null,
	sortName: null,
	nameInitial: "ノ",
	initialScript: "hiragana",
	notes: null,
	links: [],
	stats: { releaseCount: 10, trackCount: 50 },
};

const mockCircleLongNotes: PublicCircleDetail = {
	id: "circle-3",
	name: "長文ノートサークル",
	nameJa: null,
	nameEn: null,
	sortName: null,
	nameInitial: "チ",
	initialScript: "hiragana",
	notes:
		"これは非常に長い説明文です。80文字を超える説明文はトランケートされるべきです。これは追加のテキストで、80文字を超えるようにしています。さらに追加のテキストを入れて確実に80文字を超えます。",
	links: [],
	stats: { releaseCount: 5, trackCount: 20 },
};

const mockRelease: PublicReleaseDetail = {
	id: "release-1",
	name: "テストアルバム",
	nameJa: null,
	nameEn: null,
	releaseDate: "2024-08-12",
	releaseYear: 2024,
	releaseMonth: 8,
	releaseDay: 12,
	releaseType: "album",
	notes: null,
	event: { id: "event-1", name: "コミックマーケット100" },
	circles: [],
	discs: [],
	tracks: [],
	trackCount: 10,
	artistCount: 5,
	publications: [],
};

const mockReleaseNoEvent: PublicReleaseDetail = {
	id: "release-2",
	name: "イベントなしアルバム",
	nameJa: null,
	nameEn: null,
	releaseDate: "2024-05-01",
	releaseYear: 2024,
	releaseMonth: 5,
	releaseDay: 1,
	releaseType: "album",
	notes: null,
	event: null,
	circles: [],
	discs: [],
	tracks: [],
	trackCount: 8,
	artistCount: 1,
	publications: [],
};

const mockEvent: PublicEventDetail = {
	id: "event-1",
	name: "コミックマーケット100",
	eventSeriesId: "series-1",
	eventSeriesName: "コミックマーケット",
	edition: 100,
	startDate: "2024-08-12",
	endDate: "2024-08-13",
	totalDays: 2,
	venue: "東京ビッグサイト",
	eventDays: [],
	stats: { releaseCount: 500, circleCount: 200, trackCount: 5000 },
};

const mockEventSingleDay: PublicEventDetail = {
	id: "event-2",
	name: "例大祭21",
	eventSeriesId: "series-2",
	eventSeriesName: "博麗神社例大祭",
	edition: 21,
	startDate: "2024-05-03",
	endDate: "2024-05-03",
	totalDays: 1,
	venue: "東京ビッグサイト",
	eventDays: [],
	stats: { releaseCount: 300, circleCount: 150, trackCount: 3000 },
};

const mockEventNoVenue: PublicEventDetail = {
	id: "event-3",
	name: "オンラインイベント",
	eventSeriesId: null,
	eventSeriesName: null,
	edition: null,
	startDate: "2024-06-01",
	endDate: null,
	totalDays: null,
	venue: null,
	eventDays: [],
	stats: { releaseCount: 50, circleCount: 30, trackCount: 500 },
};

const mockSong: PublicSongDetail = {
	id: "song-1",
	officialWorkId: "work-1",
	trackNumber: 1,
	name: "Test Song",
	nameJa: "テスト曲",
	nameEn: "Test Song",
	composerName: "ZUN",
	arrangerName: null,
	isOriginal: true,
	sourceSongId: null,
	sourceSongName: null,
	notes: null,
	work: {
		id: "work-1",
		name: "東方紅魔郷",
		shortNameJa: "紅魔郷",
		categoryCode: "windows",
		categoryName: "Windows作品",
	},
	links: [],
	arrangeCount: 1500,
	circleCount: 300,
	artistCount: 500,
	prevSong: { id: null, name: null },
	nextSong: { id: null, name: null },
};

const mockSongNoWork: PublicSongDetail = {
	id: "song-2",
	officialWorkId: null,
	trackNumber: null,
	name: "Unknown Song",
	nameJa: "不明な曲",
	nameEn: "Unknown Song",
	composerName: null,
	arrangerName: null,
	isOriginal: false,
	sourceSongId: null,
	sourceSongName: null,
	notes: null,
	work: null,
	links: [],
	arrangeCount: 10,
	circleCount: 5,
	artistCount: 8,
	prevSong: { id: null, name: null },
	nextSong: { id: null, name: null },
};

const mockWork: PublicWorkDetail = {
	id: "work-1",
	categoryCode: "windows",
	categoryName: "Windows作品",
	name: "Touhou Koumakyou",
	nameJa: "東方紅魔郷",
	nameEn: "Touhou Koumakyou",
	shortNameJa: "紅魔郷",
	shortNameEn: null,
	numberInSeries: 6,
	releaseDate: "2002-08-11",
	officialOrganization: "上海アリス幻樂団",
	notes: null,
	links: [],
	songCount: 20,
	totalArrangeCount: 15000,
	songs: [],
};

const mockWorkNoCategory: PublicWorkDetail = {
	id: "work-2",
	categoryCode: "other",
	categoryName: null,
	name: "Other Work",
	nameJa: "その他の作品",
	nameEn: "Other Work",
	shortNameJa: null,
	shortNameEn: null,
	numberInSeries: null,
	releaseDate: null,
	officialOrganization: null,
	notes: null,
	links: [],
	songCount: 5,
	totalArrangeCount: 100,
	songs: [],
};

const mockTrack: PublicTrackDetail = {
	id: "track-1",
	name: "テストトラック",
	nameJa: null,
	nameEn: null,
	trackNumber: 1,
	credits: [
		{
			artistId: "a1",
			creditName: "Artist1",
			roles: [{ roleCode: "arrange", roleName: "編曲" }],
		},
		{
			artistId: "a2",
			creditName: "Artist2",
			roles: [{ roleCode: "vocal", roleName: "Vo" }],
		},
		{
			artistId: "a3",
			creditName: "Artist3",
			roles: [{ roleCode: "lyric", roleName: "作詞" }],
		},
	],
	officialSongs: [],
	release: {
		id: "r1",
		name: "テストアルバム",
		releaseDate: "2024-08-12",
		releaseType: "album",
	},
	disc: null,
	event: null,
	parentTracks: [],
	siblingTracks: { prev: null, next: null },
	publications: [],
};

const mockTrackNoRelease: PublicTrackDetail = {
	id: "track-2",
	name: "リリースなしトラック",
	nameJa: null,
	nameEn: null,
	trackNumber: 1,
	credits: [],
	officialSongs: [],
	release: null,
	disc: null,
	event: null,
	parentTracks: [],
	siblingTracks: { prev: null, next: null },
	publications: [],
};

const mockTrackSingleCredit: PublicTrackDetail = {
	id: "track-3",
	name: "シングルクレジットトラック",
	nameJa: null,
	nameEn: null,
	trackNumber: 1,
	credits: [
		{
			artistId: "a1",
			creditName: "Artist1",
			roles: [
				{ roleCode: "arrange", roleName: "編曲" },
				{ roleCode: "vocal", roleName: "Vo" },
			],
		},
	],
	officialSongs: [],
	release: {
		id: "r1",
		name: "テストアルバム",
		releaseDate: "2024-08-12",
		releaseType: "album",
	},
	disc: null,
	event: null,
	parentTracks: [],
	siblingTracks: { prev: null, next: null },
	publications: [],
};

// =============================================================================
// ヘルパー関数
// =============================================================================

function findMetaByTitle(meta: Array<{ title?: string }>) {
	return meta.find((m) => m.title)?.title;
}

function findMetaByName(
	meta: Array<{ name?: string; content?: string }>,
	name: string,
) {
	return meta.find((m) => m.name === name)?.content;
}

function findMetaByProperty(
	meta: Array<{ property?: string; content?: string }>,
	property: string,
) {
	return meta.find((m) => m.property === property)?.content;
}

// =============================================================================
// テスト
// =============================================================================

describe("head.ts", () => {
	describe("APP_NAME", () => {
		test("APP_NAME is 東方編曲録", () => {
			expect(APP_NAME).toBe("東方編曲録");
		});
	});

	describe("createPageHead", () => {
		test("returns title with APP_NAME when pageTitle provided", () => {
			const result = createPageHead("テストページ");
			expect(result.meta[0].title).toBe("テストページ | 東方編曲録");
		});

		test("returns APP_NAME only when no pageTitle", () => {
			const result = createPageHead();
			expect(result.meta[0].title).toBe("東方編曲録");
		});

		test("returns APP_NAME only when pageTitle is empty string", () => {
			const result = createPageHead("");
			expect(result.meta[0].title).toBe("東方編曲録");
		});
	});

	// =========================================================================
	// 管理画面用ページヘッド
	// =========================================================================

	describe("createTrackDetailHead", () => {
		test("returns correct title with track and release name", () => {
			const result = createTrackDetailHead("テスト曲", "テストアルバム");
			expect(result.meta[0].title).toBe(
				"トラック詳細：テスト曲 - テストアルバム | 東方編曲録",
			);
		});

		test("returns loading state when trackName is undefined", () => {
			const result = createTrackDetailHead(undefined, "テストアルバム");
			expect(result.meta[0].title).toBe(
				"トラック詳細：読み込み中 | 東方編曲録",
			);
		});

		test("returns loading state when releaseName is undefined", () => {
			const result = createTrackDetailHead("テスト曲", undefined);
			expect(result.meta[0].title).toBe(
				"トラック詳細：読み込み中 | 東方編曲録",
			);
		});

		test("returns loading state when both are undefined", () => {
			const result = createTrackDetailHead(undefined, undefined);
			expect(result.meta[0].title).toBe(
				"トラック詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createReleaseDetailHead", () => {
		test("returns correct title with release name", () => {
			const result = createReleaseDetailHead("テストアルバム");
			expect(result.meta[0].title).toBe(
				"作品詳細：テストアルバム | 東方編曲録",
			);
		});

		test("returns loading state when releaseName is undefined", () => {
			const result = createReleaseDetailHead(undefined);
			expect(result.meta[0].title).toBe("作品詳細：読み込み中 | 東方編曲録");
		});
	});

	describe("createArtistDetailHead", () => {
		test("returns correct title with artist name", () => {
			const result = createArtistDetailHead("テストアーティスト");
			expect(result.meta[0].title).toBe(
				"アーティスト詳細：テストアーティスト | 東方編曲録",
			);
		});

		test("returns loading state when artistName is undefined", () => {
			const result = createArtistDetailHead(undefined);
			expect(result.meta[0].title).toBe(
				"アーティスト詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createCircleDetailHead", () => {
		test("returns correct title with circle name", () => {
			const result = createCircleDetailHead("テストサークル");
			expect(result.meta[0].title).toBe(
				"サークル詳細：テストサークル | 東方編曲録",
			);
		});

		test("returns loading state when circleName is undefined", () => {
			const result = createCircleDetailHead(undefined);
			expect(result.meta[0].title).toBe(
				"サークル詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createEventDetailHead", () => {
		test("returns correct title with event name", () => {
			const result = createEventDetailHead("コミックマーケット100");
			expect(result.meta[0].title).toBe(
				"イベント詳細：コミックマーケット100 | 東方編曲録",
			);
		});

		test("returns loading state when eventName is undefined", () => {
			const result = createEventDetailHead(undefined);
			expect(result.meta[0].title).toBe(
				"イベント詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createEventSeriesDetailHead", () => {
		test("returns correct title with series name", () => {
			const result = createEventSeriesDetailHead("コミックマーケット");
			expect(result.meta[0].title).toBe(
				"イベントシリーズ詳細：コミックマーケット | 東方編曲録",
			);
		});

		test("returns loading state when seriesName is undefined", () => {
			const result = createEventSeriesDetailHead(undefined);
			expect(result.meta[0].title).toBe(
				"イベントシリーズ詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createMasterDetailHead", () => {
		test("returns correct title with master type and item name", () => {
			const result = createMasterDetailHead("プラットフォーム", "Spotify");
			expect(result.meta[0].title).toBe(
				"プラットフォーム詳細：Spotify | 東方編曲録",
			);
		});

		test("returns loading state when itemName is undefined", () => {
			const result = createMasterDetailHead("プラットフォーム", undefined);
			expect(result.meta[0].title).toBe(
				"プラットフォーム詳細：読み込み中 | 東方編曲録",
			);
		});
	});

	describe("createArtistAliasDetailHead", () => {
		test("returns correct title with alias name", () => {
			const result = createArtistAliasDetailHead("別名義");
			expect(result.meta[0].title).toBe("名義詳細：別名義 | 東方編曲録");
		});

		test("returns loading state when aliasName is undefined", () => {
			const result = createArtistAliasDetailHead(undefined);
			expect(result.meta[0].title).toBe("名義詳細：読み込み中 | 東方編曲録");
		});
	});

	// =========================================================================
	// 公開ページ用（OpenGraph対応）
	// =========================================================================

	describe("createPublicArtistHead", () => {
		test("returns loading state when artist is null", () => {
			const result = createPublicArtistHead(null);
			expect(result.meta[0].title).toBe(
				"アーティスト：読み込み中 | 東方編曲録",
			);
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when artist is undefined", () => {
			const result = createPublicArtistHead(undefined);
			expect(result.meta[0].title).toBe(
				"アーティスト：読み込み中 | 東方編曲録",
			);
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when artist provided", () => {
			const result = createPublicArtistHead(mockArtist);

			// Check title
			expect(findMetaByTitle(result.meta)).toBe(
				"アーティスト：テストアーティスト | 東方編曲録",
			);

			// Check description
			expect(findMetaByName(result.meta, "description")).toBe(
				"編曲・Vo | 100曲参加 | 20作品に参加",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"アーティスト：テストアーティスト | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:description")).toBe(
				"編曲・Vo | 100曲参加 | 20作品に参加",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("profile");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
			expect(findMetaByName(result.meta, "twitter:title")).toBe(
				"アーティスト：テストアーティスト | 東方編曲録",
			);
			expect(findMetaByName(result.meta, "twitter:description")).toBe(
				"編曲・Vo | 100曲参加 | 20作品に参加",
			);
		});

		test("truncates roles to 3 in description", () => {
			const result = createPublicArtistHead(mockArtistManyRoles);

			// Should only show first 3 roles
			expect(findMetaByName(result.meta, "description")).toBe(
				"編曲・Vo・作詞 | 50曲参加 | 10作品に参加",
			);
		});

		test("handles artist with no roles", () => {
			const result = createPublicArtistHead(mockArtistNoRoles);

			expect(findMetaByName(result.meta, "description")).toBe(
				"5曲参加 | 1作品に参加",
			);
		});
	});

	describe("createPublicCircleHead", () => {
		test("returns loading state when circle is null", () => {
			const result = createPublicCircleHead(null);
			expect(result.meta[0].title).toBe("サークル：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when circle is undefined", () => {
			const result = createPublicCircleHead(undefined);
			expect(result.meta[0].title).toBe("サークル：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when circle provided", () => {
			const result = createPublicCircleHead(mockCircle);

			// Check title
			expect(findMetaByTitle(result.meta)).toBe(
				"サークル：テストサークル | 東方編曲録",
			);

			// Check description (with notes)
			expect(findMetaByName(result.meta, "description")).toBe(
				"東方アレンジサークル | 50作品 | 300曲",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"サークル：テストサークル | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("profile");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles circle with no notes", () => {
			const result = createPublicCircleHead(mockCircleNoNotes);

			expect(findMetaByName(result.meta, "description")).toBe("10作品 | 50曲");
		});

		test("truncates long notes to 80 characters", () => {
			const result = createPublicCircleHead(mockCircleLongNotes);
			const description = findMetaByName(result.meta, "description");

			// Should be truncated with "..."
			expect(description).toContain("...");
			// Notes part should be max 83 characters (80 + "...")
			const notesPart = description?.split(" | ")[0];
			expect(notesPart?.length).toBeLessThanOrEqual(83);
		});
	});

	describe("createPublicEventHead", () => {
		test("returns loading state when event is null", () => {
			const result = createPublicEventHead(null);
			expect(result.meta[0].title).toBe("イベント：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when event is undefined", () => {
			const result = createPublicEventHead(undefined);
			expect(result.meta[0].title).toBe("イベント：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when event provided", () => {
			const result = createPublicEventHead(mockEvent);

			// Check title
			expect(findMetaByTitle(result.meta)).toBe(
				"イベント：コミックマーケット100 | 東方編曲録",
			);

			// Check description (multi-day event)
			expect(findMetaByName(result.meta, "description")).toBe(
				"2024-08-12 〜 2024-08-13 | 東京ビッグサイト | 500作品 | 200サークル",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"イベント：コミックマーケット100 | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("website");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles single day event", () => {
			const result = createPublicEventHead(mockEventSingleDay);

			// Should only show one date (not range)
			expect(findMetaByName(result.meta, "description")).toBe(
				"2024-05-03 | 東京ビッグサイト | 300作品 | 150サークル",
			);
		});

		test("handles event with no venue", () => {
			const result = createPublicEventHead(mockEventNoVenue);

			expect(findMetaByName(result.meta, "description")).toBe(
				"2024-06-01 | 50作品 | 30サークル",
			);
		});
	});

	describe("createPublicOfficialWorkHead", () => {
		test("returns loading state when work is null", () => {
			const result = createPublicOfficialWorkHead(null);
			expect(result.meta[0].title).toBe("原作：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when work is undefined", () => {
			const result = createPublicOfficialWorkHead(undefined);
			expect(result.meta[0].title).toBe("原作：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when work provided", () => {
			const result = createPublicOfficialWorkHead(mockWork);

			// Check title (uses nameJa)
			expect(findMetaByTitle(result.meta)).toBe(
				"原作：東方紅魔郷 | 東方編曲録",
			);

			// Check description
			expect(findMetaByName(result.meta, "description")).toBe(
				"Windows作品 | 20曲収録 | 15000アレンジ",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"原作：東方紅魔郷 | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("website");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles work with no category name", () => {
			const result = createPublicOfficialWorkHead(mockWorkNoCategory);

			expect(findMetaByName(result.meta, "description")).toBe(
				"5曲収録 | 100アレンジ",
			);
		});
	});

	describe("createPublicOriginalSongHead", () => {
		test("returns loading state when song is null", () => {
			const result = createPublicOriginalSongHead(null);
			expect(result.meta[0].title).toBe("原曲：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when song is undefined", () => {
			const result = createPublicOriginalSongHead(undefined);
			expect(result.meta[0].title).toBe("原曲：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when song provided", () => {
			const result = createPublicOriginalSongHead(mockSong);

			// Check title (uses nameJa)
			expect(findMetaByTitle(result.meta)).toBe("原曲：テスト曲 | 東方編曲録");

			// Check description (includes work with category)
			expect(findMetaByName(result.meta, "description")).toBe(
				"東方紅魔郷（Windows作品） | 1500アレンジ",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"原曲：テスト曲 | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("website");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles song with no work", () => {
			const result = createPublicOriginalSongHead(mockSongNoWork);

			expect(findMetaByName(result.meta, "description")).toBe("10アレンジ");
		});
	});

	describe("createPublicReleaseHead", () => {
		test("returns loading state when release is null", () => {
			const result = createPublicReleaseHead(null);
			expect(result.meta[0].title).toBe("作品：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when release is undefined", () => {
			const result = createPublicReleaseHead(undefined);
			expect(result.meta[0].title).toBe("作品：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when release provided", () => {
			const result = createPublicReleaseHead(mockRelease);

			// Check title
			expect(findMetaByTitle(result.meta)).toBe(
				"作品：テストアルバム | 東方編曲録",
			);

			// Check description
			expect(findMetaByName(result.meta, "description")).toBe(
				"コミックマーケット100 | 2024-08-12 | 10曲収録 | 5名参加",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"作品：テストアルバム | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("website");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles release with no event", () => {
			const result = createPublicReleaseHead(mockReleaseNoEvent);

			// Should not include event name, and not include artist count if only 1
			expect(findMetaByName(result.meta, "description")).toBe(
				"2024-05-01 | 8曲収録",
			);
		});
	});

	describe("createPublicTrackHead", () => {
		test("returns loading state when track is null", () => {
			const result = createPublicTrackHead(null);
			expect(result.meta[0].title).toBe("トラック：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns loading state when track is undefined", () => {
			const result = createPublicTrackHead(undefined);
			expect(result.meta[0].title).toBe("トラック：読み込み中 | 東方編曲録");
			expect(result.meta.length).toBe(1);
		});

		test("returns full meta with OG tags when track provided", () => {
			const result = createPublicTrackHead(mockTrack);

			// Check title (includes release name)
			expect(findMetaByTitle(result.meta)).toBe(
				"トラック：テストトラック - テストアルバム | 東方編曲録",
			);

			// Check description (includes release name, date, and top 2 credits)
			expect(findMetaByName(result.meta, "description")).toBe(
				"テストアルバム | 2024-08-12 | Artist1（編曲）, Artist2（Vo） | 他1名",
			);

			// Check OG tags
			expect(findMetaByProperty(result.meta, "og:title")).toBe(
				"トラック：テストトラック - テストアルバム | 東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:type")).toBe("website");
			expect(findMetaByProperty(result.meta, "og:site_name")).toBe(
				"東方編曲録",
			);
			expect(findMetaByProperty(result.meta, "og:locale")).toBe("ja_JP");

			// Check Twitter tags
			expect(findMetaByName(result.meta, "twitter:card")).toBe("summary");
		});

		test("handles track with no release", () => {
			const result = createPublicTrackHead(mockTrackNoRelease);

			// Title should only have track name
			expect(findMetaByTitle(result.meta)).toBe(
				"トラック：リリースなしトラック | 東方編曲録",
			);

			// Description should be empty (no release, no credits)
			expect(findMetaByName(result.meta, "description")).toBe("");
		});

		test("handles track with single credit", () => {
			const result = createPublicTrackHead(mockTrackSingleCredit);

			// Should not show "他N名" when exactly matching credits shown
			expect(findMetaByName(result.meta, "description")).toBe(
				"テストアルバム | 2024-08-12 | Artist1（編曲/Vo）",
			);
		});
	});
});
