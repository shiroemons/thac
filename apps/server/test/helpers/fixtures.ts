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
