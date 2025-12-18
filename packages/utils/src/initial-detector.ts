/**
 * 頭文字の文字種
 */
export const INITIAL_SCRIPTS = [
	"latin",
	"hiragana",
	"katakana",
	"kanji",
	"digit",
	"symbol",
	"other",
] as const;

export type InitialScript = (typeof INITIAL_SCRIPTS)[number];

/**
 * 頭文字判定結果
 */
export interface InitialInfo {
	/** 文字種 */
	initialScript: InitialScript;
	/** 頭文字（latin/hiragana/katakanaのみ設定、他はnull） */
	nameInitial: string | null;
}

// 全角→半角変換マップ（ラテン文字）
const FULLWIDTH_TO_HALFWIDTH_LATIN: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
	// 大文字 Ａ-Ｚ (0xFF21-0xFF3A) → A-Z (0x41-0x5A)
	FULLWIDTH_TO_HALFWIDTH_LATIN[String.fromCharCode(0xff21 + i)] =
		String.fromCharCode(0x41 + i);
	// 小文字 ａ-ｚ (0xFF41-0xFF5A) → a-z (0x61-0x7A)
	FULLWIDTH_TO_HALFWIDTH_LATIN[String.fromCharCode(0xff41 + i)] =
		String.fromCharCode(0x61 + i);
}

// 全角→半角変換マップ（数字）
const FULLWIDTH_TO_HALFWIDTH_DIGIT: Record<string, string> = {};
for (let i = 0; i < 10; i++) {
	// ０-９ (0xFF10-0xFF19) → 0-9 (0x30-0x39)
	FULLWIDTH_TO_HALFWIDTH_DIGIT[String.fromCharCode(0xff10 + i)] =
		String.fromCharCode(0x30 + i);
}

// ワ行濁音→ひらがな変換マップ
const WA_GYOU_DAKUON_TO_HIRAGANA: Record<string, string> = {
	ヷ: "わ", // va → wa
	ヸ: "ゐ", // vi → wi
	ヹ: "ゑ", // ve → we
	ヺ: "を", // vo → wo
};

// カタカナ→ひらがな変換（0x30A1-0x30F6 → 0x3041-0x3096）
function katakanaToHiragana(char: string): string {
	// ワ行濁音
	if (WA_GYOU_DAKUON_TO_HIRAGANA[char]) {
		return WA_GYOU_DAKUON_TO_HIRAGANA[char];
	}
	const code = char.charCodeAt(0);
	// 全角カタカナ (ァ-ヶ: 0x30A1-0x30F6)
	if (code >= 0x30a1 && code <= 0x30f6) {
		return String.fromCharCode(code - 0x60);
	}
	return char;
}

// 半角カタカナ→ひらがな変換マップ
const HALFWIDTH_KATAKANA_TO_HIRAGANA: Record<string, string> = {
	ｦ: "を",
	ｧ: "ぁ",
	ｨ: "ぃ",
	ｩ: "ぅ",
	ｪ: "ぇ",
	ｫ: "ぉ",
	ｬ: "ゃ",
	ｭ: "ゅ",
	ｮ: "ょ",
	ｯ: "っ",
	ｰ: "ー",
	ｱ: "あ",
	ｲ: "い",
	ｳ: "う",
	ｴ: "え",
	ｵ: "お",
	ｶ: "か",
	ｷ: "き",
	ｸ: "く",
	ｹ: "け",
	ｺ: "こ",
	ｻ: "さ",
	ｼ: "し",
	ｽ: "す",
	ｾ: "せ",
	ｿ: "そ",
	ﾀ: "た",
	ﾁ: "ち",
	ﾂ: "つ",
	ﾃ: "て",
	ﾄ: "と",
	ﾅ: "な",
	ﾆ: "に",
	ﾇ: "ぬ",
	ﾈ: "ね",
	ﾉ: "の",
	ﾊ: "は",
	ﾋ: "ひ",
	ﾌ: "ふ",
	ﾍ: "へ",
	ﾎ: "ほ",
	ﾏ: "ま",
	ﾐ: "み",
	ﾑ: "む",
	ﾒ: "め",
	ﾓ: "も",
	ﾔ: "や",
	ﾕ: "ゆ",
	ﾖ: "よ",
	ﾗ: "ら",
	ﾘ: "り",
	ﾙ: "る",
	ﾚ: "れ",
	ﾛ: "ろ",
	ﾜ: "わ",
	ﾝ: "ん",
};

// 濁点・半濁点を除去して清音に変換
const VOICED_TO_UNVOICED: Record<string, string> = {
	// が行 → か行
	が: "か",
	ぎ: "き",
	ぐ: "く",
	げ: "け",
	ご: "こ",
	// ざ行 → さ行
	ざ: "さ",
	じ: "し",
	ず: "す",
	ぜ: "せ",
	ぞ: "そ",
	// だ行 → た行
	だ: "た",
	ぢ: "ち",
	づ: "つ",
	で: "て",
	ど: "と",
	// ば行 → は行
	ば: "は",
	び: "ひ",
	ぶ: "ふ",
	べ: "へ",
	ぼ: "ほ",
	// ぱ行 → は行
	ぱ: "は",
	ぴ: "ひ",
	ぷ: "ふ",
	ぺ: "へ",
	ぽ: "ほ",
	// ヴ → う
	ゔ: "う",
};

/**
 * 文字の種類を判定する
 */
function detectCharacterType(char: string): InitialScript {
	const code = char.charCodeAt(0);

	// 半角ラテン文字 A-Z, a-z
	if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a)) {
		return "latin";
	}

	// 全角ラテン文字 Ａ-Ｚ, ａ-ｚ
	if (
		(code >= 0xff21 && code <= 0xff3a) ||
		(code >= 0xff41 && code <= 0xff5a)
	) {
		return "latin";
	}

	// ひらがな (ぁ-ゖ: 0x3041-0x3096)
	if (code >= 0x3041 && code <= 0x3096) {
		return "hiragana";
	}

	// 全角カタカナ (ァ-ヶ: 0x30A1-0x30F6, ヷ-ヺ: 0x30F7-0x30FA)
	if (
		(code >= 0x30a1 && code <= 0x30f6) ||
		(code >= 0x30f7 && code <= 0x30fa)
	) {
		return "katakana";
	}

	// 半角カタカナ (ｦ-ﾝ: 0xFF66-0xFF9D)
	if (code >= 0xff66 && code <= 0xff9d) {
		return "katakana";
	}

	// 漢字 (CJK統合漢字: 0x4E00-0x9FFF, 拡張A: 0x3400-0x4DBF)
	if (
		(code >= 0x4e00 && code <= 0x9fff) ||
		(code >= 0x3400 && code <= 0x4dbf)
	) {
		return "kanji";
	}

	// 半角数字 0-9
	if (code >= 0x30 && code <= 0x39) {
		return "digit";
	}

	// 全角数字 ０-９
	if (code >= 0xff10 && code <= 0xff19) {
		return "digit";
	}

	// 空白・記号類
	if (
		code <= 0x7f || // ASCII制御文字・記号
		(code >= 0x2000 && code <= 0x206f) || // 一般句読点
		(code >= 0x3000 && code <= 0x303f) || // CJK記号・句読点
		code === 0x30fb || // カタカナ中点「・」
		(code >= 0xff00 && code <= 0xff0f) || // 全角記号
		(code >= 0xff1a && code <= 0xff20) || // 全角記号
		(code >= 0xff5b && code <= 0xff65) // 全角記号
	) {
		return "symbol";
	}

	return "other";
}

/**
 * 頭文字を正規化する
 * - ラテン文字: 半角大文字に変換
 * - ひらがな: 濁点・半濁点を除去
 * - カタカナ: ひらがなに変換後、濁点・半濁点を除去
 */
function normalizeInitial(char: string, script: InitialScript): string | null {
	// 漢字・数字・記号・その他は頭文字を設定しない
	if (
		script === "kanji" ||
		script === "digit" ||
		script === "symbol" ||
		script === "other"
	) {
		return null;
	}

	if (script === "latin") {
		// 全角→半角変換
		const halfwidth = FULLWIDTH_TO_HALFWIDTH_LATIN[char] ?? char;
		// 大文字に変換
		return halfwidth.toUpperCase();
	}

	let hiragana: string;

	if (script === "katakana") {
		// 半角カタカナ→ひらがな
		if (HALFWIDTH_KATAKANA_TO_HIRAGANA[char]) {
			hiragana = HALFWIDTH_KATAKANA_TO_HIRAGANA[char];
		} else {
			// 全角カタカナ→ひらがな
			hiragana = katakanaToHiragana(char);
		}
	} else {
		// すでにひらがな
		hiragana = char;
	}

	// 濁点・半濁点を除去して清音に変換
	return VOICED_TO_UNVOICED[hiragana] ?? hiragana;
}

/**
 * 名前から頭文字の文字種と頭文字を判定する
 *
 * @param name - 判定対象の名前
 * @returns 頭文字情報（文字種と頭文字）
 *
 * @example
 * ```typescript
 * detectInitial("Beatles")      // { initialScript: "latin", nameInitial: "B" }
 * detectInitial("ぴあの")        // { initialScript: "hiragana", nameInitial: "ひ" }
 * detectInitial("ピアノ")        // { initialScript: "katakana", nameInitial: "ひ" }
 * detectInitial("上海アリス")    // { initialScript: "kanji", nameInitial: null }
 * ```
 */
export function detectInitial(name: string): InitialInfo {
	// 空文字列の場合
	if (!name || name.length === 0) {
		return {
			initialScript: "other",
			nameInitial: null,
		};
	}

	// 先頭1文字を取得
	const firstChar = name.charAt(0);

	// 文字種を判定
	const initialScript = detectCharacterType(firstChar);

	// 頭文字を正規化
	const nameInitial = normalizeInitial(firstChar, initialScript);

	return {
		initialScript,
		nameInitial,
	};
}
