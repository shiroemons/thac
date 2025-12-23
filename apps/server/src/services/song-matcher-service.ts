/**
 * 原曲マッチングサービス
 *
 * データベースを使用した原曲マッチングの実装。
 */

import { db, eq, like, officialSongs, officialWorks, or } from "@thac/db";
import {
	type OfficialSongData,
	OTHER_SONG_ID,
	type SongMatcher,
} from "../utils/song-matcher";

/**
 * データベースを使用した完全一致検索
 */
async function exactSearchFromDb(name: string): Promise<OfficialSongData[]> {
	const results = await db
		.select({
			id: officialSongs.id,
			name: officialSongs.name,
			nameJa: officialSongs.nameJa,
			isOriginal: officialSongs.isOriginal,
			officialWorkName: officialWorks.name,
		})
		.from(officialSongs)
		.leftJoin(officialWorks, eq(officialSongs.officialWorkId, officialWorks.id))
		.where(or(eq(officialSongs.name, name), eq(officialSongs.nameJa, name)));

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		nameJa: r.nameJa,
		isOriginal: r.isOriginal,
		officialWorkName: r.officialWorkName,
	}));
}

/**
 * データベースを使用した部分一致検索
 */
async function partialSearchFromDb(
	name: string,
	limit: number,
): Promise<OfficialSongData[]> {
	const pattern = `%${name}%`;
	const results = await db
		.select({
			id: officialSongs.id,
			name: officialSongs.name,
			nameJa: officialSongs.nameJa,
			isOriginal: officialSongs.isOriginal,
			officialWorkName: officialWorks.name,
		})
		.from(officialSongs)
		.leftJoin(officialWorks, eq(officialSongs.officialWorkId, officialWorks.id))
		.where(
			or(
				like(officialSongs.name, pattern),
				like(officialSongs.nameJa, pattern),
			),
		)
		.limit(limit);

	return results.map((r) => ({
		id: r.id,
		name: r.name,
		nameJa: r.nameJa,
		isOriginal: r.isOriginal,
		officialWorkName: r.officialWorkName,
	}));
}

/**
 * データベースからオリジナルレコードを検索
 */
async function findOriginalFromDb(): Promise<OfficialSongData | null> {
	const results = await db
		.select({
			id: officialSongs.id,
			name: officialSongs.name,
			nameJa: officialSongs.nameJa,
			isOriginal: officialSongs.isOriginal,
			officialWorkName: officialWorks.name,
		})
		.from(officialSongs)
		.leftJoin(officialWorks, eq(officialSongs.officialWorkId, officialWorks.id))
		.where(eq(officialSongs.name, "オリジナル"))
		.limit(1);

	if (results.length === 0) {
		return null;
	}

	const r = results[0];
	return {
		// biome-ignore lint/style/noNonNullAssertion: results.length > 0 is guaranteed
		id: r!.id,
		// biome-ignore lint/style/noNonNullAssertion: results.length > 0 is guaranteed
		name: r!.name,
		// biome-ignore lint/style/noNonNullAssertion: results.length > 0 is guaranteed
		nameJa: r!.nameJa,
		// biome-ignore lint/style/noNonNullAssertion: results.length > 0 is guaranteed
		isOriginal: r!.isOriginal,
		// biome-ignore lint/style/noNonNullAssertion: results.length > 0 is guaranteed
		officialWorkName: r!.officialWorkName,
	};
}

// 同期版のラッパー（キャッシュを使用）
let cachedOriginal: OfficialSongData | null | undefined;

/**
 * データベースを使用した原曲マッチャーを作成
 */
export function createDbSongMatcher(candidateLimit = 10): SongMatcher {
	// キャッシュをリセット
	cachedOriginal = undefined;

	return {
		async matchSongs(originalNames: string[]) {
			// オリジナルレコードを事前にキャッシュ
			if (cachedOriginal === undefined) {
				cachedOriginal = await findOriginalFromDb();
			}

			// 非同期版のマッチャーを使用
			const results = [];
			for (const name of originalNames) {
				const result = await matchSingleSongFromDb(
					name,
					candidateLimit,
					cachedOriginal,
				);
				results.push(result);
			}
			return results;
		},
	};
}

async function matchSingleSongFromDb(
	originalName: string,
	candidateLimit: number,
	cachedOriginal: OfficialSongData | null,
) {
	// 空文字列の場合はスキップ
	if (!originalName || originalName.trim() === "") {
		return {
			originalName,
			isOriginal: false,
			matchType: "none" as const,
			candidates: [],
			autoMatched: false,
			selectedId: null,
			customSongName: null,
		};
	}

	const trimmedName = originalName.trim();

	// 「オリジナル」の特殊処理
	if (trimmedName === "オリジナル") {
		if (cachedOriginal) {
			return {
				originalName: trimmedName,
				isOriginal: true,
				matchType: "exact" as const,
				candidates: [
					{
						id: cachedOriginal.id,
						name: cachedOriginal.name,
						nameJa: cachedOriginal.nameJa,
						officialWorkName: cachedOriginal.officialWorkName,
						matchType: "exact" as const,
					},
				],
				autoMatched: true,
				selectedId: cachedOriginal.id,
				customSongName: null,
			};
		}
	}

	// 完全一致検索
	const exactMatches = await exactSearchFromDb(trimmedName);
	if (exactMatches.length > 0) {
		const firstMatch = exactMatches[0];
		return {
			originalName: trimmedName,
			isOriginal: false,
			matchType: "exact" as const,
			candidates: exactMatches.map((song) => ({
				id: song.id,
				name: song.name,
				nameJa: song.nameJa,
				officialWorkName: song.officialWorkName,
				matchType: "exact" as const,
			})),
			autoMatched: true,
			// biome-ignore lint/style/noNonNullAssertion: exactMatches.length > 0 is guaranteed
			selectedId: firstMatch!.id,
			customSongName: null,
		};
	}

	// 部分一致検索
	const partialMatches = await partialSearchFromDb(trimmedName, candidateLimit);
	if (partialMatches.length > 0) {
		return {
			originalName: trimmedName,
			isOriginal: false,
			matchType: "partial" as const,
			candidates: partialMatches.map((song) => ({
				id: song.id,
				name: song.name,
				nameJa: song.nameJa,
				officialWorkName: song.officialWorkName,
				matchType: "partial" as const,
			})),
			autoMatched: false,
			selectedId: null,
			customSongName: null,
		};
	}

	// マッチなし → 「その他」に紐付け、customSongNameに原曲名を保存
	return {
		originalName: trimmedName,
		isOriginal: false,
		matchType: "none" as const,
		candidates: [],
		autoMatched: true,
		selectedId: OTHER_SONG_ID,
		customSongName: trimmedName,
	};
}
