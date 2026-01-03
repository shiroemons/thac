/**
 * 文字種フィルターユーティリティ
 *
 * UI表示用のカテゴリとDBスキーマのinitialScriptのマッピング、
 * およびバリデーション関数を提供。
 */

import { isValidKanaRow, type KanaRow } from "./kana-utils";

// =============================================================================
// 型定義
// =============================================================================

/** UI表示用の文字種カテゴリ */
export type ScriptCategory = "all" | "symbol" | "alphabet" | "kana" | "kanji";

/** DBスキーマの文字種（packages/db/src/schema/artist-circle.ts と同期） */
export type InitialScript =
	| "latin"
	| "hiragana"
	| "katakana"
	| "kanji"
	| "digit"
	| "symbol"
	| "other";

/** 英字頭文字（A-Z） */
export type AlphabetInitial =
	| "A"
	| "B"
	| "C"
	| "D"
	| "E"
	| "F"
	| "G"
	| "H"
	| "I"
	| "J"
	| "K"
	| "L"
	| "M"
	| "N"
	| "O"
	| "P"
	| "Q"
	| "R"
	| "S"
	| "T"
	| "U"
	| "V"
	| "W"
	| "X"
	| "Y"
	| "Z";

/** サブフィルター（2段目選択） */
export type SubFilter = AlphabetInitial | KanaRow | null;

// =============================================================================
// 定数
// =============================================================================

/** 文字種カテゴリの配列 */
export const SCRIPT_CATEGORIES: readonly ScriptCategory[] = [
	"all",
	"symbol",
	"alphabet",
	"kana",
	"kanji",
] as const;

/** 英字頭文字の配列 */
export const ALPHABET_INITIALS: readonly AlphabetInitial[] = [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
] as const;

/** 文字種カテゴリのラベル */
export const SCRIPT_CATEGORY_LABELS: Record<ScriptCategory, string> = {
	all: "すべて",
	symbol: "記号・数字",
	alphabet: "英字",
	kana: "かな",
	kanji: "漢字",
};

// =============================================================================
// UI ↔ DB マッピング
// =============================================================================

/**
 * UIカテゴリに対応するDBのinitialScript値を取得
 *
 * | UI カテゴリ | DB initialScript |
 * |------------|------------------|
 * | `all`      | 全て             |
 * | `symbol`   | digit + symbol + other |
 * | `alphabet` | latin            |
 * | `kana`     | hiragana + katakana |
 * | `kanji`    | kanji            |
 */
export function getInitialScripts(category: ScriptCategory): InitialScript[] {
	switch (category) {
		case "alphabet":
			return ["latin"];
		case "kana":
			return ["hiragana", "katakana"];
		case "kanji":
			return ["kanji"];
		case "symbol":
			return ["digit", "symbol", "other"];
		default:
			return [];
	}
}

/**
 * DBのinitialScriptからUIカテゴリを取得
 */
export function getScriptCategory(
	initialScript: InitialScript,
): Exclude<ScriptCategory, "all"> {
	switch (initialScript) {
		case "latin":
			return "alphabet";
		case "hiragana":
		case "katakana":
			return "kana";
		case "kanji":
			return "kanji";
		case "digit":
		case "symbol":
		case "other":
			return "symbol";
	}
}

// =============================================================================
// バリデーション関数
// =============================================================================

/**
 * 有効な文字種カテゴリか判定
 */
export function isValidScriptCategory(value: unknown): value is ScriptCategory {
	return (
		typeof value === "string" &&
		SCRIPT_CATEGORIES.includes(value as ScriptCategory)
	);
}

/**
 * 有効な英字頭文字か判定
 */
export function isValidAlphabetInitial(
	value: unknown,
): value is AlphabetInitial {
	if (typeof value !== "string") return false;
	const upper = value.toUpperCase();
	return ALPHABET_INITIALS.includes(upper as AlphabetInitial);
}

/**
 * 有効なサブフィルターか判定
 */
export function isValidSubFilter(
	value: unknown,
	scriptCategory: ScriptCategory,
): value is SubFilter {
	if (value === null || value === undefined) return true;

	if (scriptCategory === "alphabet") {
		return isValidAlphabetInitial(value);
	}
	if (scriptCategory === "kana") {
		return isValidKanaRow(value);
	}
	return false;
}

// =============================================================================
// URL パラメータ用ヘルパー
// =============================================================================

/**
 * URLパラメータをパースして文字種カテゴリを取得
 */
export function parseScriptParam(value: unknown): ScriptCategory {
	return isValidScriptCategory(value) ? value : "all";
}

/**
 * URLパラメータをパースして英字頭文字を取得
 */
export function parseInitialParam(value: unknown): AlphabetInitial | undefined {
	if (!value) return undefined;
	if (typeof value !== "string") return undefined;
	const upper = value.toUpperCase();
	return isValidAlphabetInitial(upper) ? (upper as AlphabetInitial) : undefined;
}

/**
 * URLパラメータをパースしてかな行を取得
 */
export function parseRowParam(value: unknown): KanaRow | undefined {
	if (!value) return undefined;
	return isValidKanaRow(value) ? value : undefined;
}

/**
 * URLパラメータをパースしてページ番号を取得
 */
export function parsePageParam(value: unknown): number {
	if (typeof value === "number" && value > 0) return Math.floor(value);
	if (typeof value === "string") {
		const num = Number.parseInt(value, 10);
		if (!Number.isNaN(num) && num > 0) return num;
	}
	return 1;
}

// Re-export from kana-utils for convenience
export {
	isValidKanaRow,
	KANA_ROW_LABELS,
	KANA_ROWS,
	type KanaRow,
} from "./kana-utils";
