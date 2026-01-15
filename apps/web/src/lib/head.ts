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
// 型定義
// =============================================================================

interface MetaTag {
	title?: string;
	name?: string;
	property?: string;
	content?: string;
}

interface PageMeta {
	meta: MetaTag[];
}

interface OpenGraphMeta {
	title: string;
	description: string;
	type: "website" | "profile" | "article";
	siteName: string;
}

interface TwitterMeta {
	card: "summary" | "summary_large_image";
	title?: string;
	description?: string;
}

// =============================================================================
// 定数
// =============================================================================

export const APP_NAME = "東方編曲録";

const OG_LOCALE = "ja_JP";

// =============================================================================
// ヘルパー関数
// =============================================================================

function createOpenGraphMeta(og: OpenGraphMeta): MetaTag[] {
	return [
		{ property: "og:title", content: og.title },
		{ property: "og:description", content: og.description },
		{ property: "og:type", content: og.type },
		{ property: "og:site_name", content: og.siteName },
		{ property: "og:locale", content: OG_LOCALE },
	];
}

function createTwitterMeta(twitter: TwitterMeta): MetaTag[] {
	const tags: MetaTag[] = [{ name: "twitter:card", content: twitter.card }];
	if (twitter.title)
		tags.push({ name: "twitter:title", content: twitter.title });
	if (twitter.description)
		tags.push({ name: "twitter:description", content: twitter.description });
	return tags;
}

function createFullPageMeta(options: {
	title: string;
	description: string;
	ogType?: "website" | "profile" | "article";
}): PageMeta {
	const pageTitle = `${options.title} | ${APP_NAME}`;
	return {
		meta: [
			{ title: pageTitle },
			{ name: "description", content: options.description },
			...createOpenGraphMeta({
				title: pageTitle,
				description: options.description,
				type: options.ogType ?? "website",
				siteName: APP_NAME,
			}),
			...createTwitterMeta({
				card: "summary",
				title: pageTitle,
				description: options.description,
			}),
		],
	};
}

// =============================================================================
// 説明文生成関数
// =============================================================================

function generateArtistDescription(artist: PublicArtistDetail): string {
	const parts: string[] = [];
	if (artist.roles.length > 0) {
		parts.push(
			artist.roles
				.slice(0, 3)
				.map((r) => r.label)
				.join("・"),
		);
	}
	parts.push(`${artist.stats.trackCount}曲参加`);
	parts.push(`${artist.stats.releaseCount}作品に参加`);
	return parts.join(" | ");
}

function generateCircleDescription(circle: PublicCircleDetail): string {
	const parts: string[] = [];
	if (circle.notes) {
		const truncated =
			circle.notes.length > 80
				? `${circle.notes.slice(0, 80)}...`
				: circle.notes;
		parts.push(truncated);
	}
	parts.push(`${circle.stats.releaseCount}作品`);
	parts.push(`${circle.stats.trackCount}曲`);
	return parts.join(" | ");
}

function generateReleaseDescription(release: PublicReleaseDetail): string {
	const parts: string[] = [];
	if (release.event?.name) parts.push(release.event.name);
	if (release.releaseDate) parts.push(release.releaseDate);
	parts.push(`${release.trackCount}曲収録`);
	if (release.artistCount > 1) parts.push(`${release.artistCount}名参加`);
	return parts.join(" | ");
}

function generateEventDescription(event: PublicEventDetail): string {
	const parts: string[] = [];
	if (event.startDate) {
		if (event.endDate && event.startDate !== event.endDate) {
			parts.push(`${event.startDate} 〜 ${event.endDate}`);
		} else {
			parts.push(event.startDate);
		}
	}
	if (event.venue) parts.push(event.venue);
	parts.push(`${event.stats.releaseCount}作品`);
	parts.push(`${event.stats.circleCount}サークル`);
	return parts.join(" | ");
}

function generateOriginalSongDescription(song: PublicSongDetail): string {
	const parts: string[] = [];
	if (song.work) {
		const workDisplay = song.work.categoryName
			? `${song.work.name}（${song.work.categoryName}）`
			: song.work.name;
		parts.push(workDisplay);
	}
	parts.push(`${song.arrangeCount}アレンジ`);
	return parts.join(" | ");
}

function generateOfficialWorkDescription(work: PublicWorkDetail): string {
	const parts: string[] = [];
	if (work.categoryName) parts.push(work.categoryName);
	parts.push(`${work.songCount}曲収録`);
	parts.push(`${work.totalArrangeCount}アレンジ`);
	return parts.join(" | ");
}

function generateTrackDescription(track: PublicTrackDetail): string {
	const parts: string[] = [];
	if (track.release) {
		parts.push(track.release.name);
		if (track.release.releaseDate) parts.push(track.release.releaseDate);
	}
	const mainCredits = track.credits.slice(0, 2).map((c) => {
		const roles = c.roles
			.map((r) => r.roleName)
			.filter(Boolean)
			.join("/");
		return roles ? `${c.creditName}（${roles}）` : c.creditName;
	});
	if (mainCredits.length > 0) {
		parts.push(mainCredits.join(", "));
		if (track.credits.length > 2) parts.push(`他${track.credits.length - 2}名`);
	}
	return parts.join(" | ");
}

// =============================================================================
// 共通ページヘッド
// =============================================================================

export function createPageHead(pageTitle?: string) {
	return {
		meta: [{ title: pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME }],
	};
}

// =============================================================================
// 管理画面用ページヘッド
// =============================================================================

export function createTrackDetailHead(
	trackName?: string,
	releaseName?: string,
) {
	const subtitle =
		trackName && releaseName ? `${trackName} - ${releaseName}` : "読み込み中";
	return {
		meta: [{ title: `トラック詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createReleaseDetailHead(releaseName?: string) {
	const subtitle = releaseName || "読み込み中";
	return {
		meta: [{ title: `作品詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createArtistDetailHead(artistName?: string) {
	const subtitle = artistName || "読み込み中";
	return {
		meta: [{ title: `アーティスト詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createCircleDetailHead(circleName?: string) {
	const subtitle = circleName || "読み込み中";
	return {
		meta: [{ title: `サークル詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createEventDetailHead(eventName?: string) {
	const subtitle = eventName || "読み込み中";
	return {
		meta: [{ title: `イベント詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createEventSeriesDetailHead(seriesName?: string) {
	const subtitle = seriesName || "読み込み中";
	return {
		meta: [{ title: `イベントシリーズ詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createMasterDetailHead(masterType: string, itemName?: string) {
	const subtitle = itemName || "読み込み中";
	return {
		meta: [{ title: `${masterType}詳細：${subtitle} | ${APP_NAME}` }],
	};
}

export function createArtistAliasDetailHead(aliasName?: string) {
	const subtitle = aliasName || "読み込み中";
	return {
		meta: [{ title: `名義詳細：${subtitle} | ${APP_NAME}` }],
	};
}

// =============================================================================
// 公開ページ用（OpenGraph対応）
// =============================================================================

export function createPublicArtistHead(
	artist?: PublicArtistDetail | null,
): PageMeta {
	if (!artist) {
		return { meta: [{ title: `アーティスト：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `アーティスト：${artist.name}`,
		description: generateArtistDescription(artist),
		ogType: "profile",
	});
}

export function createPublicCircleHead(
	circle?: PublicCircleDetail | null,
): PageMeta {
	if (!circle) {
		return { meta: [{ title: `サークル：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `サークル：${circle.name}`,
		description: generateCircleDescription(circle),
		ogType: "profile",
	});
}

export function createPublicEventHead(
	event?: PublicEventDetail | null,
): PageMeta {
	if (!event) {
		return { meta: [{ title: `イベント：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `イベント：${event.name}`,
		description: generateEventDescription(event),
	});
}

export function createPublicOfficialWorkHead(
	work?: PublicWorkDetail | null,
): PageMeta {
	if (!work) {
		return { meta: [{ title: `原作：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `原作：${work.nameJa}`,
		description: generateOfficialWorkDescription(work),
	});
}

export function createPublicOriginalSongHead(
	song?: PublicSongDetail | null,
): PageMeta {
	if (!song) {
		return { meta: [{ title: `原曲：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `原曲：${song.nameJa}`,
		description: generateOriginalSongDescription(song),
	});
}

export function createPublicReleaseHead(
	release?: PublicReleaseDetail | null,
): PageMeta {
	if (!release) {
		return { meta: [{ title: `作品：読み込み中 | ${APP_NAME}` }] };
	}
	return createFullPageMeta({
		title: `作品：${release.name}`,
		description: generateReleaseDescription(release),
	});
}

export function createPublicTrackHead(
	track?: PublicTrackDetail | null,
): PageMeta {
	if (!track) {
		return { meta: [{ title: `トラック：読み込み中 | ${APP_NAME}` }] };
	}
	const subtitle = track.release
		? `${track.name} - ${track.release.name}`
		: track.name;
	return createFullPageMeta({
		title: `トラック：${subtitle}`,
		description: generateTrackDescription(track),
	});
}
