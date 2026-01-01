import { ERROR_MESSAGES } from "../constants/error-messages";
import { ErrorCodes } from "./api-error";

/**
 * 競合レスポンス型
 */
export interface ConflictResponse<T> {
	error: string;
	code: string;
	current: T;
}

/**
 * 楽観的ロックの競合チェックオプション
 */
interface ConflictCheckOptions<T> {
	/** リクエストボディに含まれるupdatedAt */
	requestUpdatedAt: number | string | Date | null | undefined;
	/** データベースから取得した現在のエンティティ（undefined許容） */
	currentEntity: T | undefined;
}

/**
 * 楽観的ロックの競合をチェックする
 *
 * @param options - チェックオプション
 * @returns 競合がある場合はConflictResponse、競合がない場合はnull
 *
 * @example
 * ```typescript
 * const conflict = checkOptimisticLockConflict({
 *   requestUpdatedAt: body.updatedAt,
 *   currentEntity: existingArtist,
 * });
 *
 * if (conflict) {
 *   return c.json(conflict, 409);
 * }
 * ```
 */
export function checkOptimisticLockConflict<
	T extends { updatedAt?: Date | null },
>(options: ConflictCheckOptions<T>): ConflictResponse<T> | null {
	const { requestUpdatedAt, currentEntity } = options;

	// リクエストにupdatedAtがない場合はスキップ（後方互換性）
	if (requestUpdatedAt === null || requestUpdatedAt === undefined) {
		return null;
	}

	// エンティティが存在しない場合はスキップ
	if (!currentEntity) {
		return null;
	}

	const currentUpdatedAt = currentEntity.updatedAt;
	if (!currentUpdatedAt) {
		return null;
	}

	// ミリ秒単位で比較するために正規化
	const requestTime = normalizeToMillis(requestUpdatedAt);
	const currentTime =
		currentUpdatedAt instanceof Date
			? currentUpdatedAt.getTime()
			: normalizeToMillis(currentUpdatedAt);

	// タイムスタンプが一致しない場合は競合
	if (requestTime !== currentTime) {
		return {
			error: ERROR_MESSAGES.DATA_CHANGED_BY_ANOTHER_USER,
			code: ErrorCodes.CONFLICT,
			current: currentEntity,
		};
	}

	return null;
}

/**
 * 様々な形式のタイムスタンプをミリ秒に正規化
 */
function normalizeToMillis(
	value: number | string | Date | null | undefined,
): number {
	if (value === null || value === undefined) {
		return 0;
	}
	if (typeof value === "number") {
		return value;
	}
	if (value instanceof Date) {
		return value.getTime();
	}
	// ISO文字列の場合
	return new Date(value).getTime();
}
