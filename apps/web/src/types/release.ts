/**
 * リリース・トラック関連の型定義
 * DBスキーマ（packages/db/src/schema/release.ts, track.ts）に準拠
 */

// リリースタイプ
export const RELEASE_TYPES = [
	"album",
	"single",
	"ep",
	"digital",
	"video",
] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

// 参加形態
export const PARTICIPATION_TYPES = [
	"host",
	"co-host",
	"participant",
	"guest",
	"split_partner",
] as const;
export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];

// リリース
export interface Release {
	id: string;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
	releaseDate: string | null;
	releaseYear: number | null;
	releaseMonth: number | null;
	releaseDay: number | null;
	releaseType: ReleaseType | null;
	eventId: string | null;
	notes: string | null;
}

// ディスク
export interface Disc {
	id: string;
	releaseId: string;
	discNumber: number;
	discName: string | null;
}

// リリース-サークル関連
export interface ReleaseCircle {
	circleId: string;
	circleName: string;
	participationType: ParticipationType;
	position: number;
}

// トラック
export interface Track {
	id: string;
	releaseId: string;
	discId: string | null;
	trackNumber: number;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
}

// トラッククレジット
export interface TrackCredit {
	artistId: string;
	artistName: string;
	creditName: string;
	roles: TrackCreditRole[];
}

// クレジット役割
export interface TrackCreditRole {
	roleCode: string;
	roleName: string;
}

// トラック-原曲関連
export interface TrackOfficialSong {
	officialSongId: string | null;
	songName: string;
	workId: string | null;
	workName: string;
	partPosition: number | null;
	startSecond: number | null;
	endSecond: number | null;
}

// トラック派生関係
export interface TrackDerivation {
	parentTrackId: string;
	parentTrackName: string;
	parentReleaseName: string;
}

// UI用: クレジット付きトラック
export interface TrackWithCredits extends Track {
	credits: TrackCredit[];
	officialSongs: TrackOfficialSong[];
}

// UI用: リリース詳細（統計・関連データ含む）
export interface ReleaseWithDetails extends Release {
	circles: ReleaseCircle[];
	discs: Disc[];
	tracks: TrackWithCredits[];
	event: { id: string; name: string } | null;
	trackCount: number;
	artistCount: number;
}

// UI用: トラック詳細（リリース・派生関係含む）
export interface TrackWithDetails extends TrackWithCredits {
	release: Release;
	disc: Disc | null;
	event: { id: string; name: string } | null;
	parentTracks: TrackDerivation[];
	siblingTracks: {
		prev: Track | null;
		next: Track | null;
	};
}

// 表示名マッピング
export const releaseTypeNames: Record<ReleaseType, string> = {
	album: "アルバム",
	single: "シングル",
	ep: "EP",
	digital: "デジタル",
	video: "映像作品",
};

export const participationTypeNames: Record<ParticipationType, string> = {
	host: "主催",
	"co-host": "共催",
	participant: "参加",
	guest: "ゲスト",
	split_partner: "スプリット",
};

export const roleNames: Record<string, string> = {
	composer: "作曲",
	arranger: "編曲",
	lyricist: "作詞",
	vocalist: "Vo",
	remixer: "リミックス",
	guitar: "Gt",
	bass: "Ba",
	drums: "Dr",
	piano: "Pf",
	keyboard: "Key",
	strings: "Strings",
	mix: "Mix",
	mastering: "Mastering",
};

// バッジカラーマッピング
export const participationTypeBadgeColors: Record<ParticipationType, string> = {
	host: "badge-primary",
	"co-host": "badge-secondary",
	participant: "badge-ghost",
	guest: "badge-outline",
	split_partner: "badge-accent",
};

export const releaseTypeBadgeColors: Record<ReleaseType, string> = {
	album: "badge-primary",
	single: "badge-secondary",
	ep: "badge-accent",
	digital: "badge-info",
	video: "badge-warning",
};
