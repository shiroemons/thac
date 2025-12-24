/**
 * 原曲マッチャー
 *
 * CSV内の原曲名と公式楽曲データベースをマッチングするためのサービス。
 * 完全一致 → 部分一致 の段階的マッチングを行う。
 */

/**
 * 「その他」公式楽曲のID
 * マッチしない原曲はこのIDに紐付け、customSongNameに原曲名を保存する
 */
export const OTHER_SONG_ID = "07999999";

export interface SongCandidate {
	id: string;
	name: string;
	nameJa: string;
	officialWorkName: string | null;
	matchType: "exact" | "partial" | "none";
}

export interface SongMatchResult {
	originalName: string;
	isOriginal: boolean;
	matchType: "exact" | "partial" | "none";
	candidates: SongCandidate[];
	autoMatched: boolean;
	selectedId: string | null;
	/** マッチしない原曲の場合、customSongNameに原曲名を保存する */
	customSongName: string | null;
}

export interface OfficialSongData {
	id: string;
	name: string;
	nameJa: string;
	isOriginal: boolean;
	officialWorkName: string | null;
}

export type ExactSearchFn = (name: string) => OfficialSongData[];
export type PartialSearchFn = (
	name: string,
	limit: number,
) => OfficialSongData[];
export type FindOriginalFn = () => OfficialSongData | null;

export interface SongMatcher {
	matchSongs(originalNames: string[]): Promise<SongMatchResult[]>;
}

/**
 * 原曲マッチャーを作成する
 *
 * @param exactSearch 完全一致検索関数
 * @param partialSearch 部分一致検索関数
 * @param findOriginal オリジナルレコード検索関数
 * @param candidateLimit 部分一致候補の最大数（デフォルト: 10）
 */
export function createSongMatcher(
	exactSearch: ExactSearchFn,
	partialSearch: PartialSearchFn,
	findOriginal: FindOriginalFn,
	candidateLimit = 10,
): SongMatcher {
	return {
		async matchSongs(originalNames: string[]): Promise<SongMatchResult[]> {
			const results: SongMatchResult[] = [];

			for (const name of originalNames) {
				const result = await matchSingleSong(
					name,
					exactSearch,
					partialSearch,
					findOriginal,
					candidateLimit,
				);
				results.push(result);
			}

			return results;
		},
	};
}

async function matchSingleSong(
	originalName: string,
	exactSearch: ExactSearchFn,
	partialSearch: PartialSearchFn,
	findOriginal: FindOriginalFn,
	candidateLimit: number,
): Promise<SongMatchResult> {
	// 空文字列の場合はスキップ
	if (!originalName || originalName.trim() === "") {
		return {
			originalName,
			isOriginal: false,
			matchType: "none",
			candidates: [],
			autoMatched: false,
			selectedId: null,
			customSongName: null,
		};
	}

	const trimmedName = originalName.trim();

	// 「オリジナル」の特殊処理
	if (trimmedName === "オリジナル") {
		const originalRecord = findOriginal();
		if (originalRecord) {
			return {
				originalName: trimmedName,
				isOriginal: true,
				matchType: "exact",
				candidates: [
					{
						id: originalRecord.id,
						name: originalRecord.name,
						nameJa: originalRecord.nameJa,
						officialWorkName: originalRecord.officialWorkName,
						matchType: "exact",
					},
				],
				autoMatched: true,
				selectedId: originalRecord.id,
				customSongName: null,
			};
		}
	}

	// 完全一致検索
	const exactMatches = exactSearch(trimmedName);
	if (exactMatches.length > 0) {
		const firstMatch = exactMatches[0];
		return {
			originalName: trimmedName,
			isOriginal: false,
			matchType: "exact",
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
	const partialMatches = partialSearch(trimmedName, candidateLimit);
	if (partialMatches.length > 0) {
		return {
			originalName: trimmedName,
			isOriginal: false,
			matchType: "partial",
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
		matchType: "none",
		candidates: [],
		autoMatched: true,
		selectedId: OTHER_SONG_ID,
		customSongName: trimmedName,
	};
}
