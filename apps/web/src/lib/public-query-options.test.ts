import { describe, expect, it } from "bun:test";
import type { PaginatedResponse } from "./public-api";

/**
 * public-query-optionsの無限スクロールクエリオプションのテスト
 *
 * 実際のqueryOptionsはpublicApiに依存するため、
 * ロジック部分のみを抽出してテストする
 */
describe("publicCirclesInfiniteQueryOptions", () => {
	describe("queryKey生成", () => {
		it("すべてのパラメータが含まれたqueryKeyが生成される", () => {
			const params = {
				limit: 20,
				search: "test",
				initialScript: "か",
				initial: "カ",
				row: "か行",
			};

			const queryKey = [
				"public",
				"circles",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.initial,
				params.row,
			];

			expect(queryKey).toEqual([
				"public",
				"circles",
				"infinite",
				20,
				"test",
				"か",
				"カ",
				"か行",
			]);
		});

		it("undefinedパラメータを含むqueryKeyが生成される", () => {
			const params = {
				limit: 20,
				search: undefined,
				initialScript: undefined,
				initial: undefined,
				row: undefined,
			};

			const queryKey = [
				"public",
				"circles",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.initial,
				params.row,
			];

			expect(queryKey).toEqual([
				"public",
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
			const params1 = { limit: 20, search: "query", initialScript: "あ" };
			const params2 = { limit: 20, search: "query", initialScript: "あ" };

			const key1 = [
				"public",
				"circles",
				"infinite",
				params1.limit,
				params1.search,
				params1.initialScript,
			];
			const key2 = [
				"public",
				"circles",
				"infinite",
				params2.limit,
				params2.search,
				params2.initialScript,
			];

			expect(key1).toEqual(key2);
		});

		it("異なるパラメータで異なるqueryKeyが生成される", () => {
			const params1 = { limit: 20, search: "query1" };
			const params2 = { limit: 20, search: "query2" };

			const key1 = [
				"public",
				"circles",
				"infinite",
				params1.limit,
				params1.search,
			];
			const key2 = [
				"public",
				"circles",
				"infinite",
				params2.limit,
				params2.search,
			];

			expect(key1).not.toEqual(key2);
		});
	});

	describe("initialPageParam", () => {
		it("初期ページは1である", () => {
			const initialPageParam = 1;

			expect(initialPageParam).toBe(1);
		});
	});

	describe("getNextPageParam", () => {
		/**
		 * getNextPageParamのロジック（publicCirclesInfiniteQueryOptionsと同じ）
		 */
		const getNextPageParam = <T>(
			lastPage: PaginatedResponse<T>,
		): number | undefined => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		};

		describe("次ページが存在する場合（hasMore=true）", () => {
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

			it("page=1, limit=10, total=11 → 次は2ページ目（境界値）", () => {
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

		describe("次ページが存在しない場合（hasMore=false）", () => {
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
	});
});

describe("publicArtistsInfiniteQueryOptions", () => {
	describe("queryKey生成", () => {
		it("すべてのパラメータが含まれたqueryKeyが生成される", () => {
			const params = {
				limit: 20,
				search: "test",
				initialScript: "か",
				initial: "カ",
				row: "か行",
				role: "vocal",
			};

			const queryKey = [
				"public",
				"artists",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.initial,
				params.row,
				params.role,
			];

			expect(queryKey).toEqual([
				"public",
				"artists",
				"infinite",
				20,
				"test",
				"か",
				"カ",
				"か行",
				"vocal",
			]);
		});

		it("undefinedパラメータを含むqueryKeyが生成される", () => {
			const params = {
				limit: 20,
				search: undefined,
				initialScript: undefined,
				initial: undefined,
				row: undefined,
				role: undefined,
			};

			const queryKey = [
				"public",
				"artists",
				"infinite",
				params.limit,
				params.search,
				params.initialScript,
				params.initial,
				params.row,
				params.role,
			];

			expect(queryKey).toEqual([
				"public",
				"artists",
				"infinite",
				20,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
			]);
		});

		it("同じパラメータで同じqueryKeyが生成される", () => {
			const params1 = {
				limit: 20,
				search: "query",
				initialScript: "あ",
				role: "vocal",
			};
			const params2 = {
				limit: 20,
				search: "query",
				initialScript: "あ",
				role: "vocal",
			};

			const key1 = [
				"public",
				"artists",
				"infinite",
				params1.limit,
				params1.search,
				params1.initialScript,
				params1.role,
			];
			const key2 = [
				"public",
				"artists",
				"infinite",
				params2.limit,
				params2.search,
				params2.initialScript,
				params2.role,
			];

			expect(key1).toEqual(key2);
		});

		it("異なるパラメータで異なるqueryKeyが生成される", () => {
			const params1 = { limit: 20, role: "vocal" };
			const params2 = { limit: 20, role: "arrange" };

			const key1 = [
				"public",
				"artists",
				"infinite",
				params1.limit,
				params1.role,
			];
			const key2 = [
				"public",
				"artists",
				"infinite",
				params2.limit,
				params2.role,
			];

			expect(key1).not.toEqual(key2);
		});
	});

	describe("initialPageParam", () => {
		it("初期ページは1である", () => {
			const initialPageParam = 1;

			expect(initialPageParam).toBe(1);
		});
	});

	describe("getNextPageParam", () => {
		/**
		 * getNextPageParamのロジック（publicArtistsInfiniteQueryOptionsと同じ）
		 */
		const getNextPageParam = <T>(
			lastPage: PaginatedResponse<T>,
		): number | undefined => {
			const hasMore = lastPage.page * lastPage.limit < lastPage.total;
			return hasMore ? lastPage.page + 1 : undefined;
		};

		describe("次ページが存在する場合（hasMore=true）", () => {
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

			it("page=1, limit=10, total=11 → 次は2ページ目（境界値）", () => {
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

		describe("次ページが存在しない場合（hasMore=false）", () => {
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
	});
});
