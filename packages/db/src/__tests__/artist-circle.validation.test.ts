import { describe, expect, test } from "bun:test";
import {
	insertArtistAliasSchema,
	insertArtistSchema,
	insertCircleLinkSchema,
	insertCircleSchema,
	updateArtistAliasSchema,
	updateArtistSchema,
	updateCircleLinkSchema,
	updateCircleSchema,
} from "../schema/artist-circle.validation";

describe("artist-circle validation schemas", () => {
	describe("Artist schemas", () => {
		describe("insertArtistSchema", () => {
			test("should accept valid artist data with latin script", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "ZUN",
					initialScript: "latin",
					nameInitial: "Z",
				});
				expect(result.success).toBe(true);
			});

			test("should accept valid artist data with hiragana script", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "あきやまうに",
					initialScript: "hiragana",
					nameInitial: "あ",
				});
				expect(result.success).toBe(true);
			});

			test("should accept valid artist data with kanji script (no initial required)", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "上海アリス幻樂団",
					initialScript: "kanji",
				});
				expect(result.success).toBe(true);
			});

			test("should accept artist with all optional fields", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "ZUN",
					nameJa: "ズン",
					nameEn: "ZUN",
					sortName: "ZUN",
					initialScript: "latin",
					nameInitial: "Z",
					notes: "東方Projectの作者",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty id", () => {
				const result = insertArtistSchema.safeParse({
					id: "",
					name: "Test",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty name", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject whitespace-only name", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "   ",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject name exceeding 200 characters", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "a".repeat(201),
					initialScript: "latin",
					nameInitial: "A",
				});
				expect(result.success).toBe(false);
			});

			test("should reject missing nameInitial for latin script", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "ZUN",
					initialScript: "latin",
				});
				expect(result.success).toBe(false);
			});

			test("should reject missing nameInitial for hiragana script", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "あきやまうに",
					initialScript: "hiragana",
				});
				expect(result.success).toBe(false);
			});

			test("should reject missing nameInitial for katakana script", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "アキヤマウニ",
					initialScript: "katakana",
				});
				expect(result.success).toBe(false);
			});

			test("should reject nameInitial with more than 1 character", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "ZUN",
					initialScript: "latin",
					nameInitial: "ZU",
				});
				expect(result.success).toBe(false);
			});

			test("should reject invalid initialScript", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "Test",
					initialScript: "invalid",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject notes exceeding 1000 characters", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "ZUN",
					initialScript: "latin",
					nameInitial: "Z",
					notes: "a".repeat(1001),
				});
				expect(result.success).toBe(false);
			});

			test("should trim whitespace from name", () => {
				const result = insertArtistSchema.safeParse({
					id: "art_12345",
					name: "  ZUN  ",
					initialScript: "latin",
					nameInitial: "Z",
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.name).toBe("ZUN");
				}
			});
		});

		describe("updateArtistSchema", () => {
			test("should accept partial update", () => {
				const result = updateArtistSchema.safeParse({
					name: "Updated Name",
				});
				expect(result.success).toBe(true);
			});

			test("should accept empty update (all optional)", () => {
				const result = updateArtistSchema.safeParse({});
				expect(result.success).toBe(true);
			});

			test("should reject empty name if provided", () => {
				const result = updateArtistSchema.safeParse({
					name: "",
				});
				expect(result.success).toBe(false);
			});

			test("should validate nameInitial when initialScript requires it", () => {
				const result = updateArtistSchema.safeParse({
					initialScript: "latin",
				});
				expect(result.success).toBe(false);
			});

			test("should accept update with both initialScript and nameInitial", () => {
				const result = updateArtistSchema.safeParse({
					initialScript: "latin",
					nameInitial: "A",
				});
				expect(result.success).toBe(true);
			});
		});
	});

	describe("ArtistAlias schemas", () => {
		describe("insertArtistAliasSchema", () => {
			test("should accept valid alias data", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "神主",
					initialScript: "kanji",
				});
				expect(result.success).toBe(true);
			});

			test("should accept alias with all optional fields", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "Shinishu",
					aliasTypeCode: "romanization",
					initialScript: "latin",
					nameInitial: "S",
					periodFrom: "2020-01-01",
					periodTo: "2023-12-31",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty id", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "",
					artistId: "art_12345",
					name: "Test",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty artistId", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "",
					name: "Test",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty name", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject missing nameInitial for latin script", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "Test",
					initialScript: "latin",
				});
				expect(result.success).toBe(false);
			});

			test("should reject invalid date format in periodFrom", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "Test",
					initialScript: "kanji",
					periodFrom: "2020/01/01",
				});
				expect(result.success).toBe(false);
			});

			test("should accept valid ISO date format", () => {
				const result = insertArtistAliasSchema.safeParse({
					id: "alias_12345",
					artistId: "art_12345",
					name: "Test",
					initialScript: "kanji",
					periodFrom: "2020-01-01",
				});
				expect(result.success).toBe(true);
			});
		});

		describe("updateArtistAliasSchema", () => {
			test("should accept partial update", () => {
				const result = updateArtistAliasSchema.safeParse({
					name: "Updated Alias",
				});
				expect(result.success).toBe(true);
			});

			test("should accept empty update", () => {
				const result = updateArtistAliasSchema.safeParse({});
				expect(result.success).toBe(true);
			});
		});
	});

	describe("Circle schemas", () => {
		describe("insertCircleSchema", () => {
			test("should accept valid circle data", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "上海アリス幻樂団",
					initialScript: "kanji",
				});
				expect(result.success).toBe(true);
			});

			test("should accept circle with all optional fields", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "Sound Holic",
					nameJa: "サウンドホリック",
					nameEn: "SOUND HOLIC",
					initialScript: "latin",
					nameInitial: "S",
					notes: "東方アレンジサークル",
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty id", () => {
				const result = insertCircleSchema.safeParse({
					id: "",
					name: "Test",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty name", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "",
					initialScript: "latin",
					nameInitial: "T",
				});
				expect(result.success).toBe(false);
			});

			test("should reject name exceeding 200 characters", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "a".repeat(201),
					initialScript: "latin",
					nameInitial: "A",
				});
				expect(result.success).toBe(false);
			});

			test("should reject missing nameInitial for latin script", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "Test Circle",
					initialScript: "latin",
				});
				expect(result.success).toBe(false);
			});

			test("should not require nameInitial for kanji script", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "上海アリス幻樂団",
					initialScript: "kanji",
				});
				expect(result.success).toBe(true);
			});

			test("should reject notes exceeding 1000 characters", () => {
				const result = insertCircleSchema.safeParse({
					id: "cir_12345",
					name: "Test",
					initialScript: "kanji",
					notes: "a".repeat(1001),
				});
				expect(result.success).toBe(false);
			});
		});

		describe("updateCircleSchema", () => {
			test("should accept partial update", () => {
				const result = updateCircleSchema.safeParse({
					name: "Updated Circle",
				});
				expect(result.success).toBe(true);
			});

			test("should accept empty update", () => {
				const result = updateCircleSchema.safeParse({});
				expect(result.success).toBe(true);
			});

			test("should reject empty name if provided", () => {
				const result = updateCircleSchema.safeParse({
					name: "",
				});
				expect(result.success).toBe(false);
			});
		});
	});

	describe("CircleLink schemas", () => {
		describe("insertCircleLinkSchema", () => {
			test("should accept valid link data", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(true);
			});

			test("should accept link with all optional fields", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "https://twitter.com/example",
					platformId: "12345678",
					handle: "@example",
					isOfficial: true,
					isPrimary: true,
				});
				expect(result.success).toBe(true);
			});

			test("should reject empty id", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty circleId", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "",
					platformCode: "twitter",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(false);
			});

			test("should reject empty platformCode", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(false);
			});

			test("should reject invalid URL format", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "not-a-valid-url",
				});
				expect(result.success).toBe(false);
			});

			test("should accept valid URL", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "youtube",
					url: "https://www.youtube.com/@example",
				});
				expect(result.success).toBe(true);
			});

			test("should default isOfficial to true", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.isOfficial).toBe(true);
				}
			});

			test("should default isPrimary to false", () => {
				const result = insertCircleLinkSchema.safeParse({
					id: "link_12345",
					circleId: "cir_12345",
					platformCode: "twitter",
					url: "https://twitter.com/example",
				});
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.isPrimary).toBe(false);
				}
			});
		});

		describe("updateCircleLinkSchema", () => {
			test("should accept partial update", () => {
				const result = updateCircleLinkSchema.safeParse({
					url: "https://twitter.com/updated",
				});
				expect(result.success).toBe(true);
			});

			test("should accept empty update", () => {
				const result = updateCircleLinkSchema.safeParse({});
				expect(result.success).toBe(true);
			});

			test("should reject invalid URL if provided", () => {
				const result = updateCircleLinkSchema.safeParse({
					url: "not-a-url",
				});
				expect(result.success).toBe(false);
			});

			test("should accept boolean flags update", () => {
				const result = updateCircleLinkSchema.safeParse({
					isOfficial: false,
					isPrimary: true,
				});
				expect(result.success).toBe(true);
			});
		});
	});
});
