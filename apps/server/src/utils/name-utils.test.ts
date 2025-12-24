import { describe, expect, it } from "bun:test";
import {
	generateNameInfo,
	generateSortName,
	isEnglishOnly,
	normalizeFullWidthSymbols,
	parseDiscInfo,
	parseEventEdition,
} from "./name-utils";

describe("isEnglishOnly", () => {
	it("英語のみの文字列でtrueを返す", () => {
		expect(isEnglishOnly("Hello World")).toBe(true);
		expect(isEnglishOnly("ARIA")).toBe(true);
		expect(isEnglishOnly("Test 123!")).toBe(true);
		expect(isEnglishOnly("a-z A-Z 0-9")).toBe(true);
	});

	it("日本語を含む文字列でfalseを返す", () => {
		expect(isEnglishOnly("こんにちは")).toBe(false);
		expect(isEnglishOnly("Hello 世界")).toBe(false);
		expect(isEnglishOnly("アルバム")).toBe(false);
		expect(isEnglishOnly("東方")).toBe(false);
	});

	it("空文字列でfalseを返す", () => {
		expect(isEnglishOnly("")).toBe(false);
	});
});

describe("normalizeFullWidthSymbols", () => {
	it("全角記号を半角に変換する", () => {
		expect(normalizeFullWidthSymbols("Ａ／Ｂ")).toBe("Ａ/Ｂ");
		expect(normalizeFullWidthSymbols("サークル：名前")).toBe("サークル:名前");
		expect(normalizeFullWidthSymbols("（注）")).toBe("(注)");
	});

	it("変換不要な文字列はそのまま返す", () => {
		expect(normalizeFullWidthSymbols("Hello World")).toBe("Hello World");
		expect(normalizeFullWidthSymbols("テスト")).toBe("テスト");
	});

	it("複数の全角記号を変換する", () => {
		expect(normalizeFullWidthSymbols("Ａ／Ｂ：Ｃ　Ｄ")).toBe("Ａ/Ｂ:Ｃ Ｄ");
	});
});

describe("parseDiscInfo", () => {
	it("DISC-1パターンを解析する", () => {
		expect(parseDiscInfo("アルバム名 DISC-1")).toEqual({
			name: "アルバム名",
			discNumber: 1,
		});
		expect(parseDiscInfo("アルバム名 DISC-2")).toEqual({
			name: "アルバム名",
			discNumber: 2,
		});
	});

	it("Disc 1パターンを解析する", () => {
		expect(parseDiscInfo("アルバム名 Disc 1")).toEqual({
			name: "アルバム名",
			discNumber: 1,
		});
		expect(parseDiscInfo("アルバム名 Disc 2")).toEqual({
			name: "アルバム名",
			discNumber: 2,
		});
	});

	it("disc1パターンを解析する", () => {
		expect(parseDiscInfo("アルバム名 disc1")).toEqual({
			name: "アルバム名",
			discNumber: 1,
		});
	});

	it("ディスク情報がない場合はディスク1として返す", () => {
		expect(parseDiscInfo("アルバム名")).toEqual({
			name: "アルバム名",
			discNumber: 1,
		});
	});

	it("空文字列を処理する", () => {
		expect(parseDiscInfo("")).toEqual({
			name: "",
			discNumber: 1,
		});
	});
});

describe("parseEventEdition", () => {
	it("末尾の数字を回次として解析する", () => {
		expect(parseEventEdition("コミックマーケット108")).toEqual({
			baseName: "コミックマーケット",
			edition: 108,
		});
		expect(parseEventEdition("博麗神社例大祭21")).toEqual({
			baseName: "博麗神社例大祭",
			edition: 21,
		});
	});

	it("第XX回パターンを解析する", () => {
		expect(parseEventEdition("博麗神社例大祭 第21回")).toEqual({
			baseName: "博麗神社例大祭",
			edition: 21,
		});
	});

	it("Vol.Xパターンを解析する", () => {
		expect(parseEventEdition("M3 Vol.5")).toEqual({
			baseName: "M3",
			edition: 5,
		});
	});

	it("年度を含むイベント名は回次として認識しない", () => {
		expect(parseEventEdition("M3 2024春")).toEqual({
			baseName: "M3 2024春",
			edition: null,
		});
	});

	it("回次がないイベント名はそのまま返す", () => {
		expect(parseEventEdition("音楽イベント")).toEqual({
			baseName: "音楽イベント",
			edition: null,
		});
	});
});

describe("generateNameInfo", () => {
	it("英語のみの名前はnameJaとnameEnの両方に設定する", () => {
		expect(generateNameInfo("ARIA")).toEqual({
			name: "ARIA",
			nameJa: "ARIA",
			nameEn: "ARIA",
		});
	});

	it("日本語を含む名前はnameJaに設定する", () => {
		expect(generateNameInfo("東方アルバム")).toEqual({
			name: "東方アルバム",
			nameJa: "東方アルバム",
			nameEn: null,
		});
	});

	it("全角記号を半角に変換する", () => {
		expect(generateNameInfo("サークル／名前")).toEqual({
			name: "サークル/名前",
			nameJa: "サークル/名前",
			nameEn: null,
		});
	});
});

describe("generateSortName", () => {
	it("英語のみの名前は小文字で返す", () => {
		expect(generateSortName("ARIA")).toBe("aria");
		expect(generateSortName("Hello World")).toBe("hello world");
	});

	it("日本語を含む名前はnullを返す", () => {
		expect(generateSortName("東方")).toBe(null);
		expect(generateSortName("あいう")).toBe(null);
	});
});
