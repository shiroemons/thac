import { describe, expect, test } from "bun:test";
import { createId } from "../utils/id";

describe("createId", () => {
	describe("officialWorkLink", () => {
		test("should generate ID with 'wl_' prefix", () => {
			const id = createId.officialWorkLink();
			expect(id).toMatch(/^wl_[0-9A-Za-z]{21}$/);
		});

		test("should generate unique IDs", () => {
			const id1 = createId.officialWorkLink();
			const id2 = createId.officialWorkLink();
			expect(id1).not.toBe(id2);
		});
	});

	describe("officialSongLink", () => {
		test("should generate ID with 'sl_' prefix", () => {
			const id = createId.officialSongLink();
			expect(id).toMatch(/^sl_[0-9A-Za-z]{21}$/);
		});

		test("should generate unique IDs", () => {
			const id1 = createId.officialSongLink();
			const id2 = createId.officialSongLink();
			expect(id1).not.toBe(id2);
		});
	});
});
