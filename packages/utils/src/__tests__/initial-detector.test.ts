import { describe, expect, test } from "bun:test";
import { detectInitial, INITIAL_SCRIPTS } from "../initial-detector";

describe("initial-detector", () => {
	describe("INITIAL_SCRIPTS constant", () => {
		test("should have all expected script types", () => {
			expect(INITIAL_SCRIPTS).toEqual([
				"latin",
				"hiragana",
				"katakana",
				"kanji",
				"digit",
				"symbol",
				"other",
			]);
		});
	});

	describe("detectInitial", () => {
		describe("Latin characters", () => {
			test("should detect uppercase Latin and return uppercase initial", () => {
				const result = detectInitial("Beatles");
				expect(result.initialScript).toBe("latin");
				expect(result.nameInitial).toBe("B");
			});

			test("should detect lowercase Latin and return uppercase initial", () => {
				const result = detectInitial("beatles");
				expect(result.initialScript).toBe("latin");
				expect(result.nameInitial).toBe("B");
			});

			test("should detect full-width Latin and return half-width uppercase initial", () => {
				const result = detectInitial("Ｂｅａｔｌｅｓ");
				expect(result.initialScript).toBe("latin");
				expect(result.nameInitial).toBe("B");
			});

			test("should detect full-width lowercase Latin", () => {
				const result = detectInitial("ａｂｃ");
				expect(result.initialScript).toBe("latin");
				expect(result.nameInitial).toBe("A");
			});
		});

		describe("Hiragana characters", () => {
			test("should detect hiragana and return initial as-is", () => {
				const result = detectInitial("あいうえお");
				expect(result.initialScript).toBe("hiragana");
				expect(result.nameInitial).toBe("あ");
			});

			test("should detect hiragana with dakuten and remove it", () => {
				const result = detectInitial("がっこう");
				expect(result.initialScript).toBe("hiragana");
				expect(result.nameInitial).toBe("か");
			});

			test("should detect hiragana with handakuten and remove it", () => {
				const result = detectInitial("ぴあの");
				expect(result.initialScript).toBe("hiragana");
				expect(result.nameInitial).toBe("ひ");
			});

			test("should handle all voiced consonants (が行)", () => {
				expect(detectInitial("がんばる").nameInitial).toBe("か");
				expect(detectInitial("ぎんこう").nameInitial).toBe("き");
				expect(detectInitial("ぐんま").nameInitial).toBe("く");
				expect(detectInitial("げんき").nameInitial).toBe("け");
				expect(detectInitial("ごはん").nameInitial).toBe("こ");
			});

			test("should handle all voiced consonants (ざ行)", () => {
				expect(detectInitial("ざっし").nameInitial).toBe("さ");
				expect(detectInitial("じかん").nameInitial).toBe("し");
				expect(detectInitial("ずつう").nameInitial).toBe("す");
				expect(detectInitial("ぜんぶ").nameInitial).toBe("せ");
				expect(detectInitial("ぞうさん").nameInitial).toBe("そ");
			});

			test("should handle all voiced consonants (だ行)", () => {
				expect(detectInitial("だいがく").nameInitial).toBe("た");
				expect(detectInitial("ぢめん").nameInitial).toBe("ち");
				expect(detectInitial("づつ").nameInitial).toBe("つ");
				expect(detectInitial("でんわ").nameInitial).toBe("て");
				expect(detectInitial("どうぶつ").nameInitial).toBe("と");
			});

			test("should handle all voiced consonants (ば行)", () => {
				expect(detectInitial("ばなな").nameInitial).toBe("は");
				expect(detectInitial("びっくり").nameInitial).toBe("ひ");
				expect(detectInitial("ぶどう").nameInitial).toBe("ふ");
				expect(detectInitial("べんきょう").nameInitial).toBe("へ");
				expect(detectInitial("ぼうし").nameInitial).toBe("ほ");
			});

			test("should handle all semi-voiced consonants (ぱ行)", () => {
				expect(detectInitial("ぱん").nameInitial).toBe("は");
				expect(detectInitial("ぴあの").nameInitial).toBe("ひ");
				expect(detectInitial("ぷりん").nameInitial).toBe("ふ");
				expect(detectInitial("ぺん").nameInitial).toBe("へ");
				expect(detectInitial("ぽすと").nameInitial).toBe("ほ");
			});
		});

		describe("Katakana characters", () => {
			test("should detect katakana and convert to hiragana", () => {
				const result = detectInitial("アイウエオ");
				expect(result.initialScript).toBe("katakana");
				expect(result.nameInitial).toBe("あ");
			});

			test("should detect katakana with dakuten and convert to unvoiced hiragana", () => {
				const result = detectInitial("ガッコウ");
				expect(result.initialScript).toBe("katakana");
				expect(result.nameInitial).toBe("か");
			});

			test("should detect katakana with handakuten and convert to unvoiced hiragana", () => {
				const result = detectInitial("ピアノ");
				expect(result.initialScript).toBe("katakana");
				expect(result.nameInitial).toBe("ひ");
			});

			test("should detect half-width katakana and convert to hiragana", () => {
				const result = detectInitial("ｱｲｳｴｵ");
				expect(result.initialScript).toBe("katakana");
				expect(result.nameInitial).toBe("あ");
			});

			test("should handle various half-width katakana", () => {
				expect(detectInitial("ｶ").nameInitial).toBe("か");
				expect(detectInitial("ｻ").nameInitial).toBe("さ");
				expect(detectInitial("ﾀ").nameInitial).toBe("た");
				expect(detectInitial("ﾅ").nameInitial).toBe("な");
				expect(detectInitial("ﾊ").nameInitial).toBe("は");
			});

			test("should detect wa-gyou dakuon and convert to hiragana", () => {
				// ヷヸヹヺ → わゐゑを
				expect(detectInitial("ヷイオリン")).toEqual({
					initialScript: "katakana",
					nameInitial: "わ",
				});
				expect(detectInitial("ヸ")).toEqual({
					initialScript: "katakana",
					nameInitial: "ゐ",
				});
				expect(detectInitial("ヹ")).toEqual({
					initialScript: "katakana",
					nameInitial: "ゑ",
				});
				expect(detectInitial("ヺ")).toEqual({
					initialScript: "katakana",
					nameInitial: "を",
				});
			});
		});

		describe("Kanji characters", () => {
			test("should detect kanji and return null for initial", () => {
				const result = detectInitial("上海アリス");
				expect(result.initialScript).toBe("kanji");
				expect(result.nameInitial).toBeNull();
			});

			test("should detect various kanji", () => {
				expect(detectInitial("東方").initialScript).toBe("kanji");
				expect(detectInitial("東方").nameInitial).toBeNull();
				expect(detectInitial("神社").initialScript).toBe("kanji");
				expect(detectInitial("幻想").initialScript).toBe("kanji");
			});
		});

		describe("Digit characters", () => {
			test("should detect half-width digits and return null for initial", () => {
				const result = detectInitial("123abc");
				expect(result.initialScript).toBe("digit");
				expect(result.nameInitial).toBeNull();
			});

			test("should detect full-width digits and return null for initial", () => {
				const result = detectInitial("１２３");
				expect(result.initialScript).toBe("digit");
				expect(result.nameInitial).toBeNull();
			});
		});

		describe("Symbol characters", () => {
			test("should detect symbols and return null for initial", () => {
				const result = detectInitial("@test");
				expect(result.initialScript).toBe("symbol");
				expect(result.nameInitial).toBeNull();
			});

			test("should detect space as symbol", () => {
				const result = detectInitial(" test");
				expect(result.initialScript).toBe("symbol");
				expect(result.nameInitial).toBeNull();
			});

			test("should detect various symbols", () => {
				expect(detectInitial("!test").initialScript).toBe("symbol");
				expect(detectInitial("#test").initialScript).toBe("symbol");
				expect(detectInitial("$test").initialScript).toBe("symbol");
				expect(detectInitial("・test").initialScript).toBe("symbol");
				expect(detectInitial("　test").initialScript).toBe("symbol"); // full-width space
			});
		});

		describe("Empty and edge cases", () => {
			test("should handle empty string", () => {
				const result = detectInitial("");
				expect(result.initialScript).toBe("other");
				expect(result.nameInitial).toBeNull();
			});

			test("should handle whitespace-only string", () => {
				const result = detectInitial("   ");
				expect(result.initialScript).toBe("symbol");
				expect(result.nameInitial).toBeNull();
			});

			test("should only consider the first character", () => {
				// First char is Latin, even though rest is kanji
				const result = detectInitial("A東方");
				expect(result.initialScript).toBe("latin");
				expect(result.nameInitial).toBe("A");
			});
		});

		describe("Real-world examples", () => {
			test("should handle artist names correctly", () => {
				// ZUN
				expect(detectInitial("ZUN")).toEqual({
					initialScript: "latin",
					nameInitial: "Z",
				});

				// 上海アリス幻樂団
				expect(detectInitial("上海アリス幻樂団")).toEqual({
					initialScript: "kanji",
					nameInitial: null,
				});

				// ビートまりお
				expect(detectInitial("ビートまりお")).toEqual({
					initialScript: "katakana",
					nameInitial: "ひ",
				});

				// Sound Holic
				expect(detectInitial("Sound Holic")).toEqual({
					initialScript: "latin",
					nameInitial: "S",
				});
			});
		});
	});
});
