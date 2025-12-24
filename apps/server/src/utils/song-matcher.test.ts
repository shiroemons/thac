import { describe, expect, test } from "bun:test";
import { createSongMatcher, OTHER_SONG_ID } from "./song-matcher";

// モックデータベース
const mockOfficialSongs: Array<{
	id: string;
	name: string;
	nameJa: string;
	isOriginal: boolean;
	officialWorkName: string | null;
}> = [
	{
		id: "osong_1",
		name: "U.N.オーエンは彼女なのか？",
		nameJa: "U.N.オーエンは彼女なのか？",
		isOriginal: true,
		officialWorkName: "東方紅魔郷",
	},
	{
		id: "osong_2",
		name: "ネイティブフェイス",
		nameJa: "ネイティブフェイス",
		isOriginal: true,
		officialWorkName: "東方風神録",
	},
	{
		id: "osong_3",
		name: "上海紅茶館",
		nameJa: "上海紅茶館 ～ Chinese Tea",
		isOriginal: true,
		officialWorkName: "東方紅魔郷",
	},
	{
		id: "osong_original",
		name: "オリジナル",
		nameJa: "オリジナル",
		isOriginal: true,
		officialWorkName: null,
	},
	{
		id: "osong_4",
		name: "亡き王女の為のセプテット",
		nameJa: "亡き王女の為のセプテット",
		isOriginal: true,
		officialWorkName: "東方紅魔郷",
	},
];

// モック検索関数
const mockExactSearch = (name: string) => {
	return mockOfficialSongs.filter((s) => s.name === name || s.nameJa === name);
};

const mockPartialSearch = (name: string, limit: number) => {
	return mockOfficialSongs
		.filter(
			(s) =>
				s.name.includes(name) ||
				s.nameJa.includes(name) ||
				name.includes(s.name) ||
				name.includes(s.nameJa),
		)
		.slice(0, limit);
};

const mockFindOriginal = () => {
	return mockOfficialSongs.find((s) => s.name === "オリジナル") || null;
};

describe("SongMatcher", () => {
	const matcher = createSongMatcher(
		mockExactSearch,
		mockPartialSearch,
		mockFindOriginal,
	);

	describe("完全一致マッチング", () => {
		test("原曲名が完全一致した場合は自動マッピングを確定する", async () => {
			const results = await matcher.matchSongs(["U.N.オーエンは彼女なのか？"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.matchType).toBe("exact");
			expect(results[0]?.autoMatched).toBe(true);
			expect(results[0]?.selectedId).toBe("osong_1");
			expect(results[0]?.candidates).toHaveLength(1);
		});

		test("日本語名で完全一致した場合も自動マッピングを確定する", async () => {
			const results = await matcher.matchSongs(["ネイティブフェイス"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.matchType).toBe("exact");
			expect(results[0]?.autoMatched).toBe(true);
		});
	});

	describe("部分一致マッチング", () => {
		test("完全一致がない場合に部分一致で候補リストを生成する", async () => {
			const results = await matcher.matchSongs(["上海"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.matchType).toBe("partial");
			expect(results[0]?.autoMatched).toBe(false);
			expect(results[0]?.selectedId).toBe(null);
			expect(results[0]?.candidates.length).toBeGreaterThan(0);
		});

		test("候補リストは制限数以内に収まる", async () => {
			const limitedMatcher = createSongMatcher(
				mockExactSearch,
				(name, limit) => mockPartialSearch(name, limit),
				mockFindOriginal,
				3, // limit to 3 candidates
			);

			const results = await limitedMatcher.matchSongs(["紅"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.candidates.length).toBeLessThanOrEqual(3);
		});
	});

	describe("オリジナルの特殊処理", () => {
		test("原曲名が「オリジナル」の場合は自動的にオリジナルレコードに紐付ける", async () => {
			const results = await matcher.matchSongs(["オリジナル"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.isOriginal).toBe(true);
			expect(results[0]?.autoMatched).toBe(true);
			expect(results[0]?.selectedId).toBe("osong_original");
		});
	});

	describe("マッチなしの処理", () => {
		test("マッチする原曲がない場合は「その他」に紐付け、customSongNameに原曲名を保存する", async () => {
			const results = await matcher.matchSongs(["存在しない曲名"]);

			expect(results).toHaveLength(1);
			expect(results[0]?.matchType).toBe("none");
			expect(results[0]?.autoMatched).toBe(true);
			expect(results[0]?.selectedId).toBe(OTHER_SONG_ID);
			expect(results[0]?.customSongName).toBe("存在しない曲名");
			expect(results[0]?.candidates).toHaveLength(0);
		});
	});

	describe("空文字列のスキップ", () => {
		test("空文字列の原曲名はスキップする", async () => {
			const results = await matcher.matchSongs([""]);

			expect(results).toHaveLength(1);
			expect(results[0]?.matchType).toBe("none");
			expect(results[0]?.autoMatched).toBe(false);
			expect(results[0]?.originalName).toBe("");
		});
	});

	describe("複数の原曲名を処理", () => {
		test("複数の原曲名を一括でマッチングする", async () => {
			const results = await matcher.matchSongs([
				"U.N.オーエンは彼女なのか？",
				"オリジナル",
				"存在しない曲名",
			]);

			expect(results).toHaveLength(3);
			expect(results[0]?.matchType).toBe("exact");
			expect(results[1]?.isOriginal).toBe(true);
			expect(results[2]?.matchType).toBe("none");
		});
	});
});
