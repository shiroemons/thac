import type { InitialScript } from "@thac/db";
import { nanoid } from "nanoid";

/**
 * テスト用アーティストデータを生成
 */
export function createTestArtist(
	overrides?: Partial<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		sortName: string | null;
		nameInitial: string | null;
		initialScript: InitialScript;
		notes: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `ar_test_${uniqueId}`,
		name: `Test Artist ${uniqueId}`,
		nameJa: null,
		nameEn: null,
		sortName: null,
		nameInitial: "T",
		initialScript: "latin" as InitialScript,
		notes: null,
		...overrides,
	};
}

/**
 * テスト用サークルデータを生成
 */
export function createTestCircle(
	overrides?: Partial<{
		id: string;
		name: string;
		nameJa: string | null;
		nameEn: string | null;
		sortName: string | null;
		nameInitial: string | null;
		initialScript: InitialScript;
		notes: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `ci_test_${uniqueId}`,
		name: `Test Circle ${uniqueId}`,
		nameJa: null,
		nameEn: null,
		sortName: null,
		nameInitial: "T",
		initialScript: "latin" as InitialScript,
		notes: null,
		...overrides,
	};
}

/**
 * テスト用イベントシリーズデータを生成
 */
export function createTestEventSeries(
	overrides?: Partial<{
		id: string;
		name: string;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `es_test_${uniqueId}`,
		name: `Test Event Series ${uniqueId}`,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用イベントデータを生成
 */
export function createTestEvent(
	overrides?: Partial<{
		id: string;
		eventSeriesId: string | null;
		name: string;
		edition: number | null;
		totalDays: number;
		venue: string | null;
		startDate: string | null;
		endDate: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `ev_test_${uniqueId}`,
		eventSeriesId: null,
		name: `Test Event ${uniqueId}`,
		edition: null,
		totalDays: 1,
		venue: null,
		startDate: null,
		endDate: null,
		...overrides,
	};
}

/**
 * テスト用プラットフォームデータを生成
 */
export function createTestPlatform(
	overrides?: Partial<{
		code: string;
		name: string;
		category: string | null;
		urlPattern: string | null;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		code: `test_${uniqueId}`,
		name: `Test Platform ${uniqueId}`,
		category: null,
		urlPattern: null,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用クレジットロールデータを生成
 */
export function createTestCreditRole(
	overrides?: Partial<{
		code: string;
		label: string;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		code: `role_${uniqueId}`,
		label: `Test Role ${uniqueId}`,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用公式作品カテゴリデータを生成
 */
export function createTestOfficialWorkCategory(
	overrides?: Partial<{
		code: string;
		name: string;
		description: string | null;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		code: `cat_${uniqueId}`,
		name: `Test Category ${uniqueId}`,
		description: null,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用公式作品データを生成
 */
export function createTestOfficialWork(
	overrides?: Partial<{
		id: string;
		categoryCode: string;
		name: string;
		nameJa: string;
		nameEn: string | null;
		shortNameJa: string | null;
		shortNameEn: string | null;
		numberInSeries: number | null;
		releaseDate: string | null;
		officialOrganization: string | null;
		position: number | null;
		notes: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `ow_test_${uniqueId}`,
		categoryCode: "test_category",
		name: `Test Work ${uniqueId}`,
		nameJa: `テスト作品 ${uniqueId}`,
		nameEn: null,
		shortNameJa: null,
		shortNameEn: null,
		numberInSeries: null,
		releaseDate: null,
		officialOrganization: null,
		position: null,
		notes: null,
		...overrides,
	};
}

/**
 * テスト用公式楽曲データを生成
 */
export function createTestOfficialSong(
	overrides?: Partial<{
		id: string;
		officialWorkId: string | null;
		trackNumber: number | null;
		name: string;
		nameJa: string;
		nameEn: string | null;
		composerName: string | null;
		arrangerName: string | null;
		isOriginal: boolean;
		sourceSongId: string | null;
		notes: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `os_test_${uniqueId}`,
		officialWorkId: null,
		trackNumber: null,
		name: `Test Song ${uniqueId}`,
		nameJa: `テスト楽曲 ${uniqueId}`,
		nameEn: null,
		composerName: null,
		arrangerName: null,
		isOriginal: true,
		sourceSongId: null,
		notes: null,
		...overrides,
	};
}

/**
 * テスト用公式作品リンクデータを生成
 */
export function createTestOfficialWorkLink(
	overrides?: Partial<{
		id: string;
		officialWorkId: string;
		platformCode: string;
		url: string;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `owl_test_${uniqueId}`,
		officialWorkId: "test_work",
		platformCode: "test_platform",
		url: `https://example.com/${uniqueId}`,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用公式楽曲リンクデータを生成
 */
export function createTestOfficialSongLink(
	overrides?: Partial<{
		id: string;
		officialSongId: string;
		platformCode: string;
		url: string;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `osl_test_${uniqueId}`,
		officialSongId: "test_song",
		platformCode: "test_platform",
		url: `https://example.com/song/${uniqueId}`,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用別名タイプデータを生成
 */
export function createTestAliasType(
	overrides?: Partial<{
		code: string;
		label: string;
		sortOrder: number;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		code: `alias_${uniqueId}`,
		label: `Test Alias Type ${uniqueId}`,
		sortOrder: 0,
		...overrides,
	};
}

/**
 * テスト用アーティスト別名データを生成
 */
export function createTestArtistAlias(
	overrides?: Partial<{
		id: string;
		artistId: string;
		name: string;
		aliasTypeCode: string | null;
		nameInitial: string | null;
		initialScript: InitialScript;
		periodFrom: string | null;
		periodTo: string | null;
	}>,
) {
	const uniqueId = nanoid(8);
	return {
		id: `aa_test_${uniqueId}`,
		artistId: "test_artist",
		name: `Test Alias ${uniqueId}`,
		aliasTypeCode: null,
		nameInitial: "T",
		initialScript: "latin" as InitialScript,
		periodFrom: null,
		periodTo: null,
		...overrides,
	};
}
