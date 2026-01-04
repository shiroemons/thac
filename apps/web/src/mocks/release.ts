/**
 * リリース・トラックのモックデータ
 * データソース: packages/db/src/schema/release.ts, track.ts
 */

import type {
	Disc,
	Release,
	ReleaseCircle,
	ReleaseWithDetails,
	Track,
	TrackCredit,
	TrackDerivation,
	TrackOfficialSong,
	TrackWithCredits,
	TrackWithDetails,
} from "@/types/release";

// ============================================
// モックリリース
// ============================================
export const mockReleases: Release[] = [
	{
		id: "rel-iosys-001",
		name: "東方乙女囃子",
		nameJa: "東方乙女囃子",
		nameEn: "Touhou Otome Bayashi",
		releaseDate: "2006-12-31",
		releaseYear: 2006,
		releaseMonth: 12,
		releaseDay: 31,
		releaseType: "album",
		eventId: "c71",
		notes: "IOSYSの代表的な東方アレンジアルバム。",
	},
	{
		id: "rel-alst-001",
		name: "TOHO EUROBEAT VOL.1",
		nameJa: null,
		nameEn: "TOHO EUROBEAT VOL.1",
		releaseDate: "2008-08-16",
		releaseYear: 2008,
		releaseMonth: 8,
		releaseDay: 16,
		releaseType: "album",
		eventId: "c74",
		notes: null,
	},
	{
		id: "rel-butai-001",
		name: "幻想万華鏡",
		nameJa: "幻想万華鏡",
		nameEn: "Gensou Mangekyou",
		releaseDate: "2011-05-08",
		releaseYear: 2011,
		releaseMonth: 5,
		releaseDay: 8,
		releaseType: "video",
		eventId: "rei8",
		notes: "東方アニメーションプロジェクト。",
	},
	{
		id: "rel-multi-disc",
		name: "東方PROJECT TRIBUTE ALBUM",
		nameJa: "東方PROJECT TRIBUTE ALBUM",
		nameEn: null,
		releaseDate: "2024-08-12",
		releaseYear: 2024,
		releaseMonth: 8,
		releaseDay: 12,
		releaseType: "album",
		eventId: "c104",
		notes: "2枚組のトリビュートアルバム。",
	},
	{
		id: "rel-single-001",
		name: "チルノのパーフェクトさんすう教室",
		nameJa: "チルノのパーフェクトさんすう教室",
		nameEn: "Cirno's Perfect Math Class",
		releaseDate: "2008-08-16",
		releaseYear: 2008,
		releaseMonth: 8,
		releaseDay: 16,
		releaseType: "single",
		eventId: "c74",
		notes: null,
	},
];

// ============================================
// モックディスク
// ============================================
export const mockDiscs: Disc[] = [
	{
		id: "disc-multi-1",
		releaseId: "rel-multi-disc",
		discNumber: 1,
		discName: "Disc 1 - Vocal",
	},
	{
		id: "disc-multi-2",
		releaseId: "rel-multi-disc",
		discNumber: 2,
		discName: "Disc 2 - Instrumental",
	},
];

// ============================================
// モックリリース-サークル関連
// ============================================
export const mockReleaseCircles: ReleaseCircle[] = [
	// IOSYS album
	{
		circleId: "circle-iosys",
		circleName: "IOSYS",
		participationType: "host",
		position: 1,
	},
	// A-One album
	{
		circleId: "circle-aone",
		circleName: "A-One",
		participationType: "host",
		position: 1,
	},
	// 幻想万華鏡
	{
		circleId: "circle-mangetsu",
		circleName: "満福神社",
		participationType: "host",
		position: 1,
	},
	{
		circleId: "circle-yuuhei",
		circleName: "幽閉サテライト",
		participationType: "participant",
		position: 2,
	},
	// Tribute album (split)
	{
		circleId: "circle-iosys",
		circleName: "IOSYS",
		participationType: "split_partner",
		position: 1,
	},
	{
		circleId: "circle-aone",
		circleName: "A-One",
		participationType: "split_partner",
		position: 2,
	},
	{
		circleId: "circle-alst",
		circleName: "Alstroemeria Records",
		participationType: "split_partner",
		position: 3,
	},
];

// ============================================
// モックトラック
// ============================================
export const mockTracks: Track[] = [
	// IOSYS album tracks
	{
		id: "track-001",
		releaseId: "rel-iosys-001",
		discId: null,
		trackNumber: 1,
		name: "最終鬼畜妹フランドール・S",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-002",
		releaseId: "rel-iosys-001",
		discId: null,
		trackNumber: 2,
		name: "魔理沙は大変なものを盗んでいきました",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-003",
		releaseId: "rel-iosys-001",
		discId: null,
		trackNumber: 3,
		name: "患部で止まってすぐ溶ける ～ 狂気の優曇華院",
		nameJa: null,
		nameEn: null,
	},
	// A-One album tracks
	{
		id: "track-alst-001",
		releaseId: "rel-alst-001",
		discId: null,
		trackNumber: 1,
		name: "TOHO EUROBEAT OPENING",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-alst-002",
		releaseId: "rel-alst-001",
		discId: null,
		trackNumber: 2,
		name: "NIGHT OF FIRE",
		nameJa: null,
		nameEn: null,
	},
	// Multi-disc album tracks
	{
		id: "track-multi-d1-01",
		releaseId: "rel-multi-disc",
		discId: "disc-multi-1",
		trackNumber: 1,
		name: "紅楼 ～ Eastern Dream...",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-multi-d1-02",
		releaseId: "rel-multi-disc",
		discId: "disc-multi-1",
		trackNumber: 2,
		name: "亡き王女の為のセプテット -Vocal Ver-",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-multi-d2-01",
		releaseId: "rel-multi-disc",
		discId: "disc-multi-2",
		trackNumber: 1,
		name: "紅楼 ～ Eastern Dream... (Instrumental)",
		nameJa: null,
		nameEn: null,
	},
	{
		id: "track-multi-d2-02",
		releaseId: "rel-multi-disc",
		discId: "disc-multi-2",
		trackNumber: 2,
		name: "亡き王女の為のセプテット -Inst Ver-",
		nameJa: null,
		nameEn: null,
	},
	// Single
	{
		id: "track-single-001",
		releaseId: "rel-single-001",
		discId: null,
		trackNumber: 1,
		name: "チルノのパーフェクトさんすう教室",
		nameJa: null,
		nameEn: null,
	},
	// Medley track
	{
		id: "track-medley",
		releaseId: "rel-iosys-001",
		discId: null,
		trackNumber: 4,
		name: "東方メドレー ～ 紅魔郷編",
		nameJa: null,
		nameEn: null,
	},
];

// ============================================
// モッククレジット
// ============================================
export const mockTrackCredits: Record<string, TrackCredit[]> = {
	"track-001": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [
				{ roleCode: "arranger", roleName: "編曲" },
				{ roleCode: "lyricist", roleName: "作詞" },
			],
		},
		{
			artistId: "artist-miko",
			artistName: "miko",
			creditName: "miko",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-002": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [
				{ roleCode: "arranger", roleName: "編曲" },
				{ roleCode: "lyricist", roleName: "作詞" },
			],
		},
		{
			artistId: "artist-fu-rin",
			artistName: "藤咲かりん",
			creditName: "藤咲かりん",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-003": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [
				{ roleCode: "arranger", roleName: "編曲" },
				{ roleCode: "lyricist", roleName: "作詞" },
			],
		},
		{
			artistId: "artist-uno",
			artistName: "uno",
			creditName: "uno",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-alst-002": [
		{
			artistId: "artist-yassie",
			artistName: "YASSIE",
			creditName: "YASSIE",
			roles: [{ roleCode: "arranger", roleName: "編曲" }],
		},
		{
			artistId: "artist-aki",
			artistName: "AKI",
			creditName: "AKI",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-multi-d1-01": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [{ roleCode: "arranger", roleName: "編曲" }],
		},
		{
			artistId: "artist-senya",
			artistName: "せにゃ",
			creditName: "senya",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-single-001": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [
				{ roleCode: "arranger", roleName: "編曲" },
				{ roleCode: "lyricist", roleName: "作詞" },
			],
		},
		{
			artistId: "artist-miko",
			artistName: "miko",
			creditName: "miko",
			roles: [{ roleCode: "vocalist", roleName: "Vo" }],
		},
	],
	"track-medley": [
		{
			artistId: "artist-arm",
			artistName: "ARM",
			creditName: "ARM",
			roles: [{ roleCode: "arranger", roleName: "編曲" }],
		},
	],
};

// ============================================
// モック原曲紐付け
// ============================================
export const mockTrackOfficialSongs: Record<string, TrackOfficialSong[]> = {
	"track-001": [
		{
			officialSongId: "02010015",
			songName: "U.N.オーエンは彼女なのか？",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-002": [
		{
			officialSongId: "02010008",
			songName: "人形裁判 ～ 人の形弄びし少女",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-003": [
		{
			officialSongId: "02080008",
			songName: "狂気の瞳　～ Invisible Full Moon",
			workId: "0208",
			workName: "東方永夜抄",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-alst-002": [
		{
			officialSongId: "02020009",
			songName: "ブクレシュティの人形師",
			workId: "0202",
			workName: "東方妖々夢",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-multi-d1-01": [
		{
			officialSongId: "02010003",
			songName: "紅楼 ～ Eastern Dream...",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-multi-d1-02": [
		{
			officialSongId: "02010013",
			songName: "亡き王女の為のセプテット",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	"track-single-001": [
		{
			officialSongId: "02020004",
			songName: "おてんば恋娘",
			workId: "0202",
			workName: "東方妖々夢",
			partPosition: null,
			startSecond: null,
			endSecond: null,
		},
	],
	// メドレー（複数原曲）
	"track-medley": [
		{
			officialSongId: "02010003",
			songName: "紅楼 ～ Eastern Dream...",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: 1,
			startSecond: 0,
			endSecond: 90,
		},
		{
			officialSongId: "02010013",
			songName: "亡き王女の為のセプテット",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: 2,
			startSecond: 90,
			endSecond: 180,
		},
		{
			officialSongId: "02010015",
			songName: "U.N.オーエンは彼女なのか？",
			workId: "0201",
			workName: "東方紅魔郷",
			partPosition: 3,
			startSecond: 180,
			endSecond: 270,
		},
	],
};

// ============================================
// モック派生関係
// ============================================
export const mockTrackDerivations: Record<string, TrackDerivation[]> = {
	"track-multi-d2-01": [
		{
			parentTrackId: "track-multi-d1-01",
			parentTrackName: "紅楼 ～ Eastern Dream...",
			parentReleaseName: "東方PROJECT TRIBUTE ALBUM",
		},
	],
	"track-multi-d2-02": [
		{
			parentTrackId: "track-multi-d1-02",
			parentTrackName: "亡き王女の為のセプテット -Vocal Ver-",
			parentReleaseName: "東方PROJECT TRIBUTE ALBUM",
		},
	],
};

// ============================================
// モックイベント
// ============================================
export const mockEvents: Record<string, { id: string; name: string }> = {
	c71: { id: "c71", name: "コミックマーケット71" },
	c74: { id: "c74", name: "コミックマーケット74" },
	c104: { id: "c104", name: "コミックマーケット104" },
	rei8: { id: "rei8", name: "博麗神社例大祭8" },
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * リリースIDからリリースを取得
 */
export function getReleaseById(id: string): Release | undefined {
	return mockReleases.find((r) => r.id === id);
}

/**
 * リリースIDからサークル一覧を取得
 */
export function getCirclesByReleaseId(releaseId: string): ReleaseCircle[] {
	// 実際にはDBから取得するが、モックでは固定マッピング
	switch (releaseId) {
		case "rel-iosys-001":
		case "rel-single-001":
			return mockReleaseCircles.filter((c) => c.circleId === "circle-iosys");
		case "rel-alst-001":
			return mockReleaseCircles.filter((c) => c.circleId === "circle-aone");
		case "rel-butai-001":
			return mockReleaseCircles.filter(
				(c) =>
					c.circleId === "circle-mangetsu" || c.circleId === "circle-yuuhei",
			);
		case "rel-multi-disc":
			return mockReleaseCircles.filter(
				(c) => c.participationType === "split_partner",
			);
		default:
			return [];
	}
}

/**
 * リリースIDからディスク一覧を取得
 */
export function getDiscsByReleaseId(releaseId: string): Disc[] {
	return mockDiscs
		.filter((d) => d.releaseId === releaseId)
		.sort((a, b) => a.discNumber - b.discNumber);
}

/**
 * リリースIDからトラック一覧を取得
 */
export function getTracksByReleaseId(releaseId: string): Track[] {
	return mockTracks
		.filter((t) => t.releaseId === releaseId)
		.sort((a, b) => {
			// ディスク順 → トラック番号順
			const discA = a.discId
				? (mockDiscs.find((d) => d.id === a.discId)?.discNumber ?? 0)
				: 0;
			const discB = b.discId
				? (mockDiscs.find((d) => d.id === b.discId)?.discNumber ?? 0)
				: 0;
			if (discA !== discB) return discA - discB;
			return a.trackNumber - b.trackNumber;
		});
}

/**
 * トラックIDからクレジットを取得
 */
export function getCreditsByTrackId(trackId: string): TrackCredit[] {
	return mockTrackCredits[trackId] ?? [];
}

/**
 * トラックIDから原曲紐付けを取得
 */
export function getOfficialSongsByTrackId(
	trackId: string,
): TrackOfficialSong[] {
	return (mockTrackOfficialSongs[trackId] ?? []).sort(
		(a, b) => (a.partPosition ?? 0) - (b.partPosition ?? 0),
	);
}

/**
 * トラックIDから派生関係を取得
 */
export function getDerivationsByTrackId(trackId: string): TrackDerivation[] {
	return mockTrackDerivations[trackId] ?? [];
}

/**
 * トラックIDからトラックを取得
 */
export function getTrackById(id: string): Track | undefined {
	return mockTracks.find((t) => t.id === id);
}

/**
 * トラックにクレジットと原曲を付加
 */
export function getTrackWithCredits(track: Track): TrackWithCredits {
	return {
		...track,
		credits: getCreditsByTrackId(track.id),
		officialSongs: getOfficialSongsByTrackId(track.id),
	};
}

/**
 * リリース詳細を取得（統計・関連データ含む）
 */
export function getReleaseWithDetails(
	id: string,
): ReleaseWithDetails | undefined {
	const release = getReleaseById(id);
	if (!release) return undefined;

	const circles = getCirclesByReleaseId(id);
	const discs = getDiscsByReleaseId(id);
	const tracks = getTracksByReleaseId(id).map(getTrackWithCredits);
	const event = release.eventId ? (mockEvents[release.eventId] ?? null) : null;

	// アーティスト数を計算（重複排除）
	const artistIds = new Set<string>();
	for (const track of tracks) {
		for (const credit of track.credits) {
			artistIds.add(credit.artistId);
		}
	}

	return {
		...release,
		circles,
		discs,
		tracks,
		event,
		trackCount: tracks.length,
		artistCount: artistIds.size,
	};
}

/**
 * トラック詳細を取得（リリース・派生関係含む）
 */
export function getTrackWithDetails(id: string): TrackWithDetails | undefined {
	const track = getTrackById(id);
	if (!track) return undefined;

	const release = getReleaseById(track.releaseId);
	if (!release) return undefined;

	const disc = track.discId
		? (mockDiscs.find((d) => d.id === track.discId) ?? null)
		: null;
	const event = release.eventId ? (mockEvents[release.eventId] ?? null) : null;
	const parentTracks = getDerivationsByTrackId(id);

	// 前後トラックを取得
	const releaseTracks = getTracksByReleaseId(track.releaseId);
	const currentIndex = releaseTracks.findIndex((t) => t.id === id);
	const siblingTracks = {
		prev: currentIndex > 0 ? releaseTracks[currentIndex - 1] : null,
		next:
			currentIndex < releaseTracks.length - 1
				? releaseTracks[currentIndex + 1]
				: null,
	};

	return {
		...track,
		credits: getCreditsByTrackId(id),
		officialSongs: getOfficialSongsByTrackId(id),
		release,
		disc,
		event,
		parentTracks,
		siblingTracks,
	};
}

/**
 * ディスクIDからディスクを取得
 */
export function getDiscById(id: string): Disc | undefined {
	return mockDiscs.find((d) => d.id === id);
}
