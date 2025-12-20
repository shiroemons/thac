import { describe, expect, test } from "bun:test";
import {
	insertReleaseCircleSchema,
	PARTICIPATION_TYPES,
	updateReleaseCircleSchema,
} from "../schema/release.validation";

describe("release-circle validation schemas", () => {
	describe("PARTICIPATION_TYPES", () => {
		test("should have all required participation types", () => {
			expect(PARTICIPATION_TYPES).toContain("host");
			expect(PARTICIPATION_TYPES).toContain("co-host");
			expect(PARTICIPATION_TYPES).toContain("participant");
			expect(PARTICIPATION_TYPES).toContain("guest");
			expect(PARTICIPATION_TYPES).toContain("split_partner");
			expect(PARTICIPATION_TYPES).toHaveLength(5);
		});
	});

	describe("insertReleaseCircleSchema", () => {
		test("should accept valid release circle data with default participationType", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.participationType).toBe("host");
			}
		});

		test("should accept valid data with all fields", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
				participationType: "co-host",
				position: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.participationType).toBe("co-host");
				expect(result.data.position).toBe(2);
			}
		});

		test("should accept all valid participation types", () => {
			for (const participationType of PARTICIPATION_TYPES) {
				const result = insertReleaseCircleSchema.safeParse({
					releaseId: "rel_12345",
					circleId: "cir_12345",
					participationType,
				});
				expect(result.success).toBe(true);
			}
		});

		test("should reject empty releaseId", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "",
				circleId: "cir_12345",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty circleId", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject invalid participationType", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
				participationType: "invalid",
			});
			expect(result.success).toBe(false);
		});

		test("should reject position less than 1", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
				position: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should reject negative position", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
				position: -1,
			});
			expect(result.success).toBe(false);
		});

		test("should reject non-integer position", () => {
			const result = insertReleaseCircleSchema.safeParse({
				releaseId: "rel_12345",
				circleId: "cir_12345",
				position: 1.5,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateReleaseCircleSchema", () => {
		test("should accept partial update with participationType only", () => {
			const result = updateReleaseCircleSchema.safeParse({
				participationType: "guest",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with position only", () => {
			const result = updateReleaseCircleSchema.safeParse({
				position: 5,
			});
			expect(result.success).toBe(true);
		});

		test("should accept empty update (all fields optional)", () => {
			const result = updateReleaseCircleSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept update with both fields", () => {
			const result = updateReleaseCircleSchema.safeParse({
				participationType: "split_partner",
				position: 3,
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid participationType", () => {
			const result = updateReleaseCircleSchema.safeParse({
				participationType: "invalid",
			});
			expect(result.success).toBe(false);
		});

		test("should reject position less than 1", () => {
			const result = updateReleaseCircleSchema.safeParse({
				position: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should accept all valid participation types", () => {
			for (const participationType of PARTICIPATION_TYPES) {
				const result = updateReleaseCircleSchema.safeParse({
					participationType,
				});
				expect(result.success).toBe(true);
			}
		});
	});
});
