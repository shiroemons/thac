import { describe, expect, test } from "vitest";
import { createId } from "../utils/id";

// TypeID形式: プレフィックス + "_" + 26文字のbase32エンコード（小文字英数字）
const TYPEID_SUFFIX_PATTERN = "[0-9a-z]{26}";

describe("createId", () => {
	describe("officialWorkLink", () => {
		test("should generate ID with 'wl_' prefix in TypeID format", () => {
			const id = createId.officialWorkLink();
			expect(id).toMatch(new RegExp(`^wl_${TYPEID_SUFFIX_PATTERN}$`));
		});

		test("should generate unique IDs", () => {
			const id1 = createId.officialWorkLink();
			const id2 = createId.officialWorkLink();
			expect(id1).not.toBe(id2);
		});
	});

	describe("officialSongLink", () => {
		test("should generate ID with 'sl_' prefix in TypeID format", () => {
			const id = createId.officialSongLink();
			expect(id).toMatch(new RegExp(`^sl_${TYPEID_SUFFIX_PATTERN}$`));
		});

		test("should generate unique IDs", () => {
			const id1 = createId.officialSongLink();
			const id2 = createId.officialSongLink();
			expect(id1).not.toBe(id2);
		});
	});

	describe("all entity types", () => {
		test("should generate TypeID format for all entities", () => {
			const entities = [
				{ key: "artist", prefix: "ar" },
				{ key: "artistAlias", prefix: "aa" },
				{ key: "circle", prefix: "ci" },
				{ key: "circleLink", prefix: "cl" },
				{ key: "track", prefix: "tr" },
				{ key: "trackCredit", prefix: "tc" },
				{ key: "trackOfficialSong", prefix: "to" },
				{ key: "trackDerivation", prefix: "td" },
				{ key: "trackPublication", prefix: "tp" },
				{ key: "trackIsrc", prefix: "ti" },
				{ key: "release", prefix: "re" },
				{ key: "releasePublication", prefix: "rp" },
				{ key: "releaseJanCode", prefix: "rj" },
				{ key: "disc", prefix: "di" },
				{ key: "eventSeries", prefix: "es" },
				{ key: "event", prefix: "ev" },
				{ key: "eventDay", prefix: "ed" },
				{ key: "officialWorkLink", prefix: "wl" },
				{ key: "officialSongLink", prefix: "sl" },
				{ key: "tag", prefix: "tag" },
			] as const;

			for (const { key, prefix } of entities) {
				const id = createId[key]();
				expect(id).toMatch(new RegExp(`^${prefix}_${TYPEID_SUFFIX_PATTERN}$`));
			}
		});
	});
});
