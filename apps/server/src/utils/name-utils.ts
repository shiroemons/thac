/**
 * 名前処理ユーティリティ
 *
 * レガシーCSVインポート時の名前処理に使用する関数群
 */

/**
 * 文字列が英語のみかどうかを判定
 * ASCII文字（英数字、記号、スペース）のみで構成されているかチェック
 */
export function isEnglishOnly(text: string): boolean {
	if (!text || text.length === 0) return false;

	// ASCIIコード範囲（0x20-0x7E: 印字可能文字）のみかチェック
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		// タブ、改行も許容
		if (code === 0x09 || code === 0x0a || code === 0x0d) continue;
		// 印字可能ASCII文字
		if (code >= 0x20 && code <= 0x7e) continue;
		return false;
	}
	return true;
}

/**
 * 全角記号を半角に変換
 * - ／ → /
 * - ： → :
 * - その他よく使われる記号も変換
 */
export function normalizeFullWidthSymbols(text: string): string {
	if (!text) return text;

	const replacements: [string, string][] = [
		["／", "/"],
		["：", ":"],
		["（", "("],
		["）", ")"],
		["　", " "], // 全角スペース
		["！", "!"],
		["？", "?"],
		["＆", "&"],
		["＝", "="],
		["＋", "+"],
		["－", "-"],
		["＊", "*"],
		["＠", "@"],
		["＃", "#"],
		["％", "%"],
		["＄", "$"],
		["￥", "\\"],
		["｜", "|"],
		["＜", "<"],
		["＞", ">"],
		["［", "["],
		["］", "]"],
		["｛", "{"],
		["｝", "}"],
		["'", "'"],
		["'", "'"],
		["\u201C", '"'], // "（左ダブルクォート）
		["\u201D", '"'], // "（右ダブルクォート）
		["、", ","],
		["。", "."],
	];

	let result = text;
	for (const [from, to] of replacements) {
		result = result.split(from).join(to);
	}
	return result;
}

/**
 * ディスク情報を解析
 * "作品名 DISC-1" → { name: "作品名", discNumber: 1 }
 * "作品名 DISC-2" → { name: "作品名", discNumber: 2 }
 * "作品名" → { name: "作品名", discNumber: 1 }
 */
export interface DiscInfo {
	name: string;
	discNumber: number;
}

export function parseDiscInfo(albumName: string): DiscInfo {
	if (!albumName) return { name: albumName, discNumber: 1 };

	// パターン: DISC-1, DISC-2, Disc 1, Disc 2, disc1, disc2, DISC 1, Disk-1, etc.
	const patterns = [
		/^(.+?)\s*[Dd][Ii][Ss][CcKk][-\s]?(\d+)\s*$/,
		/^(.+?)\s*[Dd][Ii][Ss][CcKk](\d+)\s*$/,
		/^(.+?)\s*【[Dd][Ii][Ss][CcKk][-\s]?(\d+)】\s*$/,
		/^(.+?)\s*\([Dd][Ii][Ss][CcKk][-\s]?(\d+)\)\s*$/,
	];

	for (const pattern of patterns) {
		const match = albumName.match(pattern);
		if (match?.[1] && match[2]) {
			return {
				name: match[1].trim(),
				discNumber: Number.parseInt(match[2], 10),
			};
		}
	}

	return { name: albumName.trim(), discNumber: 1 };
}

/**
 * イベント名から回次（edition）を推測
 * "コミックマーケット108" → { baseName: "コミックマーケット", edition: 108 }
 * "博麗神社例大祭21" → { baseName: "博麗神社例大祭", edition: 21 }
 * "M3 2024春" → { baseName: "M3 2024春", edition: null }
 */
export interface EventEditionInfo {
	baseName: string;
	edition: number | null;
}

export function parseEventEdition(eventName: string): EventEditionInfo {
	if (!eventName) return { baseName: eventName, edition: null };

	// パターン: 末尾の数字を回次として認識
	// より具体的なパターンを先に検査する
	const patterns = [
		// "イベント名 第21回" - 第XX回パターン
		/^(.+?)\s*第(\d+)回$/,
		// "イベント名 Vol.5" - Vol.Xパターン
		/^(.+?)\s*[Vv][Oo][Ll]\.?\s*(\d+)$/,
		// "イベント名108" - 末尾に直接数字（最後に検査）
		/^(.+?)(\d+)$/,
	];

	for (const pattern of patterns) {
		const match = eventName.trim().match(pattern);
		if (match?.[1] && match[2]) {
			const edition = Number.parseInt(match[2], 10);
			// 1000以上は回次ではなく年度の可能性が高いのでスキップ
			if (edition > 0 && edition < 1000) {
				return {
					baseName: match[1].trim(),
					edition,
				};
			}
		}
	}

	return { baseName: eventName.trim(), edition: null };
}

/**
 * 名前情報を生成
 * - name: 元の名前（正規化後）
 * - nameJa: 日本語名（英語のみの場合はnull）
 * - nameEn: 英語名（英語のみの場合のみ設定）
 */
export interface NameInfo {
	name: string;
	nameJa: string | null;
	nameEn: string | null;
}

export function generateNameInfo(originalName: string): NameInfo {
	const name = normalizeFullWidthSymbols(originalName.trim());

	if (isEnglishOnly(name)) {
		return {
			name,
			nameJa: null,
			nameEn: name,
		};
	}

	return {
		name,
		nameJa: name,
		nameEn: null,
	};
}

/**
 * ソート用名を生成（サークル用）
 * ひらがな/カタカナ/英語の場合はそのまま
 * 漢字の場合は読み仮名が必要なのでnullを返す
 */
export function generateSortName(name: string): string | null {
	// 英語のみの場合はそのまま小文字で返す
	if (isEnglishOnly(name)) {
		return name.toLowerCase();
	}

	// ひらがな/カタカナのみの場合はひらがなに変換して返す
	// ただし完璧な変換は難しいのでここではnullを返し、手動入力を促す
	return null;
}
