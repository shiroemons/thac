import { describe, expect, test } from "bun:test";
import {
	insertReleasePublicationSchema,
	insertTrackPublicationSchema,
	updateReleasePublicationSchema,
	updateTrackPublicationSchema,
	VISIBILITY_TYPES,
} from "../schema/publication.validation";

describe("releasePublications validation schemas", () => {
	describe("VISIBILITY_TYPES", () => {
		test("should have all expected visibility types", () => {
			expect(VISIBILITY_TYPES).toContain("public");
			expect(VISIBILITY_TYPES).toContain("unlisted");
			expect(VISIBILITY_TYPES).toContain("private");
			expect(VISIBILITY_TYPES).toHaveLength(3);
		});
	});

	describe("insertReleasePublicationSchema", () => {
		test("should accept valid data with required fields only", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid data with all optional fields", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "spotify",
				url: "https://open.spotify.com/album/abc123",
				platformItemId: "abc123",
				countryCode: "JP",
				visibility: "public",
				publishedAt: new Date("2024-01-01"),
				removedAt: null,
				isOfficial: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.platformItemId).toBe("abc123");
				expect(result.data.countryCode).toBe("JP");
				expect(result.data.visibility).toBe("public");
				expect(result.data.isOfficial).toBe(true);
			}
		});

		test("should reject empty id", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty releaseId", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty platformCode", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty url", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid url format", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "not-a-valid-url",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid countryCode format (not 2 letters)", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
				countryCode: "JPN",
			});
			expect(result.success).toBe(false);
		});

		test("should reject lowercase countryCode", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
				countryCode: "jp",
			});
			expect(result.success).toBe(false);
		});

		test("should accept valid countryCode", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
				countryCode: "US",
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid visibility type", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
				visibility: "hidden",
			});
			expect(result.success).toBe(false);
		});

		test("should accept all valid visibility types", () => {
			for (const visibility of VISIBILITY_TYPES) {
				const result = insertReleasePublicationSchema.safeParse({
					id: "rp_12345",
					releaseId: "re_12345",
					platformCode: "youtube",
					url: "https://www.youtube.com/watch?v=abc123",
					visibility,
				});
				expect(result.success).toBe(true);
			}
		});

		test("should default isOfficial to true", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isOfficial).toBe(true);
			}
		});
	});

	describe("updateReleasePublicationSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateReleasePublicationSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with url only", () => {
			const result = updateReleasePublicationSchema.safeParse({
				url: "https://new-url.com/video",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with visibility only", () => {
			const result = updateReleasePublicationSchema.safeParse({
				visibility: "unlisted",
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid url in update", () => {
			const result = updateReleasePublicationSchema.safeParse({
				url: "not-a-url",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid countryCode in update", () => {
			const result = updateReleasePublicationSchema.safeParse({
				countryCode: "JAPAN",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("trackPublications validation schemas", () => {
	describe("insertTrackPublicationSchema", () => {
		test("should accept valid data with required fields only", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid data with all optional fields", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "nicovideo",
				url: "https://www.nicovideo.jp/watch/sm12345",
				platformItemId: "sm12345",
				countryCode: "JP",
				visibility: "public",
				publishedAt: new Date("2024-01-01"),
				removedAt: null,
				isOfficial: false,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.platformItemId).toBe("sm12345");
				expect(result.data.isOfficial).toBe(false);
			}
		});

		test("should reject empty id", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty trackId", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty platformCode", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty url", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid url format", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "invalid-url",
			});
			expect(result.success).toBe(false);
		});

		test("should default isOfficial to true", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isOfficial).toBe(true);
			}
		});
	});

	describe("updateTrackPublicationSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackPublicationSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update", () => {
			const result = updateTrackPublicationSchema.safeParse({
				visibility: "private",
				isOfficial: false,
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid url in update", () => {
			const result = updateTrackPublicationSchema.safeParse({
				url: "bad-url",
			});
			expect(result.success).toBe(false);
		});
	});
});
