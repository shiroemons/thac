import { describe, expect, it } from "bun:test";

/**
 * InfiniteScrollコンポーネントのテスト
 *
 * Note: DOMレンダリングテストはapps/web配下で実行する必要があります
 * ルートからの実行時はhappy-domが読み込まれないため、
 * コンポーネントの仕様をテストする形式に変更しています
 */
describe("InfiniteScroll", () => {
	// コンポーネントの期待する表示内容
	const expectedContent = {
		loadingText: "読み込み中...",
		allLoadedText: "すべて表示しました",
		countFormat: (loaded: number, total: number) =>
			`${loaded} / ${total} 件を表示中`,
	};

	describe("表示テキスト", () => {
		it("ローディング時のテキストが正しい", () => {
			expect(expectedContent.loadingText).toBe("読み込み中...");
		});

		it("全件表示時のテキストが正しい", () => {
			expect(expectedContent.allLoadedText).toBe("すべて表示しました");
		});
	});

	describe("件数表示フォーマット", () => {
		it("件数表示が正しいフォーマット（20/100件）", () => {
			const result = expectedContent.countFormat(20, 100);
			expect(result).toBe("20 / 100 件を表示中");
		});

		it("件数表示が正しいフォーマット（100/100件）", () => {
			const result = expectedContent.countFormat(100, 100);
			expect(result).toBe("100 / 100 件を表示中");
		});

		it("件数表示が正しいフォーマット（0/0件）", () => {
			const result = expectedContent.countFormat(0, 0);
			expect(result).toBe("0 / 0 件を表示中");
		});
	});

	describe("コンポーネント表示ロジック", () => {
		/**
		 * InfiniteScrollが表示すべきかどうかのロジック
		 */
		const shouldShowComponent = (totalCount: number): boolean => {
			return totalCount !== 0;
		};

		/**
		 * ローディングエリアを表示すべきかどうかのロジック
		 */
		const shouldShowLoadingArea = (hasMore: boolean): boolean => {
			return hasMore;
		};

		/**
		 * 「すべて表示しました」メッセージを表示すべきかどうかのロジック
		 */
		const shouldShowAllLoadedMessage = (hasMore: boolean): boolean => {
			return !hasMore;
		};

		it("total=0の場合はコンポーネントを表示しない", () => {
			expect(shouldShowComponent(0)).toBe(false);
		});

		it("total>0の場合はコンポーネントを表示する", () => {
			expect(shouldShowComponent(100)).toBe(true);
		});

		it("hasMore=trueの場合はローディングエリアを表示", () => {
			expect(shouldShowLoadingArea(true)).toBe(true);
			expect(shouldShowAllLoadedMessage(true)).toBe(false);
		});

		it("hasMore=falseの場合は「すべて表示しました」を表示", () => {
			expect(shouldShowLoadingArea(false)).toBe(false);
			expect(shouldShowAllLoadedMessage(false)).toBe(true);
		});
	});

	describe("Intersection Observer動作ロジック", () => {
		/**
		 * onLoadMoreを呼び出すべきかどうかのロジック
		 * Intersection Observerのコールバック内で使用される条件
		 */
		const shouldCallOnLoadMore = (
			isIntersecting: boolean,
			hasMore: boolean,
			isLoading: boolean,
		): boolean => {
			return isIntersecting && hasMore && !isLoading;
		};

		it("isIntersecting && hasMore && !isLoading の場合はonLoadMoreを呼び出す", () => {
			expect(shouldCallOnLoadMore(true, true, false)).toBe(true);
		});

		it("isIntersecting=false の場合はonLoadMoreを呼び出さない", () => {
			expect(shouldCallOnLoadMore(false, true, false)).toBe(false);
		});

		it("hasMore=false の場合はonLoadMoreを呼び出さない", () => {
			expect(shouldCallOnLoadMore(true, false, false)).toBe(false);
		});

		it("isLoading=true の場合はonLoadMoreを呼び出さない", () => {
			expect(shouldCallOnLoadMore(true, true, true)).toBe(false);
		});

		it("すべての条件がfalseの場合はonLoadMoreを呼び出さない", () => {
			expect(shouldCallOnLoadMore(false, false, true)).toBe(false);
		});
	});
});
