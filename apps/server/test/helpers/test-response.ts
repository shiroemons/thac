/**
 * テスト用レスポンスヘルパー
 * 型安全なレスポンス処理とアサーションを提供
 */

import { expect } from "bun:test";

// =============================================================================
// 共通レスポンス型定義
// =============================================================================

/**
 * ページネーション付きリストレスポンス
 */
export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

/**
 * エラーレスポンス
 */
export interface ErrorResponse {
	error: string;
	details?: unknown;
}

/**
 * 削除操作レスポンス
 */
export interface DeleteResponse {
	success: boolean;
	id?: string;
	deleted?: string[];
	failed?: unknown[];
}

/**
 * 並び替え操作レスポンス
 */
export interface ReorderResponse {
	success: boolean;
	updated?: number;
}

// =============================================================================
// レスポンスパースヘルパー
// =============================================================================

/**
 * 型安全にJSONレスポンスをパース
 */
export async function parseJson<T>(res: Response): Promise<T> {
	return res.json() as Promise<T>;
}

/**
 * ページネーション付きリストレスポンスをパース
 */
export async function parseListResponse<T>(
	res: Response,
): Promise<PaginatedResponse<T>> {
	return parseJson<PaginatedResponse<T>>(res);
}

/**
 * エラーレスポンスをパース
 */
export async function parseErrorResponse(
	res: Response,
): Promise<ErrorResponse> {
	return parseJson<ErrorResponse>(res);
}

/**
 * 削除レスポンスをパース
 */
export async function parseDeleteResponse(
	res: Response,
): Promise<DeleteResponse> {
	return parseJson<DeleteResponse>(res);
}

// =============================================================================
// アサーションヘルパー
// =============================================================================

/**
 * 成功レスポンス（200）を検証してJSONを返す
 */
export async function expectSuccess<T>(res: Response): Promise<T> {
	expect(res.status).toBe(200);
	return parseJson<T>(res);
}

/**
 * 作成成功レスポンス（201）を検証してJSONを返す
 */
export async function expectCreated<T>(res: Response): Promise<T> {
	expect(res.status).toBe(201);
	return parseJson<T>(res);
}

/**
 * Not Found（404）を検証
 */
export async function expectNotFound(res: Response): Promise<ErrorResponse> {
	expect(res.status).toBe(404);
	return parseErrorResponse(res);
}

/**
 * Bad Request（400）を検証
 */
export async function expectBadRequest(res: Response): Promise<ErrorResponse> {
	expect(res.status).toBe(400);
	return parseErrorResponse(res);
}

/**
 * Conflict（409）を検証
 */
export async function expectConflict(res: Response): Promise<ErrorResponse> {
	expect(res.status).toBe(409);
	return parseErrorResponse(res);
}

/**
 * Unauthorized（401）を検証
 */
export async function expectUnauthorized(res: Response): Promise<void> {
	expect(res.status).toBe(401);
}

/**
 * Forbidden（403）を検証
 */
export async function expectForbidden(res: Response): Promise<void> {
	expect(res.status).toBe(403);
}

/**
 * 空のリストレスポンスを検証
 */
export async function expectEmptyList<T>(
	res: Response,
): Promise<PaginatedResponse<T>> {
	expect(res.status).toBe(200);
	const json = await parseListResponse<T>(res);
	expect(json.data).toEqual([]);
	expect(json.total).toBe(0);
	return json;
}

/**
 * ページネーションを検証
 */
export function expectPagination<T>(
	json: PaginatedResponse<T>,
	expected: { total?: number; page?: number; limit?: number; length?: number },
): void {
	if (expected.total !== undefined) {
		expect(json.total).toBe(expected.total);
	}
	if (expected.page !== undefined) {
		expect(json.page).toBe(expected.page);
	}
	if (expected.limit !== undefined) {
		expect(json.limit).toBe(expected.limit);
	}
	if (expected.length !== undefined) {
		expect(json.data).toHaveLength(expected.length);
	}
}

// =============================================================================
// リクエストヘルパー
// =============================================================================

/**
 * JSON POSTリクエストのオプションを生成
 */
export function postJson(body: unknown): RequestInit {
	return {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

/**
 * JSON PUTリクエストのオプションを生成
 */
export function putJson(body: unknown): RequestInit {
	return {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

/**
 * JSON PATCHリクエストのオプションを生成
 */
export function patchJson(body: unknown): RequestInit {
	return {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

/**
 * DELETEリクエストのオプションを生成
 */
export function deleteRequest(): RequestInit {
	return {
		method: "DELETE",
	};
}

/**
 * 一括削除用のDELETEリクエストオプションを生成
 */
export function deleteBulk(ids: string[]): RequestInit {
	return {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ ids }),
	};
}
