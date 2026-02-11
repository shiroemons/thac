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
	/** サービス利用不可 */
	SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
	/** その他のエラー */
	INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * PostgreSQLエラーの型ガード
 * postgres.jsが投げるエラーをダックタイピングで判定
 */
function isPostgresError(
	error: unknown,
): error is Error & { code: string; detail?: string } {
	return (
		error instanceof Error &&
		"code" in error &&
		typeof (error as Record<string, unknown>).code === "string"
	);
}

/**
 * リトライ可能な一時的DBエラーかどうかを判定
 * - 08003: connection_does_not_exist
 * - 08006: connection_failure
 * - 57P03: cannot_connect_now
 * - 57014: query_canceled (timeout)
 * - 40001: serialization_failure
 * - 40P01: deadlock_detected
 */
const RETRYABLE_ERROR_CODES = new Set([
	"08003",
	"08006",
	"57P03",
	"57014",
	"40001",
	"40P01",
]);

export function isRetryableDbError(error: unknown): boolean {
	if (!isPostgresError(error)) return false;
	return RETRYABLE_ERROR_CODES.has(error.code);
}

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

	if (isPostgresError(error)) {
		switch (error.code) {
			case "23505": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_UNIQUE_VIOLATION,
					code: ErrorCodes.DUPLICATE,
				};
				if (isDev) response.details = error.detail ?? error.message;
				return c.json(response, 409);
			}
			case "23503": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_FOREIGN_KEY_VIOLATION,
					code: ErrorCodes.VALIDATION_ERROR,
				};
				if (isDev) response.details = error.detail ?? error.message;
				return c.json(response, 400);
			}
			case "23514": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_CHECK_VIOLATION,
					code: ErrorCodes.VALIDATION_ERROR,
				};
				if (isDev) response.details = error.detail ?? error.message;
				return c.json(response, 400);
			}
			case "23502": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_NOT_NULL_VIOLATION,
					code: ErrorCodes.VALIDATION_ERROR,
				};
				if (isDev) response.details = error.detail ?? error.message;
				return c.json(response, 400);
			}
			case "57014": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_QUERY_TIMEOUT,
					code: ErrorCodes.SERVICE_UNAVAILABLE,
				};
				if (isDev) response.details = error.message;
				return c.json(response, 503);
			}
			case "08003":
			case "08006":
			case "57P03": {
				const response: ApiErrorResponse = {
					error: ERROR_MESSAGES.DB_CONNECTION_ERROR,
					code: ErrorCodes.SERVICE_UNAVAILABLE,
				};
				if (isDev) response.details = error.message;
				return c.json(response, 503);
			}
		}
	}

	const response: ApiErrorResponse = {
		error: ERROR_MESSAGES.DB_ERROR,
		code: ErrorCodes.DB_ERROR,
	};

	if (isDev) {
		response.details = error instanceof Error ? error.message : String(error);
	}

	return c.json(response, 500);
}
