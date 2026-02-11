/**
 * 一時的なDBエラーに対する指数バックオフ付きリトライユーティリティ
 */

import { isRetryableDbError } from "./api-error";

interface RetryOptions {
	/** 最大リトライ回数（デフォルト: 3） */
	maxRetries?: number;
	/** 初回リトライまでの待機時間（ミリ秒、デフォルト: 100） */
	baseDelay?: number;
	/** 最大待機時間（ミリ秒、デフォルト: 5000） */
	maxDelay?: number;
	/** 操作名（ログ用） */
	operation?: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	baseDelay: 100,
	maxDelay: 5000,
	operation: "db-operation",
};

/**
 * 一時的なDBエラー時に指数バックオフでリトライする
 * @param fn - リトライ対象の非同期関数
 * @param options - リトライオプション
 * @returns 関数の戻り値
 * @throws 最大リトライ回数を超えた場合、最後のエラーをスロー
 */
export async function withDbRetry<T>(
	fn: () => Promise<T>,
	options?: RetryOptions,
): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: unknown;

	for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt >= opts.maxRetries || !isRetryableDbError(error)) {
				throw error;
			}

			const delay = Math.min(opts.baseDelay * 2 ** attempt, opts.maxDelay);
			console.warn(
				`[${opts.operation}] Transient DB error (attempt ${attempt + 1}/${opts.maxRetries}), retrying in ${delay}ms...`,
			);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
