import { describe, expect, test } from "bun:test";
import {
	insertReleasePublicationSchema,
	insertTrackPublicationSchema,
	updateReleasePublicationSchema,
	updateTrackPublicationSchema,
} from "../schema/publication.validation";

describe("releasePublications validation schemas", () => {
	describe("insertReleasePublicationSchema", () => {
		test("should accept valid data with required fields", () => {
			const result = insertReleasePublicationSchema.safeParse({
				id: "rp_12345",
				releaseId: "re_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
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

		test("should reject invalid url in update", () => {
			const result = updateReleasePublicationSchema.safeParse({
				url: "not-a-url",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("trackPublications validation schemas", () => {
	describe("insertTrackPublicationSchema", () => {
		test("should accept valid data with required fields", () => {
			const result = insertTrackPublicationSchema.safeParse({
				id: "tp_12345",
				trackId: "tr_12345",
				platformCode: "youtube",
				url: "https://www.youtube.com/watch?v=abc123",
			});
			expect(result.success).toBe(true);
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
	});

	describe("updateTrackPublicationSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackPublicationSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with url", () => {
			const result = updateTrackPublicationSchema.safeParse({
				url: "https://new-url.com/video",
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
