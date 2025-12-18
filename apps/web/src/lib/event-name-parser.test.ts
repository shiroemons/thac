import { describe, expect, test } from "bun:test";
import {
	extractEdition,
	kanjiToNumber,
	suggestFromEventName,
} from "./event-name-parser";

describe("kanjiToNumber", () => {
	describe("単純な漢数字", () => {
		test("一 → 1", () => {
			expect(kanjiToNumber("一")).toBe(1);
		});

		test("壱 → 1", () => {
			expect(kanjiToNumber("壱")).toBe(1);
		});

		test("二 → 2", () => {
			expect(kanjiToNumber("二")).toBe(2);
		});

		test("弐 → 2", () => {
			expect(kanjiToNumber("弐")).toBe(2);
		});

		test("三 → 3", () => {
			expect(kanjiToNumber("三")).toBe(3);
		});

		test("参 → 3", () => {
			expect(kanjiToNumber("参")).toBe(3);
		});

		test("九 → 9", () => {
			expect(kanjiToNumber("九")).toBe(9);
		});

		test("〇 → 0 (ゼロを表す)", () => {
			expect(kanjiToNumber("〇")).toBe(null); // 0は回次として使用しないのでnull
		});
	});

	describe("大字（旧字体）", () => {
		test("壹 → 1", () => {
			expect(kanjiToNumber("壹")).toBe(1);
		});

		test("貳 → 2", () => {
			expect(kanjiToNumber("貳")).toBe(2);
		});

		test("貮 → 2", () => {
			expect(kanjiToNumber("貮")).toBe(2);
		});

		test("參 → 3", () => {
			expect(kanjiToNumber("參")).toBe(3);
		});

		test("肆 → 4", () => {
			expect(kanjiToNumber("肆")).toBe(4);
		});

		test("伍 → 5", () => {
			expect(kanjiToNumber("伍")).toBe(5);
		});

		test("陸 → 6", () => {
			expect(kanjiToNumber("陸")).toBe(6);
		});

		test("漆 → 7", () => {
			expect(kanjiToNumber("漆")).toBe(7);
		});

		test("柒 → 7", () => {
			expect(kanjiToNumber("柒")).toBe(7);
		});

		test("捌 → 8", () => {
			expect(kanjiToNumber("捌")).toBe(8);
		});

		test("玖 → 9", () => {
			expect(kanjiToNumber("玖")).toBe(9);
		});

		test("拾 → 10", () => {
			expect(kanjiToNumber("拾")).toBe(10);
		});

		test("拾壱 → 11", () => {
			expect(kanjiToNumber("拾壱")).toBe(11);
		});

		test("弐拾壱 → 21", () => {
			expect(kanjiToNumber("弐拾壱")).toBe(21);
		});
	});

	describe("十を含む漢数字", () => {
		test("十 → 10", () => {
			expect(kanjiToNumber("十")).toBe(10);
		});

		test("十一 → 11", () => {
			expect(kanjiToNumber("十一")).toBe(11);
		});

		test("二十 → 20", () => {
			expect(kanjiToNumber("二十")).toBe(20);
		});

		test("二十一 → 21", () => {
			expect(kanjiToNumber("二十一")).toBe(21);
		});

		test("九十九 → 99", () => {
			expect(kanjiToNumber("九十九")).toBe(99);
		});
	});

	describe("百を含む漢数字", () => {
		test("百 → 100", () => {
			expect(kanjiToNumber("百")).toBe(100);
		});

		test("百一 → 101", () => {
			expect(kanjiToNumber("百一")).toBe(101);
		});

		test("百二十三 → 123", () => {
			expect(kanjiToNumber("百二十三")).toBe(123);
		});

		test("三百 → 300", () => {
			expect(kanjiToNumber("三百")).toBe(300);
		});
	});

	describe("無効な入力", () => {
		test("空文字 → null", () => {
			expect(kanjiToNumber("")).toBe(null);
		});

		test("ひらがな → null", () => {
			expect(kanjiToNumber("いち")).toBe(null);
		});

		test("アラビア数字 → null", () => {
			expect(kanjiToNumber("123")).toBe(null);
		});
	});
});

describe("extractEdition", () => {
	describe("アラビア数字", () => {
		test("101 → 101", () => {
			expect(extractEdition("101")).toBe(101);
		});

		test("C104 → 104", () => {
			expect(extractEdition("C104")).toBe(104);
		});

		test("第21回 (アラビア数字) → 21", () => {
			expect(extractEdition("第21回")).toBe(21);
		});
	});

	describe("第〇回パターン", () => {
		test("第一回 → 1", () => {
			expect(extractEdition("第一回")).toBe(1);
		});

		test("第二十一回 → 21", () => {
			expect(extractEdition("第二十一回")).toBe(21);
		});

		test("第百回 → 100", () => {
			expect(extractEdition("第百回")).toBe(100);
		});
	});

	describe("第〇幕パターン", () => {
		test("第壱幕 → 1", () => {
			expect(extractEdition("第壱幕")).toBe(1);
		});

		test("第弐幕 → 2", () => {
			expect(extractEdition("第弐幕")).toBe(2);
		});

		test("第参幕 → 3", () => {
			expect(extractEdition("第参幕")).toBe(3);
		});

		test("第十幕 → 10", () => {
			expect(extractEdition("第十幕")).toBe(10);
		});
	});

	describe("その他のパターン", () => {
		test("第五章 → 5", () => {
			expect(extractEdition("第五章")).toBe(5);
		});

		test("第三弾 → 3", () => {
			expect(extractEdition("第三弾")).toBe(3);
		});

		test("第七夜 → 7", () => {
			expect(extractEdition("第七夜")).toBe(7);
		});

		test("第四祭 → 4", () => {
			expect(extractEdition("第四祭")).toBe(4);
		});
	});

	describe("単独の漢数字", () => {
		test("壱 → 1", () => {
			expect(extractEdition("壱")).toBe(1);
		});

		test("弐幕 → 2", () => {
			expect(extractEdition("弐幕")).toBe(2);
		});
	});

	describe("大字（旧字体）を含むパターン", () => {
		test("第肆幕 → 4", () => {
			expect(extractEdition("第肆幕")).toBe(4);
		});

		test("第伍回 → 5", () => {
			expect(extractEdition("第伍回")).toBe(5);
		});

		test("第陸章 → 6", () => {
			expect(extractEdition("第陸章")).toBe(6);
		});

		test("第漆夜 → 7", () => {
			expect(extractEdition("第漆夜")).toBe(7);
		});

		test("第捌弾 → 8", () => {
			expect(extractEdition("第捌弾")).toBe(8);
		});

		test("第玖回 → 9", () => {
			expect(extractEdition("第玖回")).toBe(9);
		});

		test("第拾壱回 → 11", () => {
			expect(extractEdition("第拾壱回")).toBe(11);
		});
	});

	describe("無効な入力", () => {
		test("空文字 → null", () => {
			expect(extractEdition("")).toBe(null);
		});

		test("数字なし → null", () => {
			expect(extractEdition("イベント")).toBe(null);
		});
	});
});

describe("suggestFromEventName", () => {
	const seriesList = [
		{ id: "comiket", name: "コミックマーケット" },
		{ id: "reitaisai", name: "博麗神社例大祭" },
		{ id: "kouroumu", name: "紅楼夢" },
		{ id: "touhou-kouroumu", name: "東方紅楼夢" },
	];

	describe("シリーズと回次の両方を推察", () => {
		test("コミックマーケット101 → シリーズ: comiket, 回次: 101", () => {
			const result = suggestFromEventName("コミックマーケット101", seriesList);
			expect(result.seriesId).toBe("comiket");
			expect(result.edition).toBe(101);
		});

		test("コミックマーケットC104 → シリーズ: comiket, 回次: 104", () => {
			const result = suggestFromEventName("コミックマーケットC104", seriesList);
			expect(result.seriesId).toBe("comiket");
			expect(result.edition).toBe(104);
		});

		test("博麗神社例大祭21 → シリーズ: reitaisai, 回次: 21", () => {
			const result = suggestFromEventName("博麗神社例大祭21", seriesList);
			expect(result.seriesId).toBe("reitaisai");
			expect(result.edition).toBe(21);
		});

		test("第二十一回博麗神社例大祭 → シリーズ: reitaisai, 回次: 21", () => {
			const result = suggestFromEventName(
				"第二十一回博麗神社例大祭",
				seriesList,
			);
			expect(result.seriesId).toBe("reitaisai");
			expect(result.edition).toBe(21);
		});
	});

	describe("漢数字を含むイベント名", () => {
		test("紅楼夢第壱幕 → シリーズ: kouroumu, 回次: 1", () => {
			const result = suggestFromEventName("紅楼夢第壱幕", seriesList);
			expect(result.seriesId).toBe("kouroumu");
			expect(result.edition).toBe(1);
		});

		test("東方紅楼夢第十回 → シリーズ: touhou-kouroumu, 回次: 10", () => {
			const result = suggestFromEventName("東方紅楼夢第十回", seriesList);
			expect(result.seriesId).toBe("touhou-kouroumu");
			expect(result.edition).toBe(10);
		});
	});

	describe("シリーズのみ推察（回次なし）", () => {
		test("コミックマーケット → シリーズ: comiket, 回次: null", () => {
			const result = suggestFromEventName("コミックマーケット", seriesList);
			expect(result.seriesId).toBe("comiket");
			expect(result.edition).toBe(null);
		});
	});

	describe("長いシリーズ名を優先", () => {
		test("東方紅楼夢20 → シリーズ: touhou-kouroumu (紅楼夢より長い方)", () => {
			const result = suggestFromEventName("東方紅楼夢20", seriesList);
			expect(result.seriesId).toBe("touhou-kouroumu");
			expect(result.edition).toBe(20);
		});
	});

	describe("マッチしないケース", () => {
		test("未知のイベント → シリーズ: null, 回次: null", () => {
			const result = suggestFromEventName("未知のイベント", seriesList);
			expect(result.seriesId).toBe(null);
			expect(result.edition).toBe(null);
		});

		test("未知のイベント第5回 → シリーズ: null, 回次: 5", () => {
			const result = suggestFromEventName("未知のイベント第5回", seriesList);
			expect(result.seriesId).toBe(null);
			expect(result.edition).toBe(5);
		});
	});

	describe("空のシリーズリスト", () => {
		test("シリーズリストが空 → シリーズ: null, 回次: null", () => {
			const result = suggestFromEventName("コミックマーケット101", []);
			expect(result.seriesId).toBe(null);
			expect(result.edition).toBe(null);
		});
	});

	describe("空のイベント名", () => {
		test("イベント名が空 → シリーズ: null, 回次: null", () => {
			const result = suggestFromEventName("", seriesList);
			expect(result.seriesId).toBe(null);
			expect(result.edition).toBe(null);
		});

		test("イベント名が空白のみ → シリーズ: null, 回次: null", () => {
			const result = suggestFromEventName("   ", seriesList);
			expect(result.seriesId).toBe(null);
			expect(result.edition).toBe(null);
		});
	});
});
