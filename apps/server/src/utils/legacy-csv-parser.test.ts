import { describe, expect, test } from "bun:test";
import {
	parseLegacyCSV,
	splitCircles,
	splitColonValues,
} from "./legacy-csv-parser";

describe("parseLegacyCSV", () => {
	describe("基本的なCSVパース", () => {
		test("正常なCSVをパースしてレコード配列を返す", () => {
			const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(true);
			expect(result.records).toHaveLength(1);
			expect(result.records[0]).toEqual({
				circle: "サークルA",
				album: "アルバム1",
				title: "曲名1",
				trackNumber: 1,
				event: "コミケ100",
				vocalists: ["ボーカルA"],
				arrangers: ["アレンジャーA"],
				lyricists: ["作詞家A"],
				originalSongs: ["原曲1"],
			});
			expect(result.errors).toHaveLength(0);
		});

		test("複数行のCSVをパースする", () => {
			const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1
サークルB,アルバム2,曲名2,2,コミケ101,ボーカルB,アレンジャーB,作詞家B,原曲2`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(true);
			expect(result.records).toHaveLength(2);
		});
	});

	describe("重複ヘッダー行のスキップ", () => {
		test("データ途中のヘッダー行を自動的にスキップする", () => {
			const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1
circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルB,アルバム2,曲名2,2,コミケ101,ボーカルB,アレンジャーB,作詞家B,原曲2`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(true);
			expect(result.records).toHaveLength(2);
		});

		test("クォートされたヘッダー行もスキップする", () => {
			const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1
"circle","album","title","track_number","event","vocalists","arrangers","lyricists","original_songs"
サークルB,アルバム2,曲名2,2,コミケ101,ボーカルB,アレンジャーB,作詞家B,原曲2`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(true);
			expect(result.records).toHaveLength(2);
			expect(result.records[0]?.circle).toBe("サークルA");
			expect(result.records[1]?.circle).toBe("サークルB");
		});
	});

	describe("必須カラムの検証", () => {
		test("必須カラムが欠けている場合はエラーを返す", () => {
			const csv = `circle,album,title
サークルA,アルバム1,曲名1`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0]?.message).toContain("必須カラム");
		});
	});

	describe("パースエラー時の行番号", () => {
		test("パースエラー時は行番号と具体的なエラー内容を返す", () => {
			const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,invalid,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1`;

			const result = parseLegacyCSV(csv);

			expect(result.success).toBe(false);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.row).toBe(2);
			expect(result.errors[0]?.message).toContain("track_number");
		});
	});
});

describe("splitColonValues", () => {
	test("コロン区切りの複数値を分割する", () => {
		const input = "アーティストA:アーティストB:アーティストC";
		const result = splitColonValues(input);

		expect(result).toEqual(["アーティストA", "アーティストB", "アーティストC"]);
	});

	test("単一値はそのまま配列で返す", () => {
		const input = "アーティストA";
		const result = splitColonValues(input);

		expect(result).toEqual(["アーティストA"]);
	});

	test("空文字列は空配列を返す", () => {
		const input = "";
		const result = splitColonValues(input);

		expect(result).toEqual([]);
	});

	test("各値から前後の空白を除去する", () => {
		const input = " アーティストA : アーティストB : アーティストC ";
		const result = splitColonValues(input);

		expect(result).toEqual(["アーティストA", "アーティストB", "アーティストC"]);
	});
});

describe("splitCircles", () => {
	test("×区切りの複合サークル名を分割する", () => {
		const input = "サークルA×サークルB×サークルC";
		const result = splitCircles(input);

		expect(result).toEqual(["サークルA", "サークルB", "サークルC"]);
	});

	test("単一サークルはそのまま配列で返す", () => {
		const input = "サークルA";
		const result = splitCircles(input);

		expect(result).toEqual(["サークルA"]);
	});

	test("各値から前後の空白を除去する", () => {
		const input = " サークルA × サークルB ";
		const result = splitCircles(input);

		expect(result).toEqual(["サークルA", "サークルB"]);
	});

	test("全角×と半角xを両方サポートする", () => {
		const input1 = "サークルA×サークルB";
		const input2 = "サークルA x サークルB";

		expect(splitCircles(input1)).toEqual(["サークルA", "サークルB"]);
		expect(splitCircles(input2)).toEqual(["サークルA", "サークルB"]);
	});
});

describe("複数値パース（統合テスト）", () => {
	test("vocalists列のコロン区切りをパースする", () => {
		const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA:ボーカルB,アレンジャーA,作詞家A,原曲1`;

		const result = parseLegacyCSV(csv);

		expect(result.success).toBe(true);
		expect(result.records[0]?.vocalists).toEqual(["ボーカルA", "ボーカルB"]);
	});

	test("original_songs列のコロン区切りをパースする", () => {
		const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1:原曲2:原曲3`;

		const result = parseLegacyCSV(csv);

		expect(result.success).toBe(true);
		expect(result.records[0]?.originalSongs).toEqual([
			"原曲1",
			"原曲2",
			"原曲3",
		]);
	});

	test("circle列の×区切りをパースする", () => {
		const csv = `circle,album,title,track_number,event,vocalists,arrangers,lyricists,original_songs
サークルA×サークルB,アルバム1,曲名1,1,コミケ100,ボーカルA,アレンジャーA,作詞家A,原曲1`;

		const result = parseLegacyCSV(csv);

		expect(result.success).toBe(true);
		expect(result.records[0]?.circle).toBe("サークルA×サークルB");
	});
});
