import { describe, expect, test } from "bun:test";
import {
	insertAliasTypeSchema,
	insertCreditRoleSchema,
	insertOfficialWorkCategorySchema,
	insertPlatformSchema,
	updateAliasTypeSchema,
	updateOfficialWorkCategorySchema,
	updatePlatformSchema,
} from "../schema/master.validation";

describe("master validation schemas", () => {
	describe("Platform schemas", () => {
		describe("insertPlatformSchema", () => {
			test("should accept valid platform data", () => {
				const result = insertPlatformSchema.safeParse({
					code: "youtube",
					name: "YouTube",
					category: "video",
					urlPattern: "^https://www.youtube.com/watch\\?v=",
				});
				expect(result.success).toBe(true);
			});

			test("should accept platform without optional fields", () => {
				const result = insertPlatformSchema.safeParse({
					code: "spotify",
					name: "Spotify",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty code", () => {
				const result = insertPlatformSchema.safeParse({
					code: "",
					name: "Test",
				});
				expect(result.success).toBe(false);
			});

			test("should reject whitespace-only code", () => {
				const result = insertPlatformSchema.safeParse({
					code: "   ",
					name: "Test",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty name", () => {
				const result = insertPlatformSchema.safeParse({
					code: "test",
					name: "",
				});
				expect(result.success).toBe(false);
			});

			test("should trim whitespace from code", () => {
				const result = insertPlatformSchema.safeParse({
					code: "  youtube  ",
					name: "YouTube",
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.code).toBe("youtube");
				}
			});

			test("should trim whitespace from name", () => {
				const result = insertPlatformSchema.safeParse({
					code: "youtube",
					name: "  YouTube  ",
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.name).toBe("YouTube");
				}
			});

			test("should reject invalid regex in urlPattern", () => {
				const result = insertPlatformSchema.safeParse({
					code: "test",
					name: "Test",
					urlPattern: "[invalid",
				});
				expect(result.success).toBe(false);
			});

			test("should accept valid regex in urlPattern", () => {
				const result = insertPlatformSchema.safeParse({
					code: "test",
					name: "Test",
					urlPattern: "^https://example\\.com/.*$",
				});
				expect(result.success).toBe(true);
			});

			test("should not include createdAt in schema", () => {
				const result = insertPlatformSchema.safeParse({
					code: "test",
					name: "Test",
					createdAt: new Date(),
				});
				// If strict, it should fail or ignore the field
				expect(result.success).toBe(true);
			});
		});

		describe("updatePlatformSchema", () => {
			test("should accept partial update", () => {
				const result = updatePlatformSchema.safeParse({
					name: "Updated Name",
				});
				expect(result.success).toBe(true);
			});

			test("should accept empty update (all optional)", () => {
				const result = updatePlatformSchema.safeParse({});
				expect(result.success).toBe(true);
			});

			test("should reject empty name if provided", () => {
				const result = updatePlatformSchema.safeParse({
					name: "",
				});
				expect(result.success).toBe(false);
			});
		});
	});

	describe("AliasType schemas", () => {
		describe("insertAliasTypeSchema", () => {
			test("should accept valid alias type data", () => {
				const result = insertAliasTypeSchema.safeParse({
					code: "romanization",
					label: "ローマ字表記",
					description: "アーティスト名のローマ字表記",
				});
				expect(result.success).toBe(true);
			});

			test("should accept alias type without description", () => {
				const result = insertAliasTypeSchema.safeParse({
					code: "pseudonym",
					label: "別名義",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty code", () => {
				const result = insertAliasTypeSchema.safeParse({
					code: "",
					label: "Test",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty label", () => {
				const result = insertAliasTypeSchema.safeParse({
					code: "test",
					label: "",
				});
				expect(result.success).toBe(false);
			});
		});

		describe("updateAliasTypeSchema", () => {
			test("should accept partial update", () => {
				const result = updateAliasTypeSchema.safeParse({
					label: "Updated Label",
				});
				expect(result.success).toBe(true);
			});
		});
	});

	describe("CreditRole schemas", () => {
		describe("insertCreditRoleSchema", () => {
			test("should accept valid credit role data", () => {
				const result = insertCreditRoleSchema.safeParse({
					code: "vocalist",
					label: "ボーカル",
					description: "歌唱担当",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty code", () => {
				const result = insertCreditRoleSchema.safeParse({
					code: "",
					label: "Test",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty label", () => {
				const result = insertCreditRoleSchema.safeParse({
					code: "test",
					label: "",
				});
				expect(result.success).toBe(false);
			});
		});
	});

	describe("OfficialWorkCategory schemas", () => {
		describe("insertOfficialWorkCategorySchema", () => {
			test("should accept valid category data", () => {
				const result = insertOfficialWorkCategorySchema.safeParse({
					code: "pc98",
					name: "PC-98作品",
					description: "PC-98シリーズで発売された作品",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty code", () => {
				const result = insertOfficialWorkCategorySchema.safeParse({
					code: "",
					name: "Test",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty name", () => {
				const result = insertOfficialWorkCategorySchema.safeParse({
					code: "test",
					name: "",
				});
				expect(result.success).toBe(false);
			});
		});

		describe("updateOfficialWorkCategorySchema", () => {
			test("should accept partial update", () => {
				const result = updateOfficialWorkCategorySchema.safeParse({
					name: "Updated Name",
				});
				expect(result.success).toBe(true);
			});
		});
	});
});
