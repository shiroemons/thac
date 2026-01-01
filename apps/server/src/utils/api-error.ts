import type { Context } from "hono";
import { ERROR_MESSAGES } from "../constants/error-messages";

/**
 * 統一エラーレスポンス形式
 */
export interface ApiErrorResponse {
	/** ユーザー向けメッセージ（日本語） */
	error: string;
	/** エラーコード（英語） */
	code: string;
	/** 開発環境のみの詳細情報 */
	details?: unknown;
}

/**
 * エラーコード定義
 */
export const ErrorCodes = {
	/** データベースエラー */
	DB_ERROR: "DB_ERROR",
	/** バリデーションエラー */
	VALIDATION_ERROR: "VALIDATION_ERROR",
	/** リソースが見つからない */
	NOT_FOUND: "NOT_FOUND",
	/** 重複エラー */
	DUPLICATE: "DUPLICATE",
	/** データ競合（楽観的ロック） */
	CONFLICT: "CONFLICT",
	/** その他のエラー */
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * DB操作時のエラーハンドリング
 * @param c - Honoコンテキスト
 * @param error - エラーオブジェクト
 * @param operation - 操作名（ログ用）
 * @returns エラーレスポンス
 */
export function handleDbError(c: Context, error: unknown, operation: string) {
	console.error(`[${operation}] Database error:`, error);

	const isDev = process.env.NODE_ENV === "development";
	const response: ApiErrorResponse = {
		error: ERROR_MESSAGES.DB_ERROR,
		code: ErrorCodes.DB_ERROR,
	};

	if (isDev) {
		response.details = error instanceof Error ? error.message : String(error);
	}

	return c.json(response, 500);
}
