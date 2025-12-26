import { describe, expect, test } from "bun:test";
import {
	insertTrackCreditRoleSchema,
	insertTrackCreditSchema,
	insertTrackSchema,
	updateTrackCreditSchema,
	updateTrackSchema,
} from "../schema/track.validation";

describe("track validation schemas", () => {
	describe("insertTrackSchema", () => {
		test("should accept valid track data with required fields", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 1,
				name: "Track Name",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.discId).toBeUndefined();
			}
		});

		test("should accept valid track data with all fields", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				discId: "disc_12345",
				trackNumber: 1,
				name: "Track Name",
				nameJa: "トラック名",
				nameEn: "Track Name EN",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.discId).toBe("disc_12345");
				expect(result.data.nameJa).toBe("トラック名");
				expect(result.data.nameEn).toBe("Track Name EN");
			}
		});

		test("should accept null discId for single track release", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				discId: null,
				trackNumber: 1,
				name: "Single Track",
			});
			expect(result.success).toBe(true);
		});

		test("should reject empty id", () => {
			const result = insertTrackSchema.safeParse({
				id: "",
				releaseId: "rel_12345",
				trackNumber: 1,
				name: "Track Name",
			});
			expect(result.success).toBe(false);
		});

		test("should convert empty releaseId to null", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "",
				trackNumber: 1,
				name: "Track Name",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.releaseId).toBe(null);
			}
		});

		test("should accept null releaseId for standalone tracks", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: null,
				trackNumber: 1,
				name: "Single Track",
			});
			expect(result.success).toBe(true);
		});

		test("should accept undefined releaseId", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				trackNumber: 1,
				name: "Standalone Track",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.releaseId).toBeUndefined();
			}
		});

		test("should reject empty name", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 1,
				name: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject trackNumber less than 1", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 0,
				name: "Track Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject negative trackNumber", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: -1,
				name: "Track Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject non-integer trackNumber", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 1.5,
				name: "Track Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject name exceeding 200 characters", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 1,
				name: "a".repeat(201),
			});
			expect(result.success).toBe(false);
		});

		test("should trim whitespace from name", () => {
			const result = insertTrackSchema.safeParse({
				id: "trk_12345",
				releaseId: "rel_12345",
				trackNumber: 1,
				name: "  Track Name  ",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.name).toBe("Track Name");
			}
		});
	});

	describe("updateTrackSchema", () => {
		test("should accept partial update with name only", () => {
			const result = updateTrackSchema.safeParse({
				name: "Updated Track Name",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with trackNumber only", () => {
			const result = updateTrackSchema.safeParse({
				trackNumber: 5,
			});
			expect(result.success).toBe(true);
		});

		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept update with all fields", () => {
			const result = updateTrackSchema.safeParse({
				discId: "disc_67890",
				trackNumber: 3,
				name: "Updated Name",
				nameJa: "更新後名",
				nameEn: "Updated EN",
			});
			expect(result.success).toBe(true);
		});

		test("should accept null discId in update", () => {
			const result = updateTrackSchema.safeParse({
				discId: null,
			});
			expect(result.success).toBe(true);
		});

		test("should reject trackNumber less than 1", () => {
			const result = updateTrackSchema.safeParse({
				trackNumber: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should reject name exceeding 200 characters", () => {
			const result = updateTrackSchema.safeParse({
				name: "a".repeat(201),
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("track credit validation schemas", () => {
	describe("insertTrackCreditSchema", () => {
		test("should accept valid credit data with required fields", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "Artist Name",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid credit data with all fields", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "Alias Name",
				aliasTypeCode: "alias",
				creditPosition: 1,
				artistAliasId: "als_12345",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.creditPosition).toBe(1);
				expect(result.data.artistAliasId).toBe("als_12345");
			}
		});

		test("should accept null creditPosition", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "Artist Name",
				creditPosition: null,
			});
			expect(result.success).toBe(true);
		});

		test("should reject empty id", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "Artist Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty trackId", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "",
				artistId: "art_12345",
				creditName: "Artist Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty artistId", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "",
				creditName: "Artist Name",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty creditName", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject creditPosition less than 1", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "Artist Name",
				creditPosition: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should reject creditName exceeding 200 characters", () => {
			const result = insertTrackCreditSchema.safeParse({
				id: "crd_12345",
				trackId: "trk_12345",
				artistId: "art_12345",
				creditName: "a".repeat(201),
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateTrackCreditSchema", () => {
		test("should accept partial update with creditName only", () => {
			const result = updateTrackCreditSchema.safeParse({
				creditName: "Updated Name",
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with artistId only", () => {
			const result = updateTrackCreditSchema.safeParse({
				artistId: "art_67890",
			});
			expect(result.success).toBe(true);
		});

		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackCreditSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept update with all fields", () => {
			const result = updateTrackCreditSchema.safeParse({
				artistId: "art_67890",
				creditName: "Updated Name",
				aliasTypeCode: "circle",
				creditPosition: 2,
				artistAliasId: "als_67890",
			});
			expect(result.success).toBe(true);
		});

		test("should accept null artistAliasId", () => {
			const result = updateTrackCreditSchema.safeParse({
				artistAliasId: null,
			});
			expect(result.success).toBe(true);
		});

		test("should reject creditPosition less than 1", () => {
			const result = updateTrackCreditSchema.safeParse({
				creditPosition: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should reject creditName exceeding 200 characters", () => {
			const result = updateTrackCreditSchema.safeParse({
				creditName: "a".repeat(201),
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("track credit role validation schemas", () => {
	describe("insertTrackCreditRoleSchema", () => {
		test("should accept valid role data with required fields", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "vocal",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rolePosition).toBe(1);
			}
		});

		test("should accept valid role data with all fields", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "compose",
				rolePosition: 2,
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rolePosition).toBe(2);
			}
		});

		test("should reject empty trackCreditId", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "",
				roleCode: "vocal",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty roleCode", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject rolePosition less than 1", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "vocal",
				rolePosition: 0,
			});
			expect(result.success).toBe(false);
		});

		test("should reject negative rolePosition", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "vocal",
				rolePosition: -1,
			});
			expect(result.success).toBe(false);
		});

		test("should reject non-integer rolePosition", () => {
			const result = insertTrackCreditRoleSchema.safeParse({
				trackCreditId: "crd_12345",
				roleCode: "vocal",
				rolePosition: 1.5,
			});
			expect(result.success).toBe(false);
		});
	});
});
