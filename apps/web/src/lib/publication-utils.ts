import type {
	GroupedPublications,
	PlatformCategory,
	PublicationWithPlatform,
} from "@/types/publication";
import { PLATFORM_CATEGORY_ORDER } from "./constants";

/**
 * 配信リンクをカテゴリ別にグループ化する
 */
export function groupByCategory(
	publications: PublicationWithPlatform[],
): GroupedPublications {
	const grouped: GroupedPublications = {
		streaming: [],
		video: [],
		download: [],
		shop: [],
		other: [],
	};

	for (const pub of publications) {
		const category = pub.platform.category;
		if (category in grouped) {
			grouped[category].push(pub);
		} else {
			grouped.other.push(pub);
		}
	}

	return grouped;
}

/**
 * グループ化された配信リンクが空かどうかを判定する
 */
export function isGroupedPublicationsEmpty(
	grouped: GroupedPublications,
): boolean {
	return Object.values(grouped).every((arr) => arr.length === 0);
}

/**
 * カテゴリの表示順序を取得する
 */
export function getCategoryOrder(): readonly PlatformCategory[] {
	return PLATFORM_CATEGORY_ORDER as readonly PlatformCategory[];
}

/**
 * 特定のカテゴリの配信リンクを取得する
 */
export function getPublicationsByCategory(
	publications: PublicationWithPlatform[],
	category: PlatformCategory,
): PublicationWithPlatform[] {
	return publications.filter((pub) => pub.platform.category === category);
}

/**
 * 埋め込み対応プラットフォームの配信リンクを取得する
 */
export function getEmbeddablePublications(
	publications: PublicationWithPlatform[],
): PublicationWithPlatform[] {
	const embeddableCodes = ["youtube", "nicovideo", "niconico", "soundcloud"];
	return publications.filter((pub) =>
		embeddableCodes.includes(pub.platformCode.toLowerCase()),
	);
}

/**
 * 埋め込み非対応の配信リンクを取得する（リンクのみ表示用）
 */
export function getNonEmbeddablePublications(
	publications: PublicationWithPlatform[],
): PublicationWithPlatform[] {
	const embeddableCodes = ["youtube", "nicovideo", "niconico", "soundcloud"];
	return publications.filter(
		(pub) => !embeddableCodes.includes(pub.platformCode.toLowerCase()),
	);
}
