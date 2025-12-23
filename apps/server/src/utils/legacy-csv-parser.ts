/**
 * レガシーCSVパーサー
 *
 * 旧東方編曲録システムのCSVファイルをパースするための専用パーサー。
 * 以下の特殊フォーマットに対応:
 * - 重複ヘッダー行のスキップ
 * - コロン区切りの複数値（vocalists, arrangers, lyricists, original_songs）
 * - ×区切りの複合サークル名
 */

export interface LegacyCSVRecord {
	circle: string;
	album: string;
	title: string;
	trackNumber: number;
	event: string;
	vocalists: string[];
	arrangers: string[];
	lyricists: string[];
	originalSongs: string[];
}

export interface ParseError {
	row: number;
	message: string;
}

export interface ParseResult {
	success: boolean;
	records: LegacyCSVRecord[];
	errors: ParseError[];
}

const REQUIRED_COLUMNS = [
	"circle",
	"album",
	"title",
	"track_number",
	"event",
	"vocalists",
	"arrangers",
	"lyricists",
	"original_songs",
] as const;

/**
 * コロン区切りの複数値を分割する
 */
export function splitColonValues(value: string): string[] {
	if (!value || value.trim() === "") {
		return [];
	}
	return value
		.split(":")
		.map((v) => v.trim())
		.filter((v) => v !== "");
}

/**
 * ×区切りの複合サークル名を分割する
 * 全角×と半角x (半角xはスペースで囲まれている場合) をサポート
 */
export function splitCircles(value: string): string[] {
	if (!value || value.trim() === "") {
		return [];
	}
	// 全角× または スペースで囲まれた半角x で分割
	return value
		.split(/×| x /)
		.map((v) => v.trim())
		.filter((v) => v !== "");
}

/**
 * CSVの1行をパース（カンマ区切り、クォート対応）
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		const nextChar = line[i + 1];

		if (inQuotes) {
			if (char === '"' && nextChar === '"') {
				// エスケープされたクォート
				current += '"';
				i++;
			} else if (char === '"') {
				// クォート終了
				inQuotes = false;
			} else {
				current += char;
			}
		} else {
			if (char === '"') {
				// クォート開始
				inQuotes = true;
			} else if (char === ",") {
				// フィールド区切り
				result.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
	}
	result.push(current.trim());

	return result;
}

/**
 * ヘッダー行かどうかを判定
 * 1列目が"circle"で、いずれかの列に"track_number"が含まれる場合はヘッダー行
 */
function isHeaderRow(line: string): boolean {
	const values = parseCSVLine(line);
	return values[0] === "circle" && values.includes("track_number");
}

/**
 * 必須カラムの検証
 */
function validateRequiredColumns(headers: string[]): ParseError | null {
	const missingColumns = REQUIRED_COLUMNS.filter(
		(col) => !headers.includes(col),
	);

	if (missingColumns.length > 0) {
		return {
			row: 1,
			message: `必須カラムが不足しています: ${missingColumns.join(", ")}`,
		};
	}

	return null;
}

/**
 * 1行のデータをLegacyCSVRecordに変換
 */
function parseRow(
	values: string[],
	headers: string[],
	rowNumber: number,
): { record: LegacyCSVRecord | null; error: ParseError | null } {
	const row: Record<string, string> = {};
	for (let j = 0; j < headers.length; j++) {
		const header = headers[j];
		if (header) {
			row[header] = values[j] || "";
		}
	}

	// track_numberの検証
	const trackNumberStr = row["track_number"] || "";
	const trackNumber = Number.parseInt(trackNumberStr, 10);
	if (Number.isNaN(trackNumber)) {
		return {
			record: null,
			error: {
				row: rowNumber,
				message: `track_numberが数値ではありません: "${trackNumberStr}"`,
			},
		};
	}

	const record: LegacyCSVRecord = {
		circle: row["circle"] || "",
		album: row["album"] || "",
		title: row["title"] || "",
		trackNumber,
		event: row["event"] || "",
		vocalists: splitColonValues(row["vocalists"] || ""),
		arrangers: splitColonValues(row["arrangers"] || ""),
		lyricists: splitColonValues(row["lyricists"] || ""),
		originalSongs: splitColonValues(row["original_songs"] || ""),
	};

	return { record, error: null };
}

/**
 * レガシーCSVをパースする
 *
 * @param csvContent UTF-8エンコードされたCSV文字列
 * @returns パース結果（レコード配列とエラー配列）
 */
export function parseLegacyCSV(csvContent: string): ParseResult {
	const records: LegacyCSVRecord[] = [];
	const errors: ParseError[] = [];

	const lines = csvContent.trim().split("\n");
	if (lines.length < 2) {
		return {
			success: false,
			records: [],
			errors: [{ row: 0, message: "データがありません" }],
		};
	}

	// ヘッダー行を取得
	const headerLine = lines[0];
	if (!headerLine) {
		return {
			success: false,
			records: [],
			errors: [{ row: 0, message: "ヘッダー行がありません" }],
		};
	}

	const headers = headerLine.split(",").map((h) => h.trim());

	// 必須カラムの検証
	const columnError = validateRequiredColumns(headers);
	if (columnError) {
		return {
			success: false,
			records: [],
			errors: [columnError],
		};
	}

	// データ行をパース
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;

		// 重複ヘッダー行をスキップ
		if (isHeaderRow(line)) {
			continue;
		}

		const values = parseCSVLine(line);
		const { record, error } = parseRow(values, headers, i + 1);

		if (error) {
			errors.push(error);
		} else if (record) {
			records.push(record);
		}
	}

	return {
		success: errors.length === 0,
		records,
		errors,
	};
}
