import { describe, expect, test } from "bun:test";
import {
	insertTrackDerivationSchema,
	insertTrackOfficialSongSchema,
	updateTrackOfficialSongSchema,
} from "../schema/track-relations.validation";

describe("trackOfficialSongs validation schemas", () => {
	describe("insertTrackOfficialSongSchema", () => {
		test("should accept valid data with required fields only", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid data with all optional fields", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				partPosition: 1,
				startSecond: 30.5,
				endSecond: 60.0,
				confidence: 90,
				notes: "メインのアレンジ原曲",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.partPosition).toBe(1);
				expect(result.data.startSecond).toBe(30.5);
				expect(result.data.endSecond).toBe(60.0);
				expect(result.data.confidence).toBe(90);
				expect(result.data.notes).toBe("メインのアレンジ原曲");
			}
		});

		test("should reject empty id", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "",
				trackId: "tr_12345",
				officialSongId: "01010001",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty trackId", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "",
				officialSongId: "01010001",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty officialSongId", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject negative confidence", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				confidence: -1,
			});
			expect(result.success).toBe(false);
		});

		test("should reject confidence greater than 100", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				confidence: 101,
			});
			expect(result.success).toBe(false);
		});

		test("should accept confidence at boundary values", () => {
			const result0 = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				confidence: 0,
			});
			expect(result0.success).toBe(true);

			const result100 = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				confidence: 100,
			});
			expect(result100.success).toBe(true);
		});

		test("should reject negative startSecond", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				startSecond: -1,
			});
			expect(result.success).toBe(false);
		});

		test("should accept startSecond of 0", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				startSecond: 0,
			});
			expect(result.success).toBe(true);
		});

		test("should reject endSecond less than startSecond", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				startSecond: 60,
				endSecond: 30,
			});
			expect(result.success).toBe(false);
		});

		test("should accept equal startSecond and endSecond", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				startSecond: 30,
				endSecond: 30,
			});
			expect(result.success).toBe(true);
		});

		test("should reject non-integer partPosition", () => {
			const result = insertTrackOfficialSongSchema.safeParse({
				id: "to_12345",
				trackId: "tr_12345",
				officialSongId: "01010001",
				partPosition: 1.5,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("updateTrackOfficialSongSchema", () => {
		test("should accept empty update (all fields optional)", () => {
			const result = updateTrackOfficialSongSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with partPosition only", () => {
			const result = updateTrackOfficialSongSchema.safeParse({
				partPosition: 2,
			});
			expect(result.success).toBe(true);
		});

		test("should accept partial update with confidence only", () => {
			const result = updateTrackOfficialSongSchema.safeParse({
				confidence: 75,
			});
			expect(result.success).toBe(true);
		});

		test("should reject invalid confidence in update", () => {
			const result = updateTrackOfficialSongSchema.safeParse({
				confidence: 150,
			});
			expect(result.success).toBe(false);
		});

		test("should reject endSecond less than startSecond in update", () => {
			const result = updateTrackOfficialSongSchema.safeParse({
				startSecond: 100,
				endSecond: 50,
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("trackDerivations validation schemas", () => {
	describe("insertTrackDerivationSchema", () => {
		test("should accept valid data with required fields only", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "td_12345",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});
			expect(result.success).toBe(true);
		});

		test("should accept valid data with notes", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "td_12345",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
				notes: "リミックス版",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.notes).toBe("リミックス版");
			}
		});

		test("should reject empty id", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "",
				childTrackId: "tr_child",
				parentTrackId: "tr_parent",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty childTrackId", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "td_12345",
				childTrackId: "",
				parentTrackId: "tr_parent",
			});
			expect(result.success).toBe(false);
		});

		test("should reject empty parentTrackId", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "td_12345",
				childTrackId: "tr_child",
				parentTrackId: "",
			});
			expect(result.success).toBe(false);
		});

		test("should reject self-reference (childTrackId equals parentTrackId)", () => {
			const result = insertTrackDerivationSchema.safeParse({
				id: "td_12345",
				childTrackId: "tr_same",
				parentTrackId: "tr_same",
			});
			expect(result.success).toBe(false);
		});
	});
});
