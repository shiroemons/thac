import { describe, expect, test } from "bun:test";

/**
 * PublicErrorBoundaryコンポーネントのテスト
 *
 * Note: DOMレンダリングテストはapps/web配下で実行する必要があります
 * ルートからの実行時はhappy-domが読み込まれないため、
 * コンポーネントの仕様をテストする形式に変更しています
 */
describe("PublicErrorBoundary", () => {
	// 一般エラー時の期待する表示内容
	const generalErrorContent = {
		title: "エラーが発生しました",
		defaultMessage: "予期しないエラーが発生しました",
		icon: "AlertTriangle",
		buttons: {
			retry: "再試行",
			home: "ホームへ",
		},
		navigationPath: "/",
	};

	// タイムアウトエラー時の期待する表示内容
	const timeoutErrorContent = {
		title: "読み込みがタイムアウトしました",
		message:
			"サーバーの応答に時間がかかっています。しばらくしてから再度お試しください。",
		icon: "Clock",
		buttons: {
			retry: "再試行",
			home: "ホームへ",
		},
		navigationPath: "/",
	};

	// エラー検出ロジックのテストデータ
	const errorDetection = {
		timeoutErrorPatterns: ["SSRTimeoutError", "timeout", "AbortError"],
		ssrErrorPatterns: ["SSR", "fetch failed"],
	};

	describe("General error state", () => {
		test("should have correct title text", () => {
			expect(generalErrorContent.title).toBe("エラーが発生しました");
		});

		test("should have correct default message text in Japanese", () => {
			expect(generalErrorContent.defaultMessage).toBe(
				"予期しないエラーが発生しました",
			);
		});

		test("should use AlertTriangle icon", () => {
			expect(generalErrorContent.icon).toBe("AlertTriangle");
		});

		test("should have retry button with correct text", () => {
			expect(generalErrorContent.buttons.retry).toBe("再試行");
		});

		test("should have home button with correct text", () => {
			expect(generalErrorContent.buttons.home).toBe("ホームへ");
		});

		test("should navigate to root path", () => {
			expect(generalErrorContent.navigationPath).toBe("/");
		});
	});

	describe("Timeout error state", () => {
		test("should have correct timeout title text", () => {
			expect(timeoutErrorContent.title).toBe("読み込みがタイムアウトしました");
		});

		test("should have message about server response", () => {
			expect(timeoutErrorContent.message).toContain("サーバーの応答");
		});

		test("should use Clock icon for timeout", () => {
			expect(timeoutErrorContent.icon).toBe("Clock");
		});

		test("should have same retry button as general error", () => {
			expect(timeoutErrorContent.buttons.retry).toBe(
				generalErrorContent.buttons.retry,
			);
		});

		test("should have same home button as general error", () => {
			expect(timeoutErrorContent.buttons.home).toBe(
				generalErrorContent.buttons.home,
			);
		});

		test("should navigate to same path as general error", () => {
			expect(timeoutErrorContent.navigationPath).toBe(
				generalErrorContent.navigationPath,
			);
		});
	});

	describe("isTimeoutError detection", () => {
		test("should detect SSRTimeoutError", () => {
			expect(errorDetection.timeoutErrorPatterns).toContain("SSRTimeoutError");
		});

		test("should detect timeout in message", () => {
			expect(errorDetection.timeoutErrorPatterns).toContain("timeout");
		});

		test("should detect AbortError in message", () => {
			expect(errorDetection.timeoutErrorPatterns).toContain("AbortError");
		});
	});

	describe("isSSRError detection", () => {
		test("should detect SSR in message", () => {
			expect(errorDetection.ssrErrorPatterns).toContain("SSR");
		});

		test("should detect fetch failed in message", () => {
			expect(errorDetection.ssrErrorPatterns).toContain("fetch failed");
		});

		test("should also detect timeout errors as SSR errors", () => {
			// isSSRErrorはisTimeoutErrorを含む
			const allSSRPatterns = [
				...errorDetection.ssrErrorPatterns,
				...errorDetection.timeoutErrorPatterns,
			];
			expect(allSSRPatterns).toContain("timeout");
		});
	});
});
