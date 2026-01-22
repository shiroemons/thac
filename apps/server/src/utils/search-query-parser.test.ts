import { describe, expect, it } from "bun:test";
import {
	buildMeilisearchFilter,
	parseSearchQuery,
} from "./search-query-parser";

describe("parseSearchQuery", () => {
	describe("フィルター抽出", () => {
		it("arrangerフィルターを抽出する", () => {
			const result = parseSearchQuery("arranger:ARM");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.arrangerNames).toEqual(["ARM"]);
		});

		it("vocalistフィルターを抽出する", () => {
			const result = parseSearchQuery("vocalist:miko");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.vocalistNames).toEqual(["miko"]);
		});

		it("lyricistフィルターを抽出する", () => {
			const result = parseSearchQuery("lyricist:夕野ヨシミ");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.lyricistNames).toEqual(["夕野ヨシミ"]);
		});

		it("circleフィルターを抽出する", () => {
			const result = parseSearchQuery("circle:IOSYS");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.circleNames).toEqual(["IOSYS"]);
		});

		it("yearフィルターを抽出する", () => {
			const result = parseSearchQuery("year:2023");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.releaseYear).toEqual({ op: "=", value: 2023 });
		});

		it("originalcountフィルターを抽出する", () => {
			const result = parseSearchQuery("originalcount:3");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.originalSongCount).toEqual({ op: "=", value: 3 });
		});

		it("composerフィルターを抽出する", () => {
			const result = parseSearchQuery("composer:ZUN");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.composerNames).toEqual(["ZUN"]);
		});

		it("vocalistcountフィルターを抽出する", () => {
			const result = parseSearchQuery("vocalistcount:2");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.vocalistCount).toEqual({ op: "=", value: 2 });
		});

		it("arrangercountフィルターを抽出する", () => {
			const result = parseSearchQuery("arrangercount:1");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.arrangerCount).toEqual({ op: "=", value: 1 });
		});

		it("lyricistcountフィルターを抽出する", () => {
			const result = parseSearchQuery("lyricistcount:0");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.lyricistCount).toEqual({ op: "=", value: 0 });
		});

		it("composercountフィルターを抽出する", () => {
			const result = parseSearchQuery("composercount:1");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.composerCount).toEqual({ op: "=", value: 1 });
		});

		it("eventフィルターを抽出する", () => {
			const result = parseSearchQuery('event:"コミックマーケット100"');
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.eventName).toBe("コミックマーケット100");
		});

		it("originalsongフィルターを抽出する", () => {
			const result = parseSearchQuery("originalsong:赤より紅い夢");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.originalSongNames).toEqual(["赤より紅い夢"]);
		});

		it("同じoriginalsongフィルターを複数回指定する（AND条件）", () => {
			const result = parseSearchQuery(
				'originalsong:赤より紅い夢 originalsong:"Bad Apple!!"',
			);
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.originalSongNames).toEqual([
				"赤より紅い夢",
				"Bad Apple!!",
			]);
		});
	});

	describe("クォート値の処理", () => {
		it("ダブルクォートで囲まれた値を処理する", () => {
			const result = parseSearchQuery('circle:"COOL&CREATE"');
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.circleNames).toEqual(["COOL&CREATE"]);
		});

		it("シングルクォートで囲まれた値を処理する", () => {
			const result = parseSearchQuery("circle:'COOL&CREATE'");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.circleNames).toEqual(["COOL&CREATE"]);
		});

		it("スペースを含む値をクォートで処理する", () => {
			const result = parseSearchQuery('arranger:"ALiCE\'S EMOTiON"');
			expect(result.filters.arrangerNames).toEqual(["ALiCE'S EMOTiON"]);
		});
	});

	describe("比較演算子", () => {
		it(">=演算子を処理する", () => {
			const result = parseSearchQuery("originalcount:>=3");
			expect(result.filters.originalSongCount).toEqual({ op: ">=", value: 3 });
		});

		it("<=演算子を処理する", () => {
			const result = parseSearchQuery("originalcount:<=5");
			expect(result.filters.originalSongCount).toEqual({ op: "<=", value: 5 });
		});

		it(">演算子を処理する", () => {
			const result = parseSearchQuery("year:>2020");
			expect(result.filters.releaseYear).toEqual({ op: ">", value: 2020 });
		});

		it("<演算子を処理する", () => {
			const result = parseSearchQuery("year:<2024");
			expect(result.filters.releaseYear).toEqual({ op: "<", value: 2024 });
		});

		it("vocalistcountで>=演算子を処理する", () => {
			const result = parseSearchQuery("vocalistcount:>=2");
			expect(result.filters.vocalistCount).toEqual({ op: ">=", value: 2 });
		});

		it("lyricistcountで<=演算子を処理する", () => {
			const result = parseSearchQuery("lyricistcount:<=1");
			expect(result.filters.lyricistCount).toEqual({ op: "<=", value: 1 });
		});

		it("composercountで>演算子を処理する", () => {
			const result = parseSearchQuery("composercount:>0");
			expect(result.filters.composerCount).toEqual({ op: ">", value: 0 });
		});
	});

	describe("複合クエリ", () => {
		it("フルテキストとフィルターを組み合わせる", () => {
			const result = parseSearchQuery("Bad Apple arranger:ARM year:2023");
			expect(result.fullTextQuery).toBe("Bad Apple");
			expect(result.filters.arrangerNames).toEqual(["ARM"]);
			expect(result.filters.releaseYear).toEqual({ op: "=", value: 2023 });
		});

		it("複数のフィルターを組み合わせる", () => {
			const result = parseSearchQuery("vocalist:miko lyricist:夕野ヨシミ");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.vocalistNames).toEqual(["miko"]);
			expect(result.filters.lyricistNames).toEqual(["夕野ヨシミ"]);
		});

		it("同じフィルターを複数回指定する", () => {
			const result = parseSearchQuery("arranger:ARM arranger:ZUN");
			expect(result.filters.arrangerNames).toEqual(["ARM", "ZUN"]);
		});

		it("フルテキストとoriginalsongを組み合わせる", () => {
			const result = parseSearchQuery(
				"Bad Apple originalsong:大吉キトゥン circle:IOSYS",
			);
			expect(result.fullTextQuery).toBe("Bad Apple");
			expect(result.filters.originalSongNames).toEqual(["大吉キトゥン"]);
			expect(result.filters.circleNames).toEqual(["IOSYS"]);
		});

		it("複数のcountフィルターを組み合わせる", () => {
			const result = parseSearchQuery(
				'vocalistcount:>=1 arrangercount:1 event:"M3 2023春"',
			);
			expect(result.filters.vocalistCount).toEqual({ op: ">=", value: 1 });
			expect(result.filters.arrangerCount).toEqual({ op: "=", value: 1 });
			expect(result.filters.eventName).toBe("M3 2023春");
		});

		it("同じcomposerフィルターを複数回指定する", () => {
			const result = parseSearchQuery("composer:ZUN composer:U2");
			expect(result.filters.composerNames).toEqual(["ZUN", "U2"]);
		});
	});

	describe("エッジケース", () => {
		it("空文字列を処理する", () => {
			const result = parseSearchQuery("");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters).toEqual({});
		});

		it("スペースのみの文字列を処理する", () => {
			const result = parseSearchQuery("   ");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters).toEqual({});
		});

		it("フィルターキーの大文字小文字を無視する", () => {
			const result = parseSearchQuery("ARRANGER:ARM Vocalist:miko");
			expect(result.filters.arrangerNames).toEqual(["ARM"]);
			expect(result.filters.vocalistNames).toEqual(["miko"]);
		});

		it("不正な数値は無視する", () => {
			const result = parseSearchQuery("year:abc");
			expect(result.filters.releaseYear).toBeUndefined();
		});
	});

	describe("periodフィルター（日付範囲検索）", () => {
		it("基本的な範囲検索を処理する", () => {
			const result = parseSearchQuery("period:2025-01-01..2025-12-31");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.releaseDate).toEqual({
				from: "2025-01-01",
				to: "2025-12-31",
			});
		});

		it("スラッシュ形式を自動でハイフン形式に変換する", () => {
			const result = parseSearchQuery("period:2025/01/01..2025/12/31");
			expect(result.filters.releaseDate).toEqual({
				from: "2025-01-01",
				to: "2025-12-31",
			});
		});

		it("フルテキストとperiodを組み合わせる", () => {
			const result = parseSearchQuery("Bad Apple period:2020-01-01..2020-12-31");
			expect(result.fullTextQuery).toBe("Bad Apple");
			expect(result.filters.releaseDate).toEqual({
				from: "2020-01-01",
				to: "2020-12-31",
			});
		});

		it("他のフィルターとperiodを組み合わせる", () => {
			const result = parseSearchQuery("arranger:ARM period:2023-01-01..2023-12-31");
			expect(result.filters.arrangerNames).toEqual(["ARM"]);
			expect(result.filters.releaseDate).toEqual({
				from: "2023-01-01",
				to: "2023-12-31",
			});
		});

		it("不正な日付形式は無視する", () => {
			const result = parseSearchQuery("period:20250101..20251231");
			expect(result.filters.releaseDate).toBeUndefined();
		});

		it("範囲形式でない値は無視する", () => {
			const result = parseSearchQuery("period:2025-01-01");
			expect(result.filters.releaseDate).toBeUndefined();
		});
	});

	describe("dateフィルター（単一日付比較）", () => {
		it("等価の日付検索を処理する", () => {
			const result = parseSearchQuery("date:2025-01-01");
			expect(result.fullTextQuery).toBe("");
			expect(result.filters.releaseDate).toEqual({
				op: "=",
				value: "2025-01-01",
			});
		});

		it(">=演算子を処理する", () => {
			const result = parseSearchQuery("date:>=2025-01-01");
			expect(result.filters.releaseDate).toEqual({
				op: ">=",
				value: "2025-01-01",
			});
		});

		it("<=演算子を処理する", () => {
			const result = parseSearchQuery("date:<=2025-12-31");
			expect(result.filters.releaseDate).toEqual({
				op: "<=",
				value: "2025-12-31",
			});
		});

		it(">演算子を処理する", () => {
			const result = parseSearchQuery("date:>2025-01-01");
			expect(result.filters.releaseDate).toEqual({
				op: ">",
				value: "2025-01-01",
			});
		});

		it("<演算子を処理する", () => {
			const result = parseSearchQuery("date:<2025-12-31");
			expect(result.filters.releaseDate).toEqual({
				op: "<",
				value: "2025-12-31",
			});
		});

		it("スラッシュ形式を自動でハイフン形式に変換する", () => {
			const result = parseSearchQuery("date:>=2025/01/01");
			expect(result.filters.releaseDate).toEqual({
				op: ">=",
				value: "2025-01-01",
			});
		});

		it("フルテキストとdateを組み合わせる", () => {
			const result = parseSearchQuery("Bad Apple date:>=2020-01-01");
			expect(result.fullTextQuery).toBe("Bad Apple");
			expect(result.filters.releaseDate).toEqual({
				op: ">=",
				value: "2020-01-01",
			});
		});

		it("他のフィルターとdateを組み合わせる", () => {
			const result = parseSearchQuery("arranger:ARM date:<2024-01-01");
			expect(result.filters.arrangerNames).toEqual(["ARM"]);
			expect(result.filters.releaseDate).toEqual({
				op: "<",
				value: "2024-01-01",
			});
		});

		it("不正な日付形式は無視する", () => {
			const result = parseSearchQuery("date:>=20250101");
			expect(result.filters.releaseDate).toBeUndefined();
		});
	});
});

describe("buildMeilisearchFilter", () => {
	it("単一の文字列フィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			circleNames: ["IOSYS"],
		});
		expect(filter).toBe('circleNames = "IOSYS"');
	});

	it("複数の文字列フィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			arrangerNames: ["ARM"],
			circleNames: ["IOSYS"],
		});
		expect(filter).toBe('arrangerNames = "ARM" AND circleNames = "IOSYS"');
	});

	it("数値フィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			releaseYear: { op: "=", value: 2023 },
		});
		expect(filter).toBe("releaseYear = 2023");
	});

	it("比較演算子付きの数値フィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			originalSongCount: { op: ">=", value: 3 },
		});
		expect(filter).toBe("originalSongCount >= 3");
	});

	it("文字列と数値フィルターを組み合わせる", () => {
		const filter = buildMeilisearchFilter({
			releaseYear: { op: "=", value: 2023 },
			arrangerNames: ["ARM"],
		});
		expect(filter).toBe('arrangerNames = "ARM" AND releaseYear = 2023');
	});

	it("同じフィルターに複数の値がある場合", () => {
		const filter = buildMeilisearchFilter({
			arrangerNames: ["ARM", "ZUN"],
		});
		expect(filter).toBe('arrangerNames = "ARM" AND arrangerNames = "ZUN"');
	});

	it("特殊文字を含む値をエスケープする", () => {
		const filter = buildMeilisearchFilter({
			circleNames: ['COOL&CREATE "Special"'],
		});
		expect(filter).toBe('circleNames = "COOL&CREATE \\"Special\\""');
	});

	it("空のフィルターは空文字列を返す", () => {
		const filter = buildMeilisearchFilter({});
		expect(filter).toBe("");
	});

	it("composerNamesフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			composerNames: ["ZUN"],
		});
		expect(filter).toBe('composerNames = "ZUN"');
	});

	it("vocalistCountフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			vocalistCount: { op: ">=", value: 2 },
		});
		expect(filter).toBe("vocalistCount >= 2");
	});

	it("arrangerCountフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			arrangerCount: { op: "=", value: 1 },
		});
		expect(filter).toBe("arrangerCount = 1");
	});

	it("lyricistCountフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			lyricistCount: { op: "<=", value: 1 },
		});
		expect(filter).toBe("lyricistCount <= 1");
	});

	it("composerCountフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			composerCount: { op: "=", value: 0 },
		});
		expect(filter).toBe("composerCount = 0");
	});

	it("eventNameフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			eventName: "コミックマーケット100",
		});
		expect(filter).toBe('eventName = "コミックマーケット100"');
	});

	it("複数のcountフィルターを組み合わせる", () => {
		const filter = buildMeilisearchFilter({
			vocalistCount: { op: ">=", value: 1 },
			arrangerCount: { op: "=", value: 1 },
			eventName: "M3 2023春",
		});
		expect(filter).toBe(
			'vocalistCount >= 1 AND arrangerCount = 1 AND eventName = "M3 2023春"',
		);
	});

	it("originalSongNamesフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			originalSongNames: ["赤より紅い夢"],
		});
		expect(filter).toBe('originalSongNames = "赤より紅い夢"');
	});

	it("複数のoriginalSongNamesフィルターを構築する（AND条件）", () => {
		const filter = buildMeilisearchFilter({
			originalSongNames: ["赤より紅い夢", "Bad Apple!!"],
		});
		expect(filter).toBe(
			'originalSongNames = "赤より紅い夢" AND originalSongNames = "Bad Apple!!"',
		);
	});

	it("releaseDateフィルターを構築する", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { from: "2024-01-01", to: "2024-12-31" },
		});
		expect(filter).toBe(
			'releaseDate >= "2024-01-01" AND releaseDate <= "2024-12-31"'
		);
	});

	it("releaseDateと他のフィルターを組み合わせる", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { from: "2024-01-01", to: "2024-12-31" },
			arrangerNames: ["ARM"],
		});
		expect(filter).toBe(
			'arrangerNames = "ARM" AND releaseDate >= "2024-01-01" AND releaseDate <= "2024-12-31"'
		);
	});

	it("単一日付フィルター（等価）を構築する", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { op: "=", value: "2025-01-01" },
		});
		expect(filter).toBe('releaseDate = "2025-01-01"');
	});

	it("単一日付フィルター（>=）を構築する", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { op: ">=", value: "2025-01-01" },
		});
		expect(filter).toBe('releaseDate >= "2025-01-01"');
	});

	it("単一日付フィルター（<）を構築する", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { op: "<", value: "2025-12-31" },
		});
		expect(filter).toBe('releaseDate < "2025-12-31"');
	});

	it("単一日付フィルターと他のフィルターを組み合わせる", () => {
		const filter = buildMeilisearchFilter({
			releaseDate: { op: ">=", value: "2024-01-01" },
			circleNames: ["IOSYS"],
		});
		expect(filter).toBe(
			'circleNames = "IOSYS" AND releaseDate >= "2024-01-01"'
		);
	});
});
