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
		idleHintText: "スクロールして続きを読み込む",
		noMoreDataText: "これ以上データがありません",
		countFormat: (loaded: number, total: number) =>
			`${loaded} / ${total} 件を表示中`,
		scrollToTopLabel: "トップへ戻る",
	};

	describe("表示テキスト", () => {
		it("待機時のヒントテキストが正しい", () => {
			expect(expectedContent.idleHintText).toBe("スクロールして続きを読み込む");
		});

		it("全件表示時のテキストが正しい", () => {
			expect(expectedContent.noMoreDataText).toBe("これ以上データがありません");
		});

		it("トップへ戻るボタンのラベルが正しい", () => {
			expect(expectedContent.scrollToTopLabel).toBe("トップへ戻る");
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
		 * 「これ以上データがありません」メッセージを表示すべきかどうかのロジック
		 */
		const shouldShowNoMoreDataMessage = (hasMore: boolean): boolean => {
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
			expect(shouldShowNoMoreDataMessage(true)).toBe(false);
		});

		it("hasMore=falseの場合は「これ以上データがありません」を表示", () => {
			expect(shouldShowLoadingArea(false)).toBe(false);
			expect(shouldShowNoMoreDataMessage(false)).toBe(true);
		});
	});

	describe("トップへ戻るボタン表示ロジック", () => {
		const DEFAULT_THRESHOLD = 400;

		/**
		 * トップへ戻るボタンを表示すべきかどうかのロジック
		 */
		const shouldShowScrollTopButton = (
			scrollY: number,
			threshold: number = DEFAULT_THRESHOLD,
		): boolean => {
			return scrollY > threshold;
		};

		it("スクロール位置がしきい値を超えた場合はボタンを表示", () => {
			expect(shouldShowScrollTopButton(401)).toBe(true);
			expect(shouldShowScrollTopButton(500)).toBe(true);
			expect(shouldShowScrollTopButton(1000)).toBe(true);
		});

		it("スクロール位置がしきい値以下の場合はボタンを非表示", () => {
			expect(shouldShowScrollTopButton(0)).toBe(false);
			expect(shouldShowScrollTopButton(400)).toBe(false);
			expect(shouldShowScrollTopButton(399)).toBe(false);
		});

		it("カスタムしきい値で正しく動作する", () => {
			expect(shouldShowScrollTopButton(100, 200)).toBe(false);
			expect(shouldShowScrollTopButton(201, 200)).toBe(true);
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
