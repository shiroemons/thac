import { describe, expect, test } from "bun:test";
import {
	insertReleaseJanCodeSchema,
	insertTrackIsrcSchema,
	updateReleaseJanCodeSchema,
	updateTrackIsrcSchema,
} from "../schema/identifier.validation";

describe("releaseJanCodes validation schemas", () => {
	describe("insertReleaseJanCodeSchema", () => {
		test("should accept valid 8-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "12345678",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid 13-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "4988001234567",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid data with all optional fields", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "4988001234567",
				label: "レーベル名",
				countryCode: "JP",
				isPrimary: true,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.label).toBe("レーベル名");
				expect(result.data.countryCode).toBe("JP");
				expect(result.data.isPrimary).toBe(true);
			}
		});

		test("should reject empty id", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "",
				releaseId: "re_12345",
				janCode: "12345678",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty releaseId", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "",
				janCode: "12345678",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty janCode", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 7-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "1234567",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 9-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "123456789",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 12-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "123456789012",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 14-digit JAN code", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "12345678901234",
			});
			expect(result.success).toBe(false);
		});

		test("should reject JAN code with letters", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "1234567A",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid countryCode format", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "12345678",
				countryCode: "JPN",
			});
			expect(result.success).toBe(false);
		});

		test("should default isPrimary to false", () => {
			const result = insertReleaseJanCodeSchema.safeParse({
				id: "rj_12345",
				releaseId: "re_12345",
				janCode: "12345678",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isPrimary).toBe(false);
			}
		});
	});

	describe("updateReleaseJanCodeSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateReleaseJanCodeSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with label only", () => {
			const result = updateReleaseJanCodeSchema.safeParse({
				label: "新しいレーベル",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with isPrimary only", () => {
			const result = updateReleaseJanCodeSchema.safeParse({
				isPrimary: true,
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid countryCode in update", () => {
			const result = updateReleaseJanCodeSchema.safeParse({
				countryCode: "japan",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("trackIsrcs validation schemas", () => {
	describe("insertTrackIsrcSchema", () => {
		test("should accept valid ISRC format (12 chars)", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPXX01234567",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid ISRC with all optional fields", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPAB00912345",
				assignedAt: "2024-01-01",
				isPrimary: true,
				source: "配信サービス",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.assignedAt).toBe("2024-01-01");
				expect(result.data.isPrimary).toBe(true);
				expect(result.data.source).toBe("配信サービス");
			}
		});

		test("should reject empty id", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "",
				trackId: "tr_12345",
				isrc: "JPXX01234567",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty trackId", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "",
				isrc: "JPXX01234567",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty isrc", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 11-char ISRC", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPXX0123456",
			});
			expect(result.success).toBe(false);
		});

		test("should reject 13-char ISRC", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPXX012345678",
			});
			expect(result.success).toBe(false);
		});

		test("should reject ISRC with lowercase country code", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "jpXX01234567",
			});
			expect(result.success).toBe(false);
		});

		test("should accept ISRC with digits in registrant (valid format)", () => {
			// ISRC registrant field can contain alphanumeric characters (A-Z, 0-9)
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JP1201234567",
			});
			expect(result.success).toBe(true);
		});

		test("should reject ISRC with letters in year field", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPXXAB234567",
			});
			expect(result.success).toBe(false);
		});

		test("should default isPrimary to true", () => {
			const result = insertTrackIsrcSchema.safeParse({
				id: "ti_12345",
				trackId: "tr_12345",
				isrc: "JPXX01234567",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isPrimary).toBe(true);
			}
		});
	});

	describe("updateTrackIsrcSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackIsrcSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with assignedAt only", () => {
			const result = updateTrackIsrcSchema.safeParse({
				assignedAt: "2024-06-01",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with isPrimary only", () => {
			const result = updateTrackIsrcSchema.safeParse({
				isPrimary: false,
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with source only", () => {
			const result = updateTrackIsrcSchema.safeParse({
				source: "手動入力",
			});
			expect(result.success).toBe(true);
		});
	});
});
