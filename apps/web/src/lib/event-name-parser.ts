/**
 * イベント名からシリーズと回次を推察するユーティリティ
 */

// 漢数字のマッピング（通常の漢数字 + 大字）
const KANJI_DIGITS: Record<string, number> = {
	// 0
	零: 0,
	〇: 0,
	// 1
	一: 1,
	壱: 1,
	壹: 1,
	// 2
	二: 2,
	弐: 2,
	貳: 2,
	貮: 2,
	// 3
	三: 3,
	参: 3,
	參: 3,
	// 4
	四: 4,
	肆: 4,
	// 5
	五: 5,
	伍: 5,
	// 6
	六: 6,
	陸: 6,
	// 7
	七: 7,
	漆: 7,
	柒: 7,
	質: 7,
	// 8
	八: 8,
	捌: 8,
	// 9
	九: 9,
	玖: 9,
	// 10, 100, 1000
	十: 10,
	拾: 10,
	百: 100,
	佰: 100,
	千: 1000,
	仟: 1000,
};

/**
 * 漢数字をアラビア数字に変換
 * 0は回次として不適切なためnullを返す
 */
export function kanjiToNumber(text: string): number | null {
	// 単純な漢数字（一〜九、壱〜参など）
	if (text.length === 1 && KANJI_DIGITS[text] !== undefined) {
		const value = KANJI_DIGITS[text];
		return value > 0 ? value : null;
	}

	// 「十」を含む漢数字の処理（例: 十一, 二十一, 百二十三）
	let result = 0;
	let current = 0;

	for (const char of text) {
		const digit = KANJI_DIGITS[char];
		if (digit === undefined) return null;

		if (digit === 10 || digit === 100 || digit === 1000) {
			if (current === 0) current = 1;
			result += current * digit;
			current = 0;
		} else {
			current = current * 10 + digit;
		}
	}
	result += current;

	return result > 0 ? result : null;
}

// 漢数字にマッチする正規表現パターン
const KANJI_PATTERN =
	"[零〇一壱壹二弐貳貮三参參四肆五伍六陸七漆柒質八捌九玖十拾百佰千仟]+";

/**
 * テキストから回次（edition）を抽出
 */
export function extractEdition(text: string): number | null {
	// パターン1: アラビア数字（例: 101, C104）
	const arabicMatch = text.match(/(\d+)/);
	if (arabicMatch) {
		return Number.parseInt(arabicMatch[1], 10);
	}

	// パターン2: 「第〇回」「第〇幕」「第〇章」「第〇弾」など
	const daiPattern = text.match(
		new RegExp(
			`第(${KANJI_PATTERN})(回|幕|章|弾|部|期|話|巻|節|編|夜|祭|宴|弦)`,
		),
	);
	if (daiPattern) {
		return kanjiToNumber(daiPattern[1]);
	}

	// パターン3: 単独の漢数字（例: 「壱」「弐」など）
	const kanjiOnlyMatch = text.match(
		new RegExp(
			`(${KANJI_PATTERN})(幕|回|章|弾|部|期|話|巻|節|編|夜|祭|宴|弦)?$`,
		),
	);
	if (kanjiOnlyMatch) {
		return kanjiToNumber(kanjiOnlyMatch[1]);
	}

	return null;
}

export interface EventSeries {
	id: string;
	name: string;
}

export interface SuggestResult {
	seriesId: string | null;
	edition: number | null;
}

/**
 * イベント名からシリーズと回次を推察する
 */
export function suggestFromEventName(
	eventName: string,
	seriesList: EventSeries[],
): SuggestResult {
	if (!eventName.trim() || seriesList.length === 0) {
		return { seriesId: null, edition: null };
	}

	const normalizedName = eventName.toLowerCase();
	let matchedSeries: EventSeries | null = null;

	// シリーズ名がイベント名に含まれているかチェック（長い名前を優先）
	const sortedByLength = [...seriesList].sort(
		(a, b) => b.name.length - a.name.length,
	);
	for (const series of sortedByLength) {
		const normalizedSeriesName = series.name.toLowerCase();
		if (normalizedName.includes(normalizedSeriesName)) {
			matchedSeries = series;
			break;
		}
	}

	// マッチしなかった場合、逆にイベント名がシリーズ名に含まれているかチェック
	if (!matchedSeries) {
		for (const series of sortedByLength) {
			const normalizedSeriesName = series.name.toLowerCase();
			if (normalizedSeriesName.includes(normalizedName)) {
				matchedSeries = series;
				break;
			}
		}
	}

	// 回次を抽出
	let edition: number | null = null;
	if (matchedSeries) {
		// シリーズ名を除いた残りの部分から回次を抽出
		const seriesNameIndex = normalizedName.indexOf(
			matchedSeries.name.toLowerCase(),
		);
		const beforeSeriesName = eventName.slice(0, seriesNameIndex);
		const afterSeriesName = eventName.slice(
			seriesNameIndex + matchedSeries.name.length,
		);

		// まずシリーズ名の後ろから探す
		edition = extractEdition(afterSeriesName);

		// 見つからなければシリーズ名の前から探す
		if (edition === null) {
			edition = extractEdition(beforeSeriesName);
		}
	} else {
		// シリーズが見つからない場合でも、回次を抽出
		edition = extractEdition(eventName);
	}

	return {
		seriesId: matchedSeries?.id ?? null,
		edition,
	};
}
