import type { EmbedInfo, EmbedType } from "@/types/publication";

/**
 * YouTube動画のIDを抽出する
 * 対応パターン:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.replace("www.", "");

		if (hostname === "youtube.com") {
			// /watch?v=xxx
			const videoId = urlObj.searchParams.get("v");
			if (videoId) return videoId;

			// /embed/xxx または /v/xxx
			const pathMatch = urlObj.pathname.match(/^\/(?:embed|v)\/([^/?]+)/);
			if (pathMatch) return pathMatch[1];
		}

		if (hostname === "youtu.be") {
			// youtu.be/xxx
			const pathMatch = urlObj.pathname.match(/^\/([^/?]+)/);
			if (pathMatch) return pathMatch[1];
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * ニコニコ動画のIDを抽出する
 * 対応パターン:
 * - https://www.nicovideo.jp/watch/sm12345
 * - https://nico.ms/sm12345
 * - https://www.nicovideo.jp/watch/so12345 (公式動画)
 * - https://www.nicovideo.jp/watch/nm12345 (ニコニコムービーメーカー)
 */
export function extractNiconicoId(url: string): string | null {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.replace("www.", "");

		if (hostname === "nicovideo.jp") {
			// /watch/sm12345
			const pathMatch = urlObj.pathname.match(
				/^\/watch\/([sn][mo]?\d+|[0-9]+)/,
			);
			if (pathMatch) return pathMatch[1];
		}

		if (hostname === "nico.ms") {
			// nico.ms/sm12345
			const pathMatch = urlObj.pathname.match(/^\/([sn][mo]?\d+|[0-9]+)/);
			if (pathMatch) return pathMatch[1];
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * SoundCloudのURLかどうかを判定する
 * 対応パターン:
 * - https://soundcloud.com/user/track
 * - https://soundcloud.com/user/sets/playlist
 */
export function isSoundCloudUrl(url: string): boolean {
	try {
		const urlObj = new URL(url);
		const hostname = urlObj.hostname.replace("www.", "");
		return hostname === "soundcloud.com";
	} catch {
		return false;
	}
}

/**
 * 埋め込み可能なプラットフォームコード
 */
const EMBEDDABLE_PLATFORMS: Record<string, EmbedType> = {
	youtube: "youtube",
	nicovideo: "niconico",
	niconico: "niconico",
	soundcloud: "soundcloud",
};

/**
 * URLから埋め込み情報を取得する
 * 埋め込み非対応の場合はnullを返す
 */
export function getEmbedInfo(
	platformCode: string,
	url: string,
): EmbedInfo | null {
	const embedType = EMBEDDABLE_PLATFORMS[platformCode.toLowerCase()];
	if (!embedType) return null;

	switch (embedType) {
		case "youtube": {
			const videoId = extractYouTubeId(url);
			if (!videoId) return null;
			return { type: "youtube", id: videoId, url };
		}
		case "niconico": {
			const videoId = extractNiconicoId(url);
			if (!videoId) return null;
			return { type: "niconico", id: videoId, url };
		}
		case "soundcloud": {
			if (!isSoundCloudUrl(url)) return null;
			return { type: "soundcloud", id: url, url };
		}
		default:
			return null;
	}
}

/**
 * YouTube埋め込みURLを生成する（プライバシー強化モード）
 */
export function getYouTubeEmbedUrl(videoId: string): string {
	return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/**
 * ニコニコ動画埋め込みURLを生成する
 */
export function getNiconicoEmbedUrl(videoId: string): string {
	return `https://embed.nicovideo.jp/watch/${videoId}`;
}

/**
 * SoundCloud埋め込みURLを生成する
 */
export function getSoundCloudEmbedUrl(trackUrl: string): string {
	const params = new URLSearchParams({
		url: trackUrl,
		color: "#ff5500",
		auto_play: "false",
		hide_related: "true",
		show_comments: "false",
		show_user: "true",
		show_reposts: "false",
		show_teaser: "false",
	});
	return `https://w.soundcloud.com/player/?${params.toString()}`;
}

/**
 * 埋め込み可能なプラットフォームかどうかを判定する
 */
export function isEmbeddable(platformCode: string): boolean {
	return platformCode.toLowerCase() in EMBEDDABLE_PLATFORMS;
}
