import { describe, expect, test } from "bun:test";
import {
	insertOfficialSongLinkSchema,
	insertOfficialWorkLinkSchema,
	updateOfficialSongLinkSchema,
	updateOfficialWorkLinkSchema,
} from "../schema/official.validation";

describe("official link validation schemas", () => {
	describe("insertOfficialWorkLinkSchema", () => {
		test("should accept valid input", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "0101",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
			});
			expect(result.success).toBe(true);
		});

		test("should accept input with sortOrder", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "0101",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
				sortOrder: 5,
			});
			expect(result.success).toBe(true);
		});

		test("should reject empty id", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "",
				officialWorkId: "0101",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty officialWorkId", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty platformCode", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "0101",
				platformCode: "",
				url: "https://www.youtube.com/watch?v=test",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid URL", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "0101",
				platformCode: "youtube",
				url: "not-a-valid-url",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty URL", () => {
			const result = insertOfficialWorkLinkSchema.safeParse({
				id: "wl_test123",
				officialWorkId: "0101",
				platformCode: "youtube",
				url: "",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateOfficialWorkLinkSchema", () => {
		test("should accept partial update with platformCode", () => {
			const result = updateOfficialWorkLinkSchema.safeParse({
				platformCode: "spotify",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with url", () => {
			const result = updateOfficialWorkLinkSchema.safeParse({
				url: "https://spotify.com/track/test",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with sortOrder", () => {
			const result = updateOfficialWorkLinkSchema.safeParse({
				sortOrder: 10,
			});
			expect(result.success).toBe(true);
		});

		test("should accept empty object", () => {
			const result = updateOfficialWorkLinkSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should reject invalid URL format", () => {
			const result = updateOfficialWorkLinkSchema.safeParse({
				url: "not-a-url",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("insertOfficialSongLinkSchema", () => {
		test("should accept valid input", () => {
			const result = insertOfficialSongLinkSchema.safeParse({
				id: "sl_test123",
				officialSongId: "01010001",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
			});
			expect(result.success).toBe(true);
		});

		test("should accept input with sortOrder", () => {
			const result = insertOfficialSongLinkSchema.safeParse({
				id: "sl_test123",
				officialSongId: "01010001",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=test",
				sortOrder: 5,
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid URL", () => {
			const result = insertOfficialSongLinkSchema.safeParse({
				id: "sl_test123",
				officialSongId: "01010001",
				platformCode: "youtube",
				url: "invalid",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateOfficialSongLinkSchema", () => {
		test("should accept partial update", () => {
			const result = updateOfficialSongLinkSchema.safeParse({
				url: "https://spotify.com/track/new",
			});
			expect(result.success).toBe(true);
		});

		test("should accept empty object", () => {
			const result = updateOfficialSongLinkSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});
});
