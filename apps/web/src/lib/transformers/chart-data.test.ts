import { describe, expect, it } from "bun:test";
import type { SongStat, StackedWorkStat, WorkStat } from "@/lib/public-api";
import {
	transformSimpleDataForNivo,
	transformSongsDataForNivo,
	transformStackedDataForNivo,
} from "./chart-data";

describe("chart-data transformers", () => {
	describe("transformSongsDataForNivo", () => {
		const mockSongsData: SongStat[] = [
			{ id: "song-001", name: "曲A", trackCount: 10 },
			{ id: "song-002", name: "曲B", trackCount: 5 },
			{ id: "song-003", name: "曲C", trackCount: 15 },
		];

		it("空配列の場合は空のChartDataを返す", () => {
			const result = transformSongsDataForNivo([], "id", "horizontal");

			expect(result.data).toEqual([]);
			expect(result.keys).toEqual([]);
			expect(result.indexBy).toBe("songName");
			expect(result.colors).toEqual(["#3b82f6"]);
			expect(result.isStacked).toBe(false);
		});

		it("横グラフ・ID順でソートする（配列の最初が下に表示されるため逆順）", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"id",
				"horizontal",
			);

			expect(result.data).toHaveLength(3);
			// 横グラフではID降順（song-003 → song-002 → song-001）
			expect(result.data[0].songId).toBe("song-003");
			expect(result.data[1].songId).toBe("song-002");
			expect(result.data[2].songId).toBe("song-001");
		});

		it("縦グラフ・ID順でソートする（通常の昇順）", () => {
			const result = transformSongsDataForNivo(mockSongsData, "id", "vertical");

			expect(result.data).toHaveLength(3);
			// 縦グラフではID昇順（song-001 → song-002 → song-003）
			expect(result.data[0].songId).toBe("song-001");
			expect(result.data[1].songId).toBe("song-002");
			expect(result.data[2].songId).toBe("song-003");
		});

		it("横グラフ・トラック数昇順でソートする", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"count-asc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ昇順に見えるよう、配列は降順
			expect(result.data[0].trackCount).toBe(15); // 曲C
			expect(result.data[1].trackCount).toBe(10); // 曲A
			expect(result.data[2].trackCount).toBe(5); // 曲B
		});

		it("縦グラフ・トラック数昇順でソートする", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"count-asc",
				"vertical",
			);

			// 縦グラフでは左から右へ昇順
			expect(result.data[0].trackCount).toBe(5); // 曲B
			expect(result.data[1].trackCount).toBe(10); // 曲A
			expect(result.data[2].trackCount).toBe(15); // 曲C
		});

		it("横グラフ・トラック数降順でソートする", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"count-desc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ降順に見えるよう、配列は昇順
			expect(result.data[0].trackCount).toBe(5); // 曲B
			expect(result.data[1].trackCount).toBe(10); // 曲A
			expect(result.data[2].trackCount).toBe(15); // 曲C
		});

		it("縦グラフ・トラック数降順でソートする", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"count-desc",
				"vertical",
			);

			// 縦グラフでは左から右へ降順
			expect(result.data[0].trackCount).toBe(15); // 曲C
			expect(result.data[1].trackCount).toBe(10); // 曲A
			expect(result.data[2].trackCount).toBe(5); // 曲B
		});

		it("名前がnullの場合は「不明」に変換する", () => {
			const songsWithNull: SongStat[] = [
				{ id: "song-001", name: null, trackCount: 10 },
			];

			const result = transformSongsDataForNivo(
				songsWithNull,
				"id",
				"horizontal",
			);

			expect(result.data[0].songName).toBe("不明");
		});

		it("正しい構造のChartDataを返す", () => {
			const result = transformSongsDataForNivo(
				mockSongsData,
				"id",
				"horizontal",
			);

			expect(result.keys).toEqual(["trackCount"]);
			expect(result.indexBy).toBe("songName");
			expect(result.colors).toEqual(["#3b82f6"]);
			expect(result.isStacked).toBe(false);
		});
	});

	describe("transformStackedDataForNivo", () => {
		const mockStackedData: StackedWorkStat[] = [
			{
				id: "work-001",
				name: "作品A",
				shortName: "A",
				totalTrackCount: 25,
				songs: [
					{ id: "song-001", name: "曲1", trackCount: 10 },
					{ id: "song-002", name: "曲2", trackCount: 15 },
				],
			},
			{
				id: "work-002",
				name: "作品B",
				shortName: "B",
				totalTrackCount: 10,
				songs: [{ id: "song-003", name: "曲3", trackCount: 10 }],
			},
		];

		it("空配列の場合は空のChartDataを返す", () => {
			const result = transformStackedDataForNivo([], "id", "horizontal");

			expect(result.data).toEqual([]);
			expect(result.keys).toEqual([]);
			expect(result.indexBy).toBe("workName");
			expect(result.isStacked).toBe(true);
		});

		it("横グラフ・ID順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			expect(result.data).toHaveLength(2);
			// 横グラフではID降順
			expect(result.data[0].workId).toBe("work-002");
			expect(result.data[1].workId).toBe("work-001");
		});

		it("縦グラフ・ID順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"vertical",
			);

			expect(result.data).toHaveLength(2);
			// 縦グラフではID昇順
			expect(result.data[0].workId).toBe("work-001");
			expect(result.data[1].workId).toBe("work-002");
		});

		it("横グラフ・トラック数昇順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"count-asc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ昇順に見えるよう、配列は降順
			expect(result.data[0].totalTrackCount).toBe(25); // 作品A
			expect(result.data[1].totalTrackCount).toBe(10); // 作品B
		});

		it("縦グラフ・トラック数昇順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"count-asc",
				"vertical",
			);

			// 縦グラフでは左から右へ昇順
			expect(result.data[0].totalTrackCount).toBe(10); // 作品B
			expect(result.data[1].totalTrackCount).toBe(25); // 作品A
		});

		it("横グラフ・トラック数降順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"count-desc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ降順に見えるよう、配列は昇順
			expect(result.data[0].totalTrackCount).toBe(10); // 作品B
			expect(result.data[1].totalTrackCount).toBe(25); // 作品A
		});

		it("縦グラフ・トラック数降順でソートする", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"count-desc",
				"vertical",
			);

			// 縦グラフでは左から右へ降順
			expect(result.data[0].totalTrackCount).toBe(25); // 作品A
			expect(result.data[1].totalTrackCount).toBe(10); // 作品B
		});

		it("曲のユニークキーを収集してkeysに含める", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			// 曲名がID順でソートされる
			expect(result.keys).toContain("曲1");
			expect(result.keys).toContain("曲2");
			expect(result.keys).toContain("曲3");
		});

		it("各曲に対して一貫した色を割り当てる", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			// colors関数が存在し、曲名に対して色を返す
			expect(typeof result.colors).toBe("function");
			if (typeof result.colors === "function") {
				const color1 = result.colors({ id: "曲1" });
				const color2 = result.colors({ id: "曲2" });
				expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
				expect(color2).toMatch(/^#[0-9a-f]{6}$/i);
			}
		});

		it("各ワーク内の曲をID順にソートする", () => {
			const dataWithUnsortedSongs: StackedWorkStat[] = [
				{
					id: "work-001",
					name: "作品A",
					shortName: "A",
					totalTrackCount: 30,
					songs: [
						{ id: "song-003", name: "曲C", trackCount: 10 },
						{ id: "song-001", name: "曲A", trackCount: 10 },
						{ id: "song-002", name: "曲B", trackCount: 10 },
					],
				},
			];

			const result = transformStackedDataForNivo(
				dataWithUnsortedSongs,
				"id",
				"horizontal",
			);

			// keysはID順でソートされた曲名
			expect(result.keys[0]).toBe("曲A");
			expect(result.keys[1]).toBe("曲B");
			expect(result.keys[2]).toBe("曲C");
		});

		it("shortNameがある場合はそれをworkNameとして使用する", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			expect(result.data.find((d) => d.workId === "work-001")?.workName).toBe(
				"A",
			);
		});

		it("shortNameがnullの場合はnameを使用する", () => {
			const dataWithoutShortName: StackedWorkStat[] = [
				{
					id: "work-001",
					name: "作品A",
					shortName: null,
					totalTrackCount: 10,
					songs: [{ id: "song-001", name: "曲1", trackCount: 10 }],
				},
			];

			const result = transformStackedDataForNivo(
				dataWithoutShortName,
				"id",
				"horizontal",
			);

			expect(result.data[0].workName).toBe("作品A");
		});

		it("totalTrackCountを含める", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			expect(result.data[0].totalTrackCount).toBeDefined();
			expect(result.data[1].totalTrackCount).toBeDefined();
		});

		it("各曲のトラック数をBarDatumに含める", () => {
			const result = transformStackedDataForNivo(
				mockStackedData,
				"id",
				"horizontal",
			);

			const workA = result.data.find((d) => d.workId === "work-001");
			expect(workA?.["曲1"]).toBe(10);
			expect(workA?.["曲2"]).toBe(15);
		});
	});

	describe("transformSimpleDataForNivo", () => {
		const mockWorksData: WorkStat[] = [
			{ id: "work-001", name: "作品A", shortName: "A", trackCount: 25 },
			{ id: "work-002", name: "作品B", shortName: "B", trackCount: 10 },
			{ id: "work-003", name: "作品C", shortName: "C", trackCount: 15 },
		];

		it("空配列の場合は空のChartDataを返す", () => {
			const result = transformSimpleDataForNivo([], "id", "horizontal");

			expect(result.data).toEqual([]);
			expect(result.keys).toEqual([]);
			expect(result.indexBy).toBe("workName");
			expect(result.colors).toEqual(["#3b82f6"]);
			expect(result.isStacked).toBe(false);
		});

		it("横グラフ・ID順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"id",
				"horizontal",
			);

			expect(result.data).toHaveLength(3);
			// 横グラフではID降順
			expect(result.data[0].workId).toBe("work-003");
			expect(result.data[1].workId).toBe("work-002");
			expect(result.data[2].workId).toBe("work-001");
		});

		it("縦グラフ・ID順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"id",
				"vertical",
			);

			expect(result.data).toHaveLength(3);
			// 縦グラフではID昇順
			expect(result.data[0].workId).toBe("work-001");
			expect(result.data[1].workId).toBe("work-002");
			expect(result.data[2].workId).toBe("work-003");
		});

		it("横グラフ・トラック数昇順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"count-asc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ昇順に見えるよう、配列は降順
			expect(result.data[0].trackCount).toBe(25); // 作品A
			expect(result.data[1].trackCount).toBe(15); // 作品C
			expect(result.data[2].trackCount).toBe(10); // 作品B
		});

		it("縦グラフ・トラック数昇順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"count-asc",
				"vertical",
			);

			// 縦グラフでは左から右へ昇順
			expect(result.data[0].trackCount).toBe(10); // 作品B
			expect(result.data[1].trackCount).toBe(15); // 作品C
			expect(result.data[2].trackCount).toBe(25); // 作品A
		});

		it("横グラフ・トラック数降順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"count-desc",
				"horizontal",
			);

			// 横グラフでは視覚的に下から上へ降順に見えるよう、配列は昇順
			expect(result.data[0].trackCount).toBe(10); // 作品B
			expect(result.data[1].trackCount).toBe(15); // 作品C
			expect(result.data[2].trackCount).toBe(25); // 作品A
		});

		it("縦グラフ・トラック数降順でソートする", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"count-desc",
				"vertical",
			);

			// 縦グラフでは左から右へ降順
			expect(result.data[0].trackCount).toBe(25); // 作品A
			expect(result.data[1].trackCount).toBe(15); // 作品C
			expect(result.data[2].trackCount).toBe(10); // 作品B
		});

		it("shortNameがある場合はそれをworkNameとして使用する", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"id",
				"horizontal",
			);

			expect(result.data.find((d) => d.workId === "work-001")?.workName).toBe(
				"A",
			);
		});

		it("shortNameがnullの場合はnameを使用する", () => {
			const dataWithoutShortName: WorkStat[] = [
				{ id: "work-001", name: "作品A", shortName: null, trackCount: 10 },
			];

			const result = transformSimpleDataForNivo(
				dataWithoutShortName,
				"id",
				"horizontal",
			);

			expect(result.data[0].workName).toBe("作品A");
		});

		it("name・shortName両方nullの場合は「不明」を使用する", () => {
			const dataWithNulls: WorkStat[] = [
				{ id: "work-001", name: null, shortName: null, trackCount: 10 },
			];

			const result = transformSimpleDataForNivo(
				dataWithNulls,
				"id",
				"horizontal",
			);

			expect(result.data[0].workName).toBe("不明");
		});

		it("正しい構造のChartDataを返す", () => {
			const result = transformSimpleDataForNivo(
				mockWorksData,
				"id",
				"horizontal",
			);

			expect(result.keys).toEqual(["trackCount"]);
			expect(result.indexBy).toBe("workName");
			expect(result.colors).toEqual(["#3b82f6"]);
			expect(result.isStacked).toBe(false);
		});
	});
});
