/**
 * 検索クエリパーサー
 *
 * Meilisearch向けの検索クエリを解析し、フィルター条件とフルテキスト検索クエリに分離する
 */

/**
 * フィルター値（比較演算子付き）
 */
export interface FilterValue {
	op: "=" | ">=" | "<=" | ">" | "<";
	value: string | number;
}

/**
 * 解析された検索クエリ
 */
export interface ParsedSearchQuery {
	/** フィルター抽出後の残りテキスト（フルテキスト検索用） */
	fullTextQuery: string;
	/** 抽出されたフィルター条件 */
	filters: {
		arrangerNames?: string[];
		vocalistNames?: string[];
		lyricistNames?: string[];
		circleNames?: string[];
		composerNames?: string[];
		originalSongNames?: string[];
		releaseYear?: FilterValue;
		originalSongCount?: FilterValue;
		vocalistCount?: FilterValue;
		arrangerCount?: FilterValue;
		lyricistCount?: FilterValue;
		composerCount?: FilterValue;
		eventName?: string;
	};
}

/**
 * フィルターキーとプロパティ名のマッピング
 */
const FILTER_KEY_MAP: Record<
	string,
	{
		property: keyof ParsedSearchQuery["filters"];
		isNumeric: boolean;
		isArray: boolean;
		addToFullText?: boolean;
	}
> = {
	arranger: { property: "arrangerNames", isNumeric: false, isArray: true },
	vocalist: { property: "vocalistNames", isNumeric: false, isArray: true },
	lyricist: { property: "lyricistNames", isNumeric: false, isArray: true },
	circle: { property: "circleNames", isNumeric: false, isArray: true },
	composer: { property: "composerNames", isNumeric: false, isArray: true },
	originalsong: {
		property: "originalSongNames",
		isNumeric: false,
		isArray: true,
		addToFullText: false,
	},
	year: { property: "releaseYear", isNumeric: true, isArray: false },
	originalcount: {
		property: "originalSongCount",
		isNumeric: true,
		isArray: false,
	},
	vocalistcount: { property: "vocalistCount", isNumeric: true, isArray: false },
	arrangercount: { property: "arrangerCount", isNumeric: true, isArray: false },
	lyricistcount: { property: "lyricistCount", isNumeric: true, isArray: false },
	composercount: { property: "composerCount", isNumeric: true, isArray: false },
	event: {
		property: "eventName",
		isNumeric: false,
		isArray: false,
	},
};

/**
 * 比較演算子を解析
 */
function parseComparisonOperator(value: string): {
	op: FilterValue["op"];
	rawValue: string;
} {
	if (value.startsWith(">=")) {
		return { op: ">=", rawValue: value.slice(2) };
	}
	if (value.startsWith("<=")) {
		return { op: "<=", rawValue: value.slice(2) };
	}
	if (value.startsWith(">")) {
		return { op: ">", rawValue: value.slice(1) };
	}
	if (value.startsWith("<")) {
		return { op: "<", rawValue: value.slice(1) };
	}
	return { op: "=", rawValue: value };
}

/**
 * クォートされた値を抽出
 * "value" または 'value' 形式を処理
 */
function extractQuotedValue(
	query: string,
	startIndex: number,
): { value: string; endIndex: number } | null {
	const quoteChar = query[startIndex];
	if (quoteChar !== '"' && quoteChar !== "'") {
		return null;
	}

	let endIndex = startIndex + 1;
	while (endIndex < query.length && query[endIndex] !== quoteChar) {
		// エスケープ文字の処理
		if (query[endIndex] === "\\" && endIndex + 1 < query.length) {
			endIndex += 2;
			continue;
		}
		endIndex++;
	}

	if (endIndex >= query.length) {
		// 閉じクォートが見つからない場合は残り全体を値とする
		return {
			value: query.slice(startIndex + 1),
			endIndex: query.length,
		};
	}

	return {
		value: query.slice(startIndex + 1, endIndex),
		endIndex: endIndex + 1,
	};
}

/**
 * 非クォート値を抽出（スペースまで）
 */
function extractUnquotedValue(
	query: string,
	startIndex: number,
): { value: string; endIndex: number } {
	let endIndex = startIndex;
	while (endIndex < query.length && query[endIndex] !== " ") {
		endIndex++;
	}
	return {
		value: query.slice(startIndex, endIndex),
		endIndex,
	};
}

/**
 * 検索クエリを解析
 *
 * @param query - 検索クエリ文字列
 * @returns 解析結果（フルテキストクエリとフィルター）
 *
 * @example
 * parseSearchQuery("Bad Apple arranger:ARM year:2023")
 * // => { fullTextQuery: "Bad Apple", filters: { arrangerNames: ["ARM"], releaseYear: { op: "=", value: 2023 } } }
 *
 * @example
 * parseSearchQuery('circle:"COOL&CREATE"')
 * // => { fullTextQuery: "", filters: { circleNames: ["COOL&CREATE"] } }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
	const result: ParsedSearchQuery = {
		fullTextQuery: "",
		filters: {},
	};

	if (!query || query.trim().length === 0) {
		return result;
	}

	const normalizedQuery = query.trim();
	const fullTextParts: string[] = [];
	let i = 0;

	while (i < normalizedQuery.length) {
		// スペースをスキップ
		if (normalizedQuery[i] === " ") {
			i++;
			continue;
		}

		// フィルターキーを探す
		let foundFilter = false;
		for (const [key, config] of Object.entries(FILTER_KEY_MAP)) {
			const pattern = `${key}:`;
			if (
				normalizedQuery.slice(i, i + pattern.length).toLowerCase() === pattern
			) {
				// フィルターキーが見つかった
				const valueStartIndex = i + pattern.length;

				let extractedValue: string;
				let endIndex: number;

				// クォートされた値を処理
				if (
					normalizedQuery[valueStartIndex] === '"' ||
					normalizedQuery[valueStartIndex] === "'"
				) {
					const quoted = extractQuotedValue(normalizedQuery, valueStartIndex);
					if (quoted) {
						extractedValue = quoted.value;
						endIndex = quoted.endIndex;
					} else {
						// フォールバック
						const unquoted = extractUnquotedValue(
							normalizedQuery,
							valueStartIndex,
						);
						extractedValue = unquoted.value;
						endIndex = unquoted.endIndex;
					}
				} else {
					const unquoted = extractUnquotedValue(
						normalizedQuery,
						valueStartIndex,
					);
					extractedValue = unquoted.value;
					endIndex = unquoted.endIndex;
				}

				// originalsongの場合はフルテキストに追加
				if (config.addToFullText) {
					fullTextParts.push(extractedValue);
				} else if (config.isNumeric) {
					// 数値フィルターの処理
					const { op, rawValue } = parseComparisonOperator(extractedValue);
					const numValue = Number.parseInt(rawValue, 10);
					if (!Number.isNaN(numValue)) {
						(result.filters as Record<string, FilterValue>)[config.property] = {
							op,
							value: numValue,
						};
					}
				} else if (config.isArray) {
					// 配列フィルターの処理
					const arrayProp = config.property as
						| "arrangerNames"
						| "vocalistNames"
						| "lyricistNames"
						| "circleNames"
						| "composerNames"
						| "originalSongNames";
					const currentArray = result.filters[arrayProp] ?? [];
					currentArray.push(extractedValue);
					result.filters[arrayProp] = currentArray;
				} else {
					// 単一文字列フィルターの処理（eventName等）
					(result.filters as Record<string, string>)[config.property] =
						extractedValue;
				}

				i = endIndex;
				foundFilter = true;
				break;
			}
		}

		if (!foundFilter) {
			// フィルターキーではない場合、次のスペースまでを通常テキストとして取得
			let wordEnd = i;
			while (
				wordEnd < normalizedQuery.length &&
				normalizedQuery[wordEnd] !== " "
			) {
				wordEnd++;
			}
			const word = normalizedQuery.slice(i, wordEnd);
			if (word.length > 0) {
				fullTextParts.push(word);
			}
			i = wordEnd;
		}
	}

	result.fullTextQuery = fullTextParts.join(" ").trim();
	return result;
}

/**
 * 解析されたフィルターをMeilisearchフィルター文字列に変換
 *
 * @param filters - 解析されたフィルター
 * @returns Meilisearchフィルター文字列
 *
 * @example
 * buildMeilisearchFilter({ circleNames: ["IOSYS"] })
 * // => 'circleNames = "IOSYS"'
 *
 * @example
 * buildMeilisearchFilter({ releaseYear: { op: "=", value: 2023 }, arrangerNames: ["ARM"] })
 * // => 'releaseYear = 2023 AND arrangerNames = "ARM"'
 */
export function buildMeilisearchFilter(
	filters: ParsedSearchQuery["filters"],
): string {
	const conditions: string[] = [];

	// 配列フィルター（文字列型）
	const arrayFilters: Array<{
		key: keyof ParsedSearchQuery["filters"];
		values: string[] | undefined;
	}> = [
		{ key: "arrangerNames", values: filters.arrangerNames },
		{ key: "vocalistNames", values: filters.vocalistNames },
		{ key: "lyricistNames", values: filters.lyricistNames },
		{ key: "circleNames", values: filters.circleNames },
		{ key: "composerNames", values: filters.composerNames },
		{ key: "originalSongNames", values: filters.originalSongNames },
	];

	for (const { key, values } of arrayFilters) {
		if (values && values.length > 0) {
			for (const value of values) {
				// 値をエスケープしてダブルクォートで囲む
				const escapedValue = value.replace(/"/g, '\\"');
				conditions.push(`${key} = "${escapedValue}"`);
			}
		}
	}

	// 数値フィルター
	const numericFilters: Array<{
		key: keyof ParsedSearchQuery["filters"];
		filter: FilterValue | undefined;
	}> = [
		{ key: "releaseYear", filter: filters.releaseYear },
		{ key: "originalSongCount", filter: filters.originalSongCount },
		{ key: "vocalistCount", filter: filters.vocalistCount },
		{ key: "arrangerCount", filter: filters.arrangerCount },
		{ key: "lyricistCount", filter: filters.lyricistCount },
		{ key: "composerCount", filter: filters.composerCount },
	];

	for (const { key, filter } of numericFilters) {
		if (filter) {
			conditions.push(`${key} ${filter.op} ${filter.value}`);
		}
	}

	// 文字列フィルター（eventName）
	if (filters.eventName) {
		const escapedValue = filters.eventName.replace(/"/g, '\\"');
		conditions.push(`eventName = "${escapedValue}"`);
	}

	return conditions.join(" AND ");
}
