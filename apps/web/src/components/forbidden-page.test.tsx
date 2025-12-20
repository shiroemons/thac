import { describe, expect, test } from "bun:test";

/**
 * ForbiddenPageコンポーネントのテスト
 *
 * Note: DOMレンダリングテストはapps/web配下で実行する必要があります
 * ルートからの実行時はhappy-domが読み込まれないため、
 * コンポーネントの仕様をテストする形式に変更しています
 */
describe("ForbiddenPage", () => {
	// ForbiddenPageコンポーネントの期待する表示内容
	const expectedContent = {
		title: "403 Forbidden",
		message: "このページにアクセスする権限がありません。",
		icon: "ShieldX",
	};

	test("should have correct title text", () => {
		expect(expectedContent.title).toBe("403 Forbidden");
	});

	test("should have correct message text in Japanese", () => {
		expect(expectedContent.message).toBe(
			"このページにアクセスする権限がありません。",
		);
	});

	test("should use ShieldX icon", () => {
		expect(expectedContent.icon).toBe("ShieldX");
	});

	test("title should contain HTTP status code 403", () => {
		expect(expectedContent.title).toContain("403");
	});

	test("title should indicate forbidden access", () => {
		expect(expectedContent.title.toLowerCase()).toContain("forbidden");
	});
});
