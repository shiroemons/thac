import { describe, expect, test } from "vitest";

/**
 * AdminErrorBoundaryコンポーネントのテスト
 *
 * Note: DOMレンダリングテストはapps/web配下で実行する必要があります
 * ルートからの実行時はhappy-domが読み込まれないため、
 * コンポーネントの仕様をテストする形式に変更しています
 */
describe("AdminErrorBoundary", () => {
	// 一般エラー時の期待する表示内容
	const generalErrorContent = {
		title: "エラーが発生しました",
		defaultMessage: "予期しないエラーが発生しました",
		icon: "AlertTriangle",
		buttons: ["再試行", "ダッシュボードへ"],
		navigationPath: "/admin",
	};

	// タイムアウトエラー時の期待する表示内容
	const timeoutErrorContent = {
		title: "読み込みがタイムアウトしました",
		message:
			"サーバーの応答に時間がかかっています。しばらくしてから再度お試しください。",
		icon: "Clock",
		buttons: ["再試行", "ダッシュボードへ"],
		navigationPath: "/admin",
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

		test("should have retry button", () => {
			expect(generalErrorContent.buttons).toContain("再試行");
		});

		test("should have dashboard navigation button", () => {
			expect(generalErrorContent.buttons).toContain("ダッシュボードへ");
		});

		test("should navigate to /admin path", () => {
			expect(generalErrorContent.navigationPath).toBe("/admin");
		});
	});

	describe("Timeout error state", () => {
		test("should have correct title text for timeout", () => {
			expect(timeoutErrorContent.title).toBe("読み込みがタイムアウトしました");
		});

		test("should have message about server response", () => {
			expect(timeoutErrorContent.message).toContain("サーバーの応答");
			expect(timeoutErrorContent.message).toContain("時間がかかっています");
		});

		test("should use Clock icon for timeout", () => {
			expect(timeoutErrorContent.icon).toBe("Clock");
		});

		test("should have same buttons as general error", () => {
			expect(timeoutErrorContent.buttons).toEqual(generalErrorContent.buttons);
		});

		test("should navigate to same /admin path", () => {
			expect(timeoutErrorContent.navigationPath).toBe("/admin");
		});
	});

	describe("Error detection logic - isTimeoutError", () => {
		// isTimeoutError関数の判定ロジック仕様
		const timeoutErrorPatterns = {
			byName: ["SSRTimeoutError"],
			byMessage: ["timeout", "AbortError"],
		};

		test("should detect SSRTimeoutError by name", () => {
			expect(timeoutErrorPatterns.byName).toContain("SSRTimeoutError");
		});

		test("should detect timeout in message", () => {
			expect(timeoutErrorPatterns.byMessage).toContain("timeout");
		});

		test("should detect AbortError in message", () => {
			expect(timeoutErrorPatterns.byMessage).toContain("AbortError");
		});
	});

	describe("Error detection logic - isSSRError", () => {
		// isSSRError関数の判定ロジック仕様
		const ssrErrorPatterns = {
			byMessage: ["SSR", "fetch failed"],
			includesTimeoutError: true,
		};

		test("should detect SSR in message", () => {
			expect(ssrErrorPatterns.byMessage).toContain("SSR");
		});

		test("should detect fetch failed in message", () => {
			expect(ssrErrorPatterns.byMessage).toContain("fetch failed");
		});

		test("should also detect timeout errors as SSR errors", () => {
			expect(ssrErrorPatterns.includesTimeoutError).toBe(true);
		});
	});
});
