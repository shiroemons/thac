import { describe, expect, test } from "bun:test";
import type { ImportInput, ImportResult } from "./legacy-import-service";

describe("LegacyImportService", () => {
	describe("インポート入力データ構造", () => {
		test("ImportInputは必要なフィールドを持つ", () => {
			const input: ImportInput = {
				records: [
					{
						circle: "サークルA",
						album: "アルバム1",
						title: "曲名1",
						trackNumber: 1,
						event: "コミケ100",
						vocalists: ["ボーカルA"],
						arrangers: ["アレンジャーA"],
						lyricists: [],
						originalSongs: ["原曲1"],
					},
				],
				songMappings: new Map([["原曲1", "osong_1"]]),
				customSongNames: new Map(),
			};

			expect(input.records).toHaveLength(1);
			expect(input.songMappings.get("原曲1")).toBe("osong_1");
		});
	});

	describe("ImportResult構造", () => {
		test("ImportResultは各エンティティのカウントを持つ", () => {
			const result: ImportResult = {
				success: true,
				events: { created: 1, updated: 0, skipped: 0 },
				circles: { created: 2, updated: 0, skipped: 0 },
				artists: { created: 3, updated: 0, skipped: 0 },
				releases: { created: 1, updated: 0, skipped: 0 },
				tracks: { created: 1, updated: 0, skipped: 0 },
				credits: { created: 2, updated: 0, skipped: 0 },
				officialSongLinks: { created: 1, updated: 0, skipped: 0 },
				errors: [],
			};

			expect(result.success).toBe(true);
			expect(result.events.created).toBe(1);
		});
	});

	describe("splitCircles関数", () => {
		test("×区切りのサークル名を分割する", async () => {
			// This is tested in legacy-csv-parser.test.ts
			// Just verify the integration
			const { splitCircles } = await import("../utils/legacy-csv-parser");

			const result = splitCircles("サークルA×サークルB");
			expect(result).toEqual(["サークルA", "サークルB"]);
		});
	});
});
