/**
 * 配信リンク（Publication）のモックデータ
 */

import type { PublicationWithPlatform } from "@/types/publication";

// ============================================
// プラットフォームマスタ
// ============================================
export const mockPlatforms = {
	spotify: { code: "spotify", name: "Spotify", category: "streaming" as const },
	apple_music: {
		code: "apple_music",
		name: "Apple Music",
		category: "streaming" as const,
	},
	youtube_music: {
		code: "youtube_music",
		name: "YouTube Music",
		category: "streaming" as const,
	},
	line_music: {
		code: "line_music",
		name: "LINE MUSIC",
		category: "streaming" as const,
	},
	soundcloud: {
		code: "soundcloud",
		name: "SoundCloud",
		category: "streaming" as const,
	},
	amazon_music: {
		code: "amazon_music",
		name: "Amazon Music",
		category: "streaming" as const,
	},
	youtube: { code: "youtube", name: "YouTube", category: "video" as const },
	nicovideo: {
		code: "nicovideo",
		name: "ニコニコ動画",
		category: "video" as const,
	},
	bandcamp: {
		code: "bandcamp",
		name: "Bandcamp",
		category: "download" as const,
	},
	booth: { code: "booth", name: "BOOTH", category: "download" as const },
	dlsite: { code: "dlsite", name: "DLsite", category: "download" as const },
	melonbooks: {
		code: "melonbooks",
		name: "メロンブックス",
		category: "shop" as const,
	},
	toranoana: {
		code: "toranoana",
		name: "とらのあな",
		category: "shop" as const,
	},
	akibaoo: {
		code: "akibaoo",
		name: "あきばお～こく",
		category: "shop" as const,
	},
	animate: {
		code: "animate",
		name: "アニメイト",
		category: "shop" as const,
	},
	official: {
		code: "official",
		name: "公式サイト",
		category: "other" as const,
	},
	twitter: { code: "twitter", name: "X (Twitter)", category: "other" as const },
	blog: { code: "blog", name: "ブログ", category: "other" as const },
} as const;

// ============================================
// リリースの配信リンク
// ============================================
export const mockReleasePublications: Record<
	string,
	PublicationWithPlatform[]
> = {
	"rel-iosys-001": [
		{
			id: "rp-iosys-001-1",
			platformCode: "spotify",
			url: "https://open.spotify.com/album/0abc123",
			platform: mockPlatforms.spotify,
		},
		{
			id: "rp-iosys-001-2",
			platformCode: "youtube",
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			platform: mockPlatforms.youtube,
		},
		{
			id: "rp-iosys-001-3",
			platformCode: "soundcloud",
			url: "https://soundcloud.com/iosys/sets/touhou-otome-bayashi",
			platform: mockPlatforms.soundcloud,
		},
		{
			id: "rp-iosys-001-4",
			platformCode: "booth",
			url: "https://iosys.booth.pm/items/123456",
			platform: mockPlatforms.booth,
		},
		{
			id: "rp-iosys-001-5",
			platformCode: "melonbooks",
			url: "https://www.melonbooks.co.jp/detail/detail.php?product_id=123456",
			platform: mockPlatforms.melonbooks,
		},
		{
			id: "rp-iosys-001-6",
			platformCode: "apple_music",
			url: "https://music.apple.com/jp/album/123456",
			platform: mockPlatforms.apple_music,
		},
	],
	"rel-alst-001": [
		{
			id: "rp-alst-001-1",
			platformCode: "spotify",
			url: "https://open.spotify.com/album/0xyz789",
			platform: mockPlatforms.spotify,
		},
		{
			id: "rp-alst-001-2",
			platformCode: "bandcamp",
			url: "https://alstroemeria-records.bandcamp.com/album/toho-eurobeat-vol1",
			platform: mockPlatforms.bandcamp,
		},
		{
			id: "rp-alst-001-3",
			platformCode: "youtube_music",
			url: "https://music.youtube.com/playlist?list=abc123",
			platform: mockPlatforms.youtube_music,
		},
	],
	"rel-butai-001": [
		{
			id: "rp-butai-001-1",
			platformCode: "youtube",
			url: "https://www.youtube.com/watch?v=zXxyz123",
			platform: mockPlatforms.youtube,
		},
		{
			id: "rp-butai-001-2",
			platformCode: "nicovideo",
			url: "https://www.nicovideo.jp/watch/sm12345678",
			platform: mockPlatforms.nicovideo,
		},
		{
			id: "rp-butai-001-3",
			platformCode: "booth",
			url: "https://manpukujinja.booth.pm/items/789012",
			platform: mockPlatforms.booth,
		},
	],
	"rel-multi-disc": [
		{
			id: "rp-multi-001-1",
			platformCode: "spotify",
			url: "https://open.spotify.com/album/0multi123",
			platform: mockPlatforms.spotify,
		},
		{
			id: "rp-multi-001-2",
			platformCode: "youtube",
			url: "https://www.youtube.com/watch?v=multiABC",
			platform: mockPlatforms.youtube,
		},
		{
			id: "rp-multi-001-3",
			platformCode: "toranoana",
			url: "https://ec.toranoana.shop/tora/ec/item/123456",
			platform: mockPlatforms.toranoana,
		},
		{
			id: "rp-multi-001-4",
			platformCode: "melonbooks",
			url: "https://www.melonbooks.co.jp/detail/detail.php?product_id=789012",
			platform: mockPlatforms.melonbooks,
		},
	],
	"rel-single-001": [
		{
			id: "rp-single-001-1",
			platformCode: "youtube",
			url: "https://www.youtube.com/watch?v=5wFDWP5JwSM",
			platform: mockPlatforms.youtube,
		},
		{
			id: "rp-single-001-2",
			platformCode: "nicovideo",
			url: "https://www.nicovideo.jp/watch/sm5054636",
			platform: mockPlatforms.nicovideo,
		},
		{
			id: "rp-single-001-3",
			platformCode: "soundcloud",
			url: "https://soundcloud.com/iosys/cirnos-perfect-math-class",
			platform: mockPlatforms.soundcloud,
		},
	],
};

// ============================================
// トラックの配信リンク
// ============================================
export const mockTrackPublications: Record<string, PublicationWithPlatform[]> =
	{
		"track-001": [
			{
				id: "tp-001-1",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=flandre123",
				platform: mockPlatforms.youtube,
			},
			{
				id: "tp-001-2",
				platformCode: "nicovideo",
				url: "https://www.nicovideo.jp/watch/sm1234567",
				platform: mockPlatforms.nicovideo,
			},
		],
		"track-002": [
			{
				id: "tp-002-1",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=marisa456",
				platform: mockPlatforms.youtube,
			},
			{
				id: "tp-002-2",
				platformCode: "nicovideo",
				url: "https://www.nicovideo.jp/watch/sm2345678",
				platform: mockPlatforms.nicovideo,
			},
			{
				id: "tp-002-3",
				platformCode: "soundcloud",
				url: "https://soundcloud.com/iosys/marisa-wa-taihen",
				platform: mockPlatforms.soundcloud,
			},
		],
		"track-003": [
			{
				id: "tp-003-1",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=kanbu789",
				platform: mockPlatforms.youtube,
			},
		],
		"track-single-001": [
			{
				id: "tp-single-001-1",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=5wFDWP5JwSM",
				platform: mockPlatforms.youtube,
			},
			{
				id: "tp-single-001-2",
				platformCode: "nicovideo",
				url: "https://www.nicovideo.jp/watch/sm5054636",
				platform: mockPlatforms.nicovideo,
			},
			{
				id: "tp-single-001-3",
				platformCode: "soundcloud",
				url: "https://soundcloud.com/iosys/cirnos-perfect-math-class",
				platform: mockPlatforms.soundcloud,
			},
		],
	};

// ============================================
// ヘルパー関数
// ============================================

/**
 * リリースIDから配信リンクを取得
 */
export function getPublicationsForRelease(
	releaseId: string,
): PublicationWithPlatform[] {
	return mockReleasePublications[releaseId] ?? [];
}

/**
 * トラックIDから配信リンクを取得
 */
export function getPublicationsForTrack(
	trackId: string,
): PublicationWithPlatform[] {
	return mockTrackPublications[trackId] ?? [];
}
