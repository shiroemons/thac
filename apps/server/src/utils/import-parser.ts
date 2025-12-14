import type { z } from "zod";

interface RowError {
	row: number;
	errors: string[];
}

interface ParseResult<T> {
	success: boolean;
	data?: T[];
	errors?: RowError[];
}

/**
 * CSVテキストをパースしてオブジェクト配列に変換
 */
export function parseCSV(csvText: string): Record<string, string>[] {
	const lines = csvText.trim().split("\n");
	if (lines.length < 2) {
		return [];
	}

	const headerLine = lines[0];
	if (!headerLine) {
		return [];
	}

	const headers = headerLine.split(",").map((h) => h.trim());
	const rows: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;

		const values = parseCSVLine(line);
		const row: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			const header = headers[j];
			if (header) {
				row[header] = values[j] || "";
			}
		}
		rows.push(row);
	}

	return rows;
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
 * JSONテキストをパースしてオブジェクト配列に変換
 */
export function parseJSON(jsonText: string): Record<string, unknown>[] {
	const data = JSON.parse(jsonText);
	if (!Array.isArray(data)) {
		throw new Error("JSON must be an array");
	}
	return data;
}

/**
 * データをZodスキーマでバリデーション
 * すべての行をバリデーションし、1つでもエラーがあれば全体を拒否
 */
export function validateRows<T>(
	rows: Record<string, unknown>[],
	schema: z.ZodSchema<T>,
): ParseResult<T> {
	const validatedData: T[] = [];
	const errors: RowError[] = [];

	for (let i = 0; i < rows.length; i++) {
		const result = schema.safeParse(rows[i]);
		if (result.success) {
			validatedData.push(result.data);
		} else {
			const fieldErrors = result.error.flatten().fieldErrors;
			const errorMessages: string[] = [];
			for (const [field, messages] of Object.entries(fieldErrors)) {
				if (messages && Array.isArray(messages)) {
					errorMessages.push(`${field}: ${messages.join(", ")}`);
				}
			}
			errors.push({
				row: i + 1, // 1-indexed (ヘッダー行を除く)
				errors: errorMessages,
			});
		}
	}

	if (errors.length > 0) {
		return {
			success: false,
			errors,
		};
	}

	return {
		success: true,
		data: validatedData,
	};
}

/**
 * ファイルの種類を判定
 */
export function detectFileType(filename: string): "csv" | "json" | "unknown" {
	const lower = filename.toLowerCase();
	if (lower.endsWith(".csv")) {
		return "csv";
	}
	if (lower.endsWith(".json")) {
		return "json";
	}
	return "unknown";
}

/**
 * ファイル内容をパースしてバリデーション済みデータを返す
 */
export function parseAndValidate<T>(
	content: string,
	filename: string,
	schema: z.ZodSchema<T>,
): ParseResult<T> {
	const fileType = detectFileType(filename);

	if (fileType === "unknown") {
		return {
			success: false,
			errors: [
				{
					row: 0,
					errors: [
						"サポートされていないファイル形式です（.csv または .json のみ）",
					],
				},
			],
		};
	}

	try {
		let rows: Record<string, unknown>[];

		if (fileType === "csv") {
			rows = parseCSV(content);
		} else {
			rows = parseJSON(content);
		}

		if (rows.length === 0) {
			return {
				success: false,
				errors: [{ row: 0, errors: ["ファイルにデータがありません"] }],
			};
		}

		return validateRows(rows, schema);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "ファイルのパースに失敗しました";
		return {
			success: false,
			errors: [{ row: 0, errors: [message] }],
		};
	}
}
