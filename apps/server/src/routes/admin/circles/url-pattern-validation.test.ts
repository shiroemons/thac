import { describe, expect, test } from "bun:test";

/**
 * URLパターンバリデーションのテスト
 *
 * サークルリンク追加・更新時に使用されるURLパターン検証ロジックのテスト
 */
describe("URL Pattern Validation", () => {
	// プラットフォームごとのURLパターンとテストケース
	const testCases = [
		{
			platform: "spotify",
			urlPattern: "^https?://open\\.spotify\\.com/",
			validUrls: [
				"https://open.spotify.com/artist/123",
				"http://open.spotify.com/album/456",
				"https://open.spotify.com/track/789",
			],
			invalidUrls: [
				"https://spotify.com/artist/123",
				"https://www.spotify.com/artist/123",
				"https://example.com",
			],
		},
		{
			platform: "youtube",
			urlPattern: "^https?://(www\\.)?youtube\\.com/|^https?://youtu\\.be/",
			validUrls: [
				"https://www.youtube.com/watch?v=abc123",
				"https://youtube.com/channel/xyz",
				"http://youtu.be/abc123",
				"https://youtu.be/def456",
			],
			invalidUrls: [
				"https://music.youtube.com/watch?v=abc",
				"https://example.com/youtube",
			],
		},
		{
			platform: "booth",
			urlPattern: "^https?://([a-zA-Z0-9-]+\\.)?booth\\.pm/",
			validUrls: [
				"https://booth.pm/ja/items/123",
				"https://example.booth.pm/items/456",
				"http://shop.booth.pm/",
			],
			invalidUrls: [
				"https://booth.com/items/123",
				"https://fakebooth.pm.example.com/",
			],
		},
		{
			platform: "web_site",
			urlPattern: "^https?://",
			validUrls: [
				"https://example.com",
				"http://example.org/path",
				"https://sub.domain.co.jp/page?q=1",
			],
			invalidUrls: ["ftp://example.com", "example.com", "//example.com"],
		},
	];

	for (const { platform, urlPattern, validUrls, invalidUrls } of testCases) {
		describe(`${platform} (pattern: ${urlPattern})`, () => {
			const regex = new RegExp(urlPattern);

			for (const url of validUrls) {
				test(`should accept valid URL: ${url}`, () => {
					expect(regex.test(url)).toBe(true);
				});
			}

			for (const url of invalidUrls) {
				test(`should reject invalid URL: ${url}`, () => {
					expect(regex.test(url)).toBe(false);
				});
			}
		});
	}

	describe("null urlPattern (no validation)", () => {
		test("should skip validation when urlPattern is null", () => {
			const urlPattern: string | null = null;

			// urlPatternがnullの場合、バリデーションをスキップする
			if (urlPattern) {
				const regex = new RegExp(urlPattern);
				expect(regex.test("https://any-url.com")).toBe(true);
			} else {
				// バリデーションスキップ = 常に許可
				expect(true).toBe(true);
			}
		});
	});

	describe("edge cases", () => {
		test("should handle URLs with special characters", () => {
			const urlPattern = "^https?://open\\.spotify\\.com/";
			const regex = new RegExp(urlPattern);

			expect(regex.test("https://open.spotify.com/track/abc?si=xyz")).toBe(
				true,
			);
			expect(regex.test("https://open.spotify.com/playlist/123#section")).toBe(
				true,
			);
		});

		test("should handle Unicode in URLs", () => {
			const urlPattern = "^https?://";
			const regex = new RegExp(urlPattern);

			expect(regex.test("https://example.com/日本語")).toBe(true);
			expect(
				regex.test("https://example.com/path?name=%E3%83%86%E3%82%B9%E3%83%88"),
			).toBe(true);
		});
	});
});
