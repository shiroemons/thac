/**
 * かな行判定ユーティリティ
 *
 * nameInitial は DB 登録時に正規化済み（清音ひらがな）のため、
 * シンプルな判定が可能。
 *
 * 正規化ルール（packages/utils/src/initial-detector.ts）:
 * - カタカナ → ひらがなに変換
 * - 濁音・半濁音 → 清音に変換
 * 例: "ピアノ" → "ひ", "ガンダム" → "か"
 */

/** かな行の型 */
export type KanaRow =
	| "あ"
	| "か"
	| "さ"
	| "た"
	| "な"
	| "は"
	| "ま"
	| "や"
	| "ら"
	| "わ";

/** かな行の配列（UI表示用） */
export const KANA_ROWS: readonly KanaRow[] = [
	"あ",
	"か",
	"さ",
	"た",
	"な",
	"は",
	"ま",
	"や",
	"ら",
	"わ",
] as const;

/** かな行のラベル */
export const KANA_ROW_LABELS: Record<KanaRow, string> = {
	あ: "あ行",
	か: "か行",
	さ: "さ行",
	た: "た行",
	な: "な行",
	は: "は行",
	ま: "ま行",
	や: "や行",
	ら: "ら行",
	わ: "わ行",
};

/** 行ごとの文字一覧（清音ひらがなのみ - DBで正規化済み） */
const KANA_ROW_CHARS: Record<KanaRow, readonly string[]> = {
	あ: ["あ", "い", "う", "え", "お"],
	か: ["か", "き", "く", "け", "こ"], // が行は既に「か」に正規化済み
	さ: ["さ", "し", "す", "せ", "そ"], // ざ行は既に「さ」に正規化済み
	た: ["た", "ち", "つ", "て", "と"], // だ行は既に「た」に正規化済み
	な: ["な", "に", "ぬ", "ね", "の"],
	は: ["は", "ひ", "ふ", "へ", "ほ"], // ば・ぱ行は既に「は」に正規化済み
	ま: ["ま", "み", "む", "め", "も"],
	や: ["や", "ゆ", "よ"],
	ら: ["ら", "り", "る", "れ", "ろ"],
	わ: ["わ", "を", "ん"],
};

/**
 * nameInitial（清音ひらがな）がどの行に属するか判定
 * @param nameInitial - DBに保存されている頭文字（正規化済み）
 * @returns 対応するかな行、または null
 */
export function getKanaRow(
	nameInitial: string | null | undefined,
): KanaRow | null {
	if (!nameInitial) return null;

	for (const row of KANA_ROWS) {
		if (KANA_ROW_CHARS[row].includes(nameInitial)) {
			return row;
		}
	}
	return null;
}

/**
 * 指定した行に属するかチェック
 * @param nameInitial - DBに保存されている頭文字（正規化済み）
 * @param row - チェックするかな行
 * @returns 指定した行に属する場合 true
 */
export function isInKanaRow(
	nameInitial: string | null | undefined,
	row: KanaRow,
): boolean {
	if (!nameInitial) return false;
	return KANA_ROW_CHARS[row]?.includes(nameInitial) ?? false;
}

/**
 * かな行が有効かどうか判定
 * @param value - 検証する値
 * @returns 有効なかな行の場合 true
 */
export function isValidKanaRow(value: unknown): value is KanaRow {
	return typeof value === "string" && KANA_ROWS.includes(value as KanaRow);
}
