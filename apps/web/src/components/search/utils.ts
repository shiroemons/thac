/**
 * 詳細検索フィルターのユーティリティ関数
 */

import type {
	AdvancedSearchFilters,
	CreditRole,
	RoleCountEntry,
	RoleCountFilters,
	RoleCountMatchType,
	SelectedArtist,
	SelectedCircle,
	SelectedEvent,
	SelectedGenre,
	SelectedOriginalSong,
	SelectedTag,
	TextSearchFilters,
} from "./types";
import {
	DEFAULT_FILTERS,
	DEFAULT_ROLE_COUNTS,
	DEFAULT_TEXT_SEARCH,
} from "./types";

// =============================================================================
// URL パラメータ変換
// =============================================================================

/**
 * AdvancedSearchFilters を URL search params に変換
 * 検索状態の共有・ブックマーク用
 */
export function filtersToSearchParams(
	filters: AdvancedSearchFilters,
): URLSearchParams {
	const params = new URLSearchParams();

	// テキスト検索
	if (filters.textSearch.artistName) {
		params.set("artistName", filters.textSearch.artistName);
	}
	if (filters.textSearch.circleName) {
		params.set("circleName", filters.textSearch.circleName);
	}
	if (filters.textSearch.albumName) {
		params.set("albumName", filters.textSearch.albumName);
	}
	if (filters.textSearch.trackName) {
		params.set("trackName", filters.textSearch.trackName);
	}

	// 原曲（ID:名前:作品名:カテゴリ名 形式）
	if (filters.originalSongs.length > 0) {
		const originalSongValues = filters.originalSongs.map(
			(song) =>
				`${song.id}:${encodeURIComponent(song.name)}:${encodeURIComponent(song.workName || "")}:${encodeURIComponent(song.categoryName || "")}`,
		);
		params.set("originalSongs", originalSongValues.join(","));
	}

	// アーティスト（ID:名前:役割 形式）
	if (filters.artists.length > 0) {
		const artistValues = filters.artists.map(
			(artist) =>
				`${artist.id}:${encodeURIComponent(artist.name)}:${artist.role}`,
		);
		params.set("artists", artistValues.join(","));
	}

	// サークル（ID:名前 形式）
	if (filters.circles.length > 0) {
		const circleValues = filters.circles.map(
			(circle) => `${circle.id}:${encodeURIComponent(circle.name)}`,
		);
		params.set("circles", circleValues.join(","));
	}

	// ジャンル（code:名前:色 形式）
	if (filters.genres.length > 0) {
		const genreValues = filters.genres.map(
			(genre) =>
				`${genre.code}:${encodeURIComponent(genre.name)}:${encodeURIComponent(genre.color)}`,
		);
		params.set("genres", genreValues.join(","));
	}

	// タグ（ID:名前 形式）
	if (filters.tags.length > 0) {
		const tagValues = filters.tags.map(
			(tag) => `${tag.id}:${encodeURIComponent(tag.name)}`,
		);
		params.set("tags", tagValues.join(","));
	}

	// 役割者数フィルター
	const roleCountKeys: (keyof RoleCountFilters)[] = [
		"vocalistCount",
		"lyricistCount",
		"composerCount",
		"arrangerCount",
	];
	for (const key of roleCountKeys) {
		const value = filters.roleCounts[key];
		if (value !== "any") {
			// count:matchType 形式
			params.set(key, `${value.count}:${value.matchType}`);
		}
	}

	// 原曲数フィルター
	if (filters.songCount !== "any") {
		params.set("songCount", String(filters.songCount));
	}

	// 日付範囲
	if (filters.dateRange.from) {
		params.set("dateFrom", filters.dateRange.from);
	}
	if (filters.dateRange.to) {
		params.set("dateTo", filters.dateRange.to);
	}

	// イベント
	if (filters.event) {
		// ID:名前:シリーズID:シリーズ名 形式
		params.set(
			"event",
			`${filters.event.id}:${encodeURIComponent(filters.event.name)}:${filters.event.seriesId || ""}:${encodeURIComponent(filters.event.seriesName || "")}`,
		);
	}

	return params;
}

/**
 * URL search params を AdvancedSearchFilters に変換
 * URL からの検索状態復元用
 */
export function searchParamsToFilters(
	params: URLSearchParams,
): Partial<AdvancedSearchFilters> {
	const filters: Partial<AdvancedSearchFilters> = {};

	// テキスト検索
	const textSearch: Partial<TextSearchFilters> = {};
	const artistName = params.get("artistName");
	const circleName = params.get("circleName");
	const albumName = params.get("albumName");
	const trackName = params.get("trackName");

	if (artistName) textSearch.artistName = artistName;
	if (circleName) textSearch.circleName = circleName;
	if (albumName) textSearch.albumName = albumName;
	if (trackName) textSearch.trackName = trackName;

	if (Object.keys(textSearch).length > 0) {
		filters.textSearch = { ...DEFAULT_TEXT_SEARCH, ...textSearch };
	}

	// 原曲
	const originalSongsParam = params.get("originalSongs");
	if (originalSongsParam) {
		filters.originalSongs = originalSongsParam.split(",").map((item) => {
			const [id, name, workName, categoryName] = item.split(":");
			return {
				id,
				name: decodeURIComponent(name || ""),
				workName: workName ? decodeURIComponent(workName) : undefined,
				categoryName: categoryName
					? decodeURIComponent(categoryName)
					: undefined,
			} satisfies SelectedOriginalSong;
		});
	}

	// アーティスト
	const artistsParam = params.get("artists");
	if (artistsParam) {
		filters.artists = artistsParam.split(",").map((item) => {
			const [id, name, role] = item.split(":");
			return {
				id,
				name: decodeURIComponent(name || ""),
				role: role as CreditRole,
			} satisfies SelectedArtist;
		});
	}

	// サークル
	const circlesParam = params.get("circles");
	if (circlesParam) {
		filters.circles = circlesParam.split(",").map((item) => {
			const [id, name] = item.split(":");
			return {
				id,
				name: decodeURIComponent(name || ""),
			} satisfies SelectedCircle;
		});
	}

	// ジャンル
	const genresParam = params.get("genres");
	if (genresParam) {
		filters.genres = genresParam.split(",").map((item) => {
			const [code, name, color] = item.split(":");
			return {
				code,
				name: decodeURIComponent(name || ""),
				color: decodeURIComponent(color || ""),
			} satisfies SelectedGenre;
		});
	}

	// タグ
	const tagsParam = params.get("tags");
	if (tagsParam) {
		filters.tags = tagsParam.split(",").map((item) => {
			const [id, name] = item.split(":");
			return {
				id,
				name: decodeURIComponent(name || ""),
			} satisfies SelectedTag;
		});
	}

	// 役割者数フィルター
	const roleCounts: Partial<RoleCountFilters> = {};
	const roleCountKeys: (keyof RoleCountFilters)[] = [
		"vocalistCount",
		"lyricistCount",
		"composerCount",
		"arrangerCount",
	];
	for (const key of roleCountKeys) {
		const value = params.get(key);
		if (value) {
			const [count, matchType] = value.split(":");
			roleCounts[key] = {
				count: Number.parseInt(count, 10),
				matchType: matchType as RoleCountMatchType,
			} satisfies RoleCountEntry;
		}
	}
	if (Object.keys(roleCounts).length > 0) {
		filters.roleCounts = { ...DEFAULT_ROLE_COUNTS, ...roleCounts };
	}

	// 原曲数フィルター
	const songCountParam = params.get("songCount");
	if (songCountParam) {
		if (
			songCountParam === "1" ||
			songCountParam === "2" ||
			songCountParam === "3+"
		) {
			filters.songCount = songCountParam;
		} else {
			const num = Number.parseInt(songCountParam, 10);
			if (!Number.isNaN(num)) {
				filters.songCount = num;
			}
		}
	}

	// 日付範囲
	const dateFrom = params.get("dateFrom");
	const dateTo = params.get("dateTo");
	if (dateFrom || dateTo) {
		filters.dateRange = {};
		if (dateFrom) filters.dateRange.from = dateFrom;
		if (dateTo) filters.dateRange.to = dateTo;
	}

	// イベント
	const eventParam = params.get("event");
	if (eventParam) {
		const [id, name, seriesId, seriesName] = eventParam.split(":");
		filters.event = {
			id,
			name: decodeURIComponent(name || ""),
			seriesId: seriesId || undefined,
			seriesName: seriesName ? decodeURIComponent(seriesName) : undefined,
		} satisfies SelectedEvent;
	}

	return filters;
}

// =============================================================================
// 検索クエリ文字列変換
// =============================================================================

/**
 * フィルターから検索クエリ文字列を構築
 * テキスト入力とフィルター構文を組み合わせる（例: "keyword arranger:ARM year:2023"）
 *
 * バックエンドパーサーがサポートする構文:
 * - arranger:VALUE, vocalist:VALUE, lyricist:VALUE, composer:VALUE - 役割別アーティスト
 * - circle:VALUE - サークル名
 * - originalsong:VALUE - 原曲名（全文検索に追加）
 * - year:VALUE (>=, <= サポート) - リリース年
 * - originalcount:VALUE (>=, <= サポート) - 原曲数
 * - vocalistcount:VALUE, arrangercount:VALUE, lyricistcount:VALUE, composercount:VALUE - 役割者数
 * - event:"イベント名" - イベント名
 */
export function buildSearchQueryString(
	textQuery: string,
	filters: AdvancedSearchFilters,
): string {
	const fulltextParts: string[] = [];
	const filterParts: string[] = [];

	// メインテキストクエリ
	if (textQuery.trim()) {
		fulltextParts.push(textQuery.trim());
	}

	// テキスト検索フィルター
	// artistName, albumName, trackName はフィルター構文がないため全文検索に追加
	if (filters.textSearch.artistName) {
		fulltextParts.push(filters.textSearch.artistName);
	}
	if (filters.textSearch.albumName) {
		fulltextParts.push(filters.textSearch.albumName);
	}
	if (filters.textSearch.trackName) {
		fulltextParts.push(filters.textSearch.trackName);
	}
	// circleName は circle: 構文を使用
	if (filters.textSearch.circleName) {
		filterParts.push(
			`circle:"${escapeQueryValue(filters.textSearch.circleName)}"`,
		);
	}

	// 原曲フィルター (originalsong: 構文)
	for (const song of filters.originalSongs) {
		filterParts.push(`originalsong:"${escapeQueryValue(song.name)}"`);
	}

	// アーティストフィルター（役割別）
	// サポートされる役割: vocalist, lyricist, arranger, composer
	for (const artist of filters.artists) {
		const roleKey = getRoleQueryKey(artist.role);
		if (roleKey) {
			filterParts.push(`${roleKey}:"${escapeQueryValue(artist.name)}"`);
		}
	}

	// サークルフィルター
	for (const circle of filters.circles) {
		filterParts.push(`circle:"${escapeQueryValue(circle.name)}"`);
	}

	// ジャンルフィルター (genre: 構文)
	for (const genre of filters.genres) {
		filterParts.push(`genre:"${escapeQueryValue(genre.name)}"`);
	}

	// タグフィルター (#タグ 構文)
	for (const tag of filters.tags) {
		filterParts.push(`#${escapeTagValue(tag.name)}`);
	}

	// 役割者数フィルター (vocalistcount, arrangercount, lyricistcount, composercount)
	const roleCountParts = buildRoleCountQueryParts(filters.roleCounts);
	filterParts.push(...roleCountParts);

	// 原曲数フィルター (originalcount: 構文)
	if (filters.songCount !== "any") {
		if (filters.songCount === "3+") {
			filterParts.push("originalcount:>=3");
		} else {
			filterParts.push(`originalcount:${filters.songCount}`);
		}
	}

	// 日付範囲フィルター (year: 構文、年のみ抽出)
	if (filters.dateRange.from || filters.dateRange.to) {
		const yearParts = buildYearQueryParts(filters.dateRange);
		filterParts.push(...yearParts);
	}

	// イベントフィルター (event:"イベント名" 構文、名前を使用)
	if (filters.event?.name) {
		filterParts.push(`event:"${escapeQueryValue(filters.event.name)}"`);
	}

	// 全文検索パーツとフィルターパーツを結合
	const allParts = [...fulltextParts, ...filterParts];
	return allParts.join(" ");
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * クエリ値のエスケープ
 * ダブルクォート内で使用する値をエスケープ
 */
function escapeQueryValue(value: string): string {
	return value.replace(/"/g, '\\"');
}

/**
 * タグ値のエスケープ
 * スペースを含む場合はダブルクォートで囲む
 */
function escapeTagValue(value: string): string {
	if (value.includes(" ")) {
		return `"${escapeQueryValue(value)}"`;
	}
	return value;
}

/**
 * 役割からクエリキーを取得
 * バックエンドがサポートする役割のみキーを返す
 * サポート外の役割は null を返す
 */
function getRoleQueryKey(role: CreditRole): string | null {
	// バックエンドがサポートする役割のみ
	const supportedRoles: Partial<Record<CreditRole, string>> = {
		vocalist: "vocalist",
		lyricist: "lyricist",
		arranger: "arranger",
		composer: "composer",
	};
	return supportedRoles[role] ?? null;
}

/**
 * 役割者数フィルターのクエリパーツを構築
 * バックエンド構文: vocalistcount, arrangercount, lyricistcount, composercount
 */
function buildRoleCountQueryParts(roleCounts: RoleCountFilters): string[] {
	const parts: string[] = [];

	// バックエンドのキー名に合わせる (xxxcount 形式)
	const roleCountKeyMap: Record<keyof RoleCountFilters, string> = {
		vocalistCount: "vocalistcount",
		lyricistCount: "lyricistcount",
		composerCount: "composercount",
		arrangerCount: "arrangercount",
	};

	for (const [key, queryKey] of Object.entries(roleCountKeyMap)) {
		const value = roleCounts[key as keyof RoleCountFilters];
		if (value !== "any") {
			const entry = value as RoleCountEntry;
			const operator = getMatchTypeOperator(entry.matchType);
			parts.push(`${queryKey}:${operator}${entry.count}`);
		}
	}

	return parts;
}

/**
 * マッチタイプから演算子を取得
 */
function getMatchTypeOperator(matchType: RoleCountMatchType): string {
	switch (matchType) {
		case "exact":
			return "";
		case "gte":
			return ">=";
		case "lte":
			return "<=";
		default:
			return "";
	}
}

/**
 * 日付範囲から年のクエリパーツを構築
 * バックエンド構文: year:>=YYYY, year:<=YYYY
 * 日付文字列から年のみを抽出して使用
 */
function buildYearQueryParts(dateRange: {
	from?: string;
	to?: string;
}): string[] {
	const parts: string[] = [];

	// 日付文字列から年を抽出 (例: "2023-01" → "2023")
	const extractYear = (dateStr: string): string | null => {
		const match = dateStr.match(/^(\d{4})/);
		return match ? match[1] : null;
	};

	if (dateRange.from) {
		const fromYear = extractYear(dateRange.from);
		if (fromYear) {
			parts.push(`year:>=${fromYear}`);
		}
	}

	if (dateRange.to) {
		const toYear = extractYear(dateRange.to);
		if (toYear) {
			parts.push(`year:<=${toYear}`);
		}
	}

	return parts;
}

// =============================================================================
// フィルター状態のマージ
// =============================================================================

/**
 * デフォルトフィルターと部分フィルターをマージ
 */
export function mergeFiltersWithDefaults(
	partial: Partial<AdvancedSearchFilters>,
): AdvancedSearchFilters {
	return {
		textSearch: partial.textSearch ?? DEFAULT_FILTERS.textSearch,
		originalSongs: partial.originalSongs ?? DEFAULT_FILTERS.originalSongs,
		artists: partial.artists ?? DEFAULT_FILTERS.artists,
		circles: partial.circles ?? DEFAULT_FILTERS.circles,
		genres: partial.genres ?? DEFAULT_FILTERS.genres,
		tags: partial.tags ?? DEFAULT_FILTERS.tags,
		roleCounts: partial.roleCounts ?? DEFAULT_FILTERS.roleCounts,
		songCount: partial.songCount ?? DEFAULT_FILTERS.songCount,
		dateRange: partial.dateRange ?? DEFAULT_FILTERS.dateRange,
		event: partial.event ?? DEFAULT_FILTERS.event,
	};
}

/**
 * フィルターが空かどうかをチェック
 */
export function isFiltersEmpty(filters: AdvancedSearchFilters): boolean {
	const {
		textSearch,
		originalSongs,
		artists,
		circles,
		genres,
		tags,
		roleCounts,
		songCount,
		dateRange,
		event,
	} = filters;

	// テキスト検索が空か
	const isTextSearchEmpty =
		!textSearch.artistName &&
		!textSearch.circleName &&
		!textSearch.albumName &&
		!textSearch.trackName;

	// 役割者数が全て any か
	const isRoleCountsEmpty =
		roleCounts.vocalistCount === "any" &&
		roleCounts.lyricistCount === "any" &&
		roleCounts.composerCount === "any" &&
		roleCounts.arrangerCount === "any";

	return (
		isTextSearchEmpty &&
		originalSongs.length === 0 &&
		artists.length === 0 &&
		circles.length === 0 &&
		genres.length === 0 &&
		tags.length === 0 &&
		isRoleCountsEmpty &&
		songCount === "any" &&
		!dateRange.from &&
		!dateRange.to &&
		!event
	);
}
