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
