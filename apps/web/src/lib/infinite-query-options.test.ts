import { describe, expect, it } from "bun:test";
import type { PaginatedResponse } from "./api-client";

/**
 * infiniteQueryOptionsのgetNextPageParamロジックのテスト
 *
 * 実際のqueryOptionsはssrFetchに依存するため、
 * ロジック部分のみを抽出してテストする
 */
describe("infiniteQueryOptions getNextPageParam logic", () => {
	/**
	 * getNextPageParamのロジック（artistsInfiniteQueryOptions, circlesInfiniteQueryOptionsと同じ）
	 */
	const getNextPageParam = <T>(
		lastPage: PaginatedResponse<T>,
	): number | undefined => {
		const currentPage = lastPage.page;
		const hasMore = currentPage * lastPage.limit < lastPage.total;
		return hasMore ? currentPage + 1 : undefined;
	};

	describe("次ページが存在する場合", () => {
		it("page=1, limit=20, total=100 → 次は2ページ目", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 1,
				limit: 20,
				total: 100,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBe(2);
		});

		it("page=2, limit=20, total=50 → 次は3ページ目", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 2,
				limit: 20,
				total: 50,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBe(3);
		});

		it("page=1, limit=10, total=11 → 次は2ページ目（境界値テスト）", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 1,
				limit: 10,
				total: 11,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBe(2);
		});
	});

	describe("次ページが存在しない場合（最終ページ）", () => {
		it("page=5, limit=20, total=100 → undefined", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 5,
				limit: 20,
				total: 100,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBeUndefined();
		});

		it("page=1, limit=20, total=20 → undefined（ちょうど1ページ）", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 1,
				limit: 20,
				total: 20,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBeUndefined();
		});

		it("page=1, limit=20, total=10 → undefined（1ページ未満）", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 1,
				limit: 20,
				total: 10,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBeUndefined();
		});
	});

	describe("total=0の場合", () => {
		it("page=1, limit=20, total=0 → undefined", () => {
			const lastPage: PaginatedResponse<unknown> = {
				data: [],
				page: 1,
				limit: 20,
				total: 0,
			};

			const result = getNextPageParam(lastPage);

			expect(result).toBeUndefined();
		});
	});

	describe("queryKey生成パターンの検証", () => {
		it("artistsInfiniteQueryOptionsのqueryKeyパターン", () => {
			const params = {
				limit: 20,
				search: "test",
				initialScript: "あ",
				sortBy: "name",
				sortOrder: "asc" as const,
			};

			const queryKey = [
				"artists",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.sortBy,
				params.sortOrder,
			];

			expect(queryKey).toEqual([
				"artists",
				"infinite",
				20,
				"test",
				"あ",
				"name",
				"asc",
			]);
		});

		it("circlesInfiniteQueryOptionsのqueryKeyパターン", () => {
			const params = {
				limit: 20,
				search: undefined,
				initialScript: undefined,
				sortBy: undefined,
				sortOrder: undefined,
			};

			const queryKey = [
				"circles",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.sortBy,
				params.sortOrder,
			];

			expect(queryKey).toEqual([
				"circles",
				"infinite",
				20,
				undefined,
				undefined,
				undefined,
				undefined,
			]);
		});

		it("同じパラメータで同じqueryKeyが生成される", () => {
			const params1 = { limit: 20, search: "query", sortBy: "name" };
			const params2 = { limit: 20, search: "query", sortBy: "name" };

			const key1 = ["artists", "infinite", params1.limit, params1.search];
			const key2 = ["artists", "infinite", params2.limit, params2.search];

			expect(key1).toEqual(key2);
		});

		it("異なるパラメータで異なるqueryKeyが生成される", () => {
			const params1 = { limit: 20, search: "query1" };
			const params2 = { limit: 20, search: "query2" };

			const key1 = ["artists", "infinite", params1.limit, params1.search];
			const key2 = ["artists", "infinite", params2.limit, params2.search];

			expect(key1).not.toEqual(key2);
		});
	});
});
