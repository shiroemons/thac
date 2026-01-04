/**
 * Publication（配信リンク）に関する型定義
 */

/** プラットフォームカテゴリ */
export type PlatformCategory =
	| "streaming"
	| "video"
	| "download"
	| "shop"
	| "other";

/** プラットフォーム情報 */
export interface Platform {
	code: string;
	name: string;
	category: PlatformCategory;
}

/** 配信リンク（ベース） */
export interface Publication {
	id: string;
	platformCode: string;
	url: string;
}

/** リリースの配信リンク */
export interface ReleasePublication extends Publication {
	releaseId: string;
}

/** トラックの配信リンク */
export interface TrackPublication extends Publication {
	trackId: string;
}

/** プラットフォーム情報付き配信リンク */
export interface PublicationWithPlatform extends Publication {
	platform: Platform;
}

/** カテゴリ別にグループ化された配信リンク */
export interface GroupedPublications {
	streaming: PublicationWithPlatform[];
	video: PublicationWithPlatform[];
	download: PublicationWithPlatform[];
	shop: PublicationWithPlatform[];
	other: PublicationWithPlatform[];
}

/** 埋め込み可能なメディアの種類 */
export type EmbedType = "youtube" | "niconico" | "soundcloud";

/** 埋め込みメディア情報 */
export interface EmbedInfo {
	type: EmbedType;
	/** YouTube/ニコニコの場合は動画ID、SoundCloudの場合はURL */
	id: string;
	/** 元のURL */
	url: string;
}

/** サークルのリンク情報（表示用） */
export interface CircleLinkDisplay {
	id: string;
	circleName: string;
	platformCode: string;
	platformName: string;
	url: string;
	isOfficial: boolean;
	isPrimary: boolean;
}

/** アーティストのリンク情報（表示用） */
export interface ArtistLinkDisplay {
	id: string;
	artistName: string;
	platformCode: string;
	platformName: string;
	url: string;
	isOfficial: boolean;
	isPrimary: boolean;
}
