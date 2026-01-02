/**
 * エクスポートフォーマッター
 * TSV/JSON形式でデータをエクスポートするためのユーティリティ
 */

/**
 * カラム定義
 */
export interface ColumnDefinition<T> {
	key: keyof T;
	label: string;
}

/**
 * TSVフィールドをエスケープ
 * タブ、改行、キャリッジリターンをエスケープ
 */
export function escapeTSVField(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	const str = String(value);
	// タブ、改行、キャリッジリターンをスペースに置換
	return str.replace(/[\t\n\r]/g, " ");
}

/**
 * 値をTSV用にフォーマット
 * Date型はISO文字列に変換
 */
function formatValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	return String(value);
}

/**
 * データをTSV形式に変換
 */
export function formatToTSV<T extends Record<string, unknown>>(
	data: T[],
	columns: ColumnDefinition<T>[],
): string {
	if (data.length === 0) {
		// ヘッダーのみ出力
		return columns.map((col) => col.label).join("\t");
	}

	// ヘッダー行
	const header = columns.map((col) => col.label).join("\t");

	// データ行
	const rows = data.map((row) =>
		columns
			.map((col) => escapeTSVField(formatValue(row[col.key as string])))
			.join("\t"),
	);

	return [header, ...rows].join("\n");
}

/**
 * データをJSON形式に変換
 */
export function formatToJSON<T>(data: T[]): string {
	return JSON.stringify(data, null, 2);
}

/**
 * エクスポート用ファイル名を生成
 */
export function generateFilename(
	entityName: string,
	format: "tsv" | "json",
): string {
	const now = new Date();
	const timestamp = now
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/T/, "_")
		.slice(0, 15);
	return `${entityName}_${timestamp}.${format}`;
}

/**
 * Content-Typeを取得
 */
export function getContentType(format: "tsv" | "json"): string {
	return format === "tsv"
		? "text/tab-separated-values; charset=utf-8"
		: "application/json; charset=utf-8";
}

/**
 * エクスポートレスポンスを生成
 */
export function createExportResponse(
	content: string,
	filename: string,
	format: "tsv" | "json",
): Response {
	return new Response(content, {
		headers: {
			"Content-Type": getContentType(format),
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}
