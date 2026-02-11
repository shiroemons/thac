import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

/**
 * unknown型のエラーからエラーメッセージを安全に取得
 */
export function getErrorMessage(
	error: unknown,
	defaultMessage = "エラーが発生しました",
): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return defaultMessage;
}

// createIdはサブパスエクスポートからインポートしてください（メインエントリはpostgresを含むため）
// import { createId } from "@thac/db/utils/id";

/**
 * 外部リンクを中間ページ経由のURLに変換
 */
export function getExternalLinkUrl(url: string): string {
	return `/go?url=${encodeURIComponent(url)}`;
}
