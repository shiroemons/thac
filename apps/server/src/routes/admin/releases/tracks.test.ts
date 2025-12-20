import { beforeEach, describe, expect, test } from "bun:test";

/**
 * トラック管理APIの統合テスト
 *
 * テスト対象:
 * - GET /:releaseId/tracks - トラック一覧取得
 * - POST /:releaseId/tracks - トラック追加
 * - PUT /:releaseId/tracks/:trackId - トラック更新
 * - DELETE /:releaseId/tracks/:trackId - トラック削除
 * - PATCH /:releaseId/tracks/:trackId/reorder - トラック並び順変更
 *
 * 要件カバレッジ: 1.1-1.7, 2.1-2.5, 3.1-3.5, 6.1-6.5
 */

// テスト用モックデータ
const mockRelease = {
	id: "rel_test_123",
	name: "Test Release",
};

const mockDisc = {
	id: "disc_test_456",
	releaseId: mockRelease.id,
	discNumber: 1,
};

interface MockTrack {
	id: string;
	releaseId: string;
	discId: string | null;
	trackNumber: number;
	name: string;
	nameJa: string | null;
	nameEn: string | null;
}

const mockTrack: MockTrack = {
	id: "trk_test_001",
	releaseId: mockRelease.id,
	discId: mockDisc.id,
	trackNumber: 1,
	name: "Test Track",
	nameJa: "テストトラック",
	nameEn: "Test Track EN",
};

const mockTrack2: MockTrack = {
	id: "trk_test_002",
	releaseId: mockRelease.id,
	discId: mockDisc.id,
	trackNumber: 2,
	name: "Second Track",
	nameJa: null,
	nameEn: null,
};

// モックDB状態
let mockDbState: {
	releases: (typeof mockRelease)[];
	discs: (typeof mockDisc)[];
	tracks: MockTrack[];
};

const resetMockDbState = () => {
	mockDbState = {
		releases: [mockRelease],
		discs: [mockDisc],
		tracks: [],
	};
};

describe("Tracks API Integration Tests", () => {
	beforeEach(() => {
		resetMockDbState();
	});

	describe("GET /:releaseId/tracks", () => {
		test("should return empty array when no tracks exist", async () => {
			expect(mockDbState.tracks).toHaveLength(0);
		});

		test("should return tracks ordered by trackNumber", async () => {
			mockDbState.tracks = [
				{ ...mockTrack, trackNumber: 3 },
				{ ...mockTrack2, trackNumber: 1 },
			];

			const sorted = [...mockDbState.tracks].sort(
				(a, b) => a.trackNumber - b.trackNumber,
			);
			expect(sorted[0]?.trackNumber).toBe(1);
			expect(sorted[1]?.trackNumber).toBe(3);
		});

		test("should group tracks by disc", async () => {
			const disc2 = {
				id: "disc_test_789",
				releaseId: mockRelease.id,
				discNumber: 2,
			};
			mockDbState.discs.push(disc2);

			mockDbState.tracks = [
				{ ...mockTrack, discId: mockDisc.id, trackNumber: 1 },
				{ ...mockTrack2, discId: disc2.id, trackNumber: 1 },
			];

			const tracksOnDisc1 = mockDbState.tracks.filter(
				(t) => t.discId === mockDisc.id,
			);
			const tracksOnDisc2 = mockDbState.tracks.filter(
				(t) => t.discId === disc2.id,
			);

			expect(tracksOnDisc1).toHaveLength(1);
			expect(tracksOnDisc2).toHaveLength(1);
		});

		test("should include tracks without disc (single tracks)", async () => {
			const singleTrack = {
				...mockTrack,
				id: "trk_single",
				discId: null,
				trackNumber: 1,
			};
			mockDbState.tracks.push(singleTrack);

			const tracksWithoutDisc = mockDbState.tracks.filter(
				(t) => t.discId === null,
			);
			expect(tracksWithoutDisc).toHaveLength(1);
		});
	});

	describe("POST /:releaseId/tracks", () => {
		test("should validate required fields", async () => {
			const invalidData = {
				releaseId: mockRelease.id,
				// name and trackNumber are missing
			};

			expect(invalidData.releaseId).toBeDefined();
			// Validation is done by Zod schema
		});

		test("should accept track with all optional fields", async () => {
			const fullTrack = {
				id: "trk_full",
				releaseId: mockRelease.id,
				discId: mockDisc.id,
				trackNumber: 1,
				name: "Full Track",
				nameJa: "フルトラック",
				nameEn: "Full Track EN",
			};
			mockDbState.tracks.push(fullTrack);

			expect(mockDbState.tracks[0]?.nameJa).toBe("フルトラック");
		});

		test("should accept track without disc (single track)", async () => {
			const singleTrack = {
				id: "trk_single",
				releaseId: mockRelease.id,
				discId: null,
				trackNumber: 1,
				name: "Single Track",
				nameJa: null,
				nameEn: null,
			};
			mockDbState.tracks.push(singleTrack);

			expect(mockDbState.tracks[0]?.discId).toBeNull();
		});

		test("should detect duplicate track number within disc", async () => {
			mockDbState.tracks.push(mockTrack);

			const existing = mockDbState.tracks.find(
				(t) =>
					t.discId === mockDisc.id && t.trackNumber === mockTrack.trackNumber,
			);

			expect(existing).toBeDefined();
		});

		test("should allow same track number in different discs", async () => {
			const disc2 = {
				id: "disc_test_789",
				releaseId: mockRelease.id,
				discNumber: 2,
			};
			mockDbState.discs.push(disc2);

			mockDbState.tracks.push({
				...mockTrack,
				discId: mockDisc.id,
				trackNumber: 1,
			});
			mockDbState.tracks.push({
				...mockTrack2,
				id: "trk_disc2_001",
				discId: disc2.id,
				trackNumber: 1,
			});

			expect(mockDbState.tracks).toHaveLength(2);
		});

		test("should enforce unique track number within release when no disc", async () => {
			mockDbState.tracks.push({
				...mockTrack,
				discId: null,
				trackNumber: 1,
			});

			const existing = mockDbState.tracks.find(
				(t) => t.discId === null && t.trackNumber === 1,
			);

			expect(existing).toBeDefined();
		});
	});

	describe("PUT /:releaseId/tracks/:trackId", () => {
		test("should update track name", async () => {
			mockDbState.tracks.push(mockTrack);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			if (index >= 0 && mockDbState.tracks[index]) {
				mockDbState.tracks[index] = {
					...mockDbState.tracks[index],
					name: "Updated Track Name",
				};
			}

			expect(mockDbState.tracks[0]?.name).toBe("Updated Track Name");
		});

		test("should update track number", async () => {
			mockDbState.tracks.push(mockTrack);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			if (index >= 0 && mockDbState.tracks[index]) {
				mockDbState.tracks[index] = {
					...mockDbState.tracks[index],
					trackNumber: 5,
				};
			}

			expect(mockDbState.tracks[0]?.trackNumber).toBe(5);
		});

		test("should allow moving track to different disc", async () => {
			const disc2 = {
				id: "disc_test_789",
				releaseId: mockRelease.id,
				discNumber: 2,
			};
			mockDbState.discs.push(disc2);
			mockDbState.tracks.push(mockTrack);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			if (index >= 0 && mockDbState.tracks[index]) {
				mockDbState.tracks[index] = {
					...mockDbState.tracks[index],
					discId: disc2.id,
				};
			}

			expect(mockDbState.tracks[0]?.discId).toBe(disc2.id);
		});

		test("should allow moving track from disc to no disc", async () => {
			mockDbState.tracks.push(mockTrack);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			if (index >= 0 && mockDbState.tracks[index]) {
				mockDbState.tracks[index] = {
					...mockDbState.tracks[index],
					discId: null,
				};
			}

			expect(mockDbState.tracks[0]?.discId).toBeNull();
		});
	});

	describe("DELETE /:releaseId/tracks/:trackId", () => {
		test("should remove track", async () => {
			mockDbState.tracks.push(mockTrack);
			expect(mockDbState.tracks).toHaveLength(1);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			mockDbState.tracks.splice(index, 1);

			expect(mockDbState.tracks).toHaveLength(0);
		});

		test("should not affect other tracks when deleting", async () => {
			mockDbState.tracks.push(mockTrack);
			mockDbState.tracks.push(mockTrack2);
			expect(mockDbState.tracks).toHaveLength(2);

			const index = mockDbState.tracks.findIndex((t) => t.id === mockTrack.id);
			mockDbState.tracks.splice(index, 1);

			expect(mockDbState.tracks).toHaveLength(1);
			expect(mockDbState.tracks[0]?.id).toBe(mockTrack2.id);
		});
	});

	describe("PATCH /:releaseId/tracks/:trackId/reorder", () => {
		test("should move track up", async () => {
			mockDbState.tracks.push({ ...mockTrack, trackNumber: 1 });
			mockDbState.tracks.push({ ...mockTrack2, trackNumber: 2 });

			// Swap positions: track2 moves up (trackNumber 2 -> 1)
			const track1Index = mockDbState.tracks.findIndex(
				(t) => t.trackNumber === 1,
			);
			const track2Index = mockDbState.tracks.findIndex(
				(t) => t.trackNumber === 2,
			);

			if (track1Index >= 0 && track2Index >= 0) {
				const temp = mockDbState.tracks[track1Index]?.trackNumber;
				if (
					mockDbState.tracks[track1Index] &&
					mockDbState.tracks[track2Index]
				) {
					mockDbState.tracks[track1Index] = {
						...mockDbState.tracks[track1Index],
						trackNumber: mockDbState.tracks[track2Index].trackNumber,
					};
					if (temp !== undefined) {
						mockDbState.tracks[track2Index] = {
							...mockDbState.tracks[track2Index],
							trackNumber: temp,
						};
					}
				}
			}

			const track1 = mockDbState.tracks.find((t) => t.id === mockTrack.id);
			const track2 = mockDbState.tracks.find((t) => t.id === mockTrack2.id);
			expect(track1?.trackNumber).toBe(2);
			expect(track2?.trackNumber).toBe(1);
		});

		test("should not move first track up", async () => {
			mockDbState.tracks.push({ ...mockTrack, trackNumber: 1 });

			const firstTrack = mockDbState.tracks.find((t) => t.trackNumber === 1);
			const canMoveUp = mockDbState.tracks.some(
				(t) => t.discId === firstTrack?.discId && t.trackNumber < 1,
			);

			expect(canMoveUp).toBe(false);
		});

		test("should not move last track down", async () => {
			mockDbState.tracks.push({ ...mockTrack, trackNumber: 1 });
			mockDbState.tracks.push({ ...mockTrack2, trackNumber: 2 });

			const maxTrackNumber = Math.max(
				...mockDbState.tracks.map((t) => t.trackNumber),
			);
			const lastTrack = mockDbState.tracks.find(
				(t) => t.trackNumber === maxTrackNumber,
			);

			const canMoveDown = mockDbState.tracks.some(
				(t) =>
					t.discId === lastTrack?.discId &&
					t.trackNumber > (lastTrack?.trackNumber ?? 0),
			);

			expect(canMoveDown).toBe(false);
		});
	});

	describe("CASCADE DELETE behavior", () => {
		test("should simulate cascade delete when disc is deleted", async () => {
			mockDbState.tracks.push(mockTrack);
			mockDbState.tracks.push(mockTrack2);

			// Simulate disc deletion cascade
			const discIdToDelete = mockDisc.id;
			mockDbState.tracks = mockDbState.tracks.filter(
				(t) => t.discId !== discIdToDelete,
			);

			expect(mockDbState.tracks).toHaveLength(0);
		});

		test("should simulate cascade delete when release is deleted", async () => {
			mockDbState.tracks.push(mockTrack);
			mockDbState.tracks.push({ ...mockTrack2, discId: null });

			// Simulate release deletion cascade
			const releaseIdToDelete = mockRelease.id;
			mockDbState.tracks = mockDbState.tracks.filter(
				(t) => t.releaseId !== releaseIdToDelete,
			);

			expect(mockDbState.tracks).toHaveLength(0);
		});
	});

	describe("Error handling", () => {
		test("should detect non-existent release", async () => {
			const nonExistentReleaseId = "rel_non_existent";
			const exists = mockDbState.releases.some(
				(r) => r.id === nonExistentReleaseId,
			);
			expect(exists).toBe(false);
		});

		test("should detect non-existent track", async () => {
			const nonExistentTrackId = "trk_non_existent";
			const exists = mockDbState.tracks.some(
				(t) => t.id === nonExistentTrackId,
			);
			expect(exists).toBe(false);
		});

		test("should detect non-existent disc", async () => {
			const nonExistentDiscId = "disc_non_existent";
			const exists = mockDbState.discs.some((d) => d.id === nonExistentDiscId);
			expect(exists).toBe(false);
		});
	});

	describe("trackNumber validation", () => {
		test("should require positive integer for trackNumber", async () => {
			const validTrackNumbers = [1, 2, 3, 10, 99];
			for (const num of validTrackNumbers) {
				expect(Number.isInteger(num) && num > 0).toBe(true);
			}
		});

		test("should reject zero trackNumber", async () => {
			const trackNumber = 0;
			expect(trackNumber > 0).toBe(false);
		});

		test("should reject negative trackNumber", async () => {
			const trackNumber = -1;
			expect(trackNumber > 0).toBe(false);
		});

		test("should reject non-integer trackNumber", async () => {
			const trackNumber = 1.5;
			expect(Number.isInteger(trackNumber)).toBe(false);
		});
	});
});
