import type { Database } from "bun:sqlite";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import {
	__resetDatabase,
	__setTestDatabase,
	artistAliases,
	artists,
	creditRoles,
	db,
	releases,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { trackCreditsRouter } from "../../../src/routes/admin/releases/track-credits";
import {
	createTestArtist,
	createTestArtistAlias,
	createTestRelease,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	type DeleteResponse,
	deleteRequest,
	expectConflict,
	expectCreated,
	expectForbidden,
	expectNotFound,
	expectSuccess,
	expectUnauthorized,
	postJson,
	putJson,
} from "../../helpers/test-response";

// レスポンスの型定義
interface TrackCreditResponse {
	id: string;
	trackId: string;
	artistId: string;
	artistAliasId: string | null;
	creditName: string;
	creditPosition: number | null;
	artist?: unknown;
	artistAlias?: unknown;
	roles?: unknown[];
}

describe("Admin Track Credits API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackCreditsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:releaseId/tracks/:trackId/credits - クレジット一覧取得", () => {
		test("存在しないトラックは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));

			const res = await app.request(
				"/rel_test_001/tracks/tr_nonexistent/credits",
			);
			await expectNotFound(res);
		});

		test("クレジットがない場合は空配列を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			const res = await app.request("/rel_test_001/tracks/tr_test_001/credits");
			const json = await expectSuccess<TrackCreditResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("クレジット一覧をアーティスト情報付きで返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db
				.insert(artists)
				.values(createTestArtist({ id: "ar_test_001", name: "Test Artist" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Test Artist",
				creditPosition: 1,
			});

			const res = await app.request("/rel_test_001/tracks/tr_test_001/credits");
			const json = await expectSuccess<TrackCreditResponse[]>(res);
			expect(json).toHaveLength(1);
			expect(json[0]?.creditName).toBe("Test Artist");
			expect(json[0]?.artist).toBeDefined();
		});

		test("役割情報を含めて返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(creditRoles).values([
				{ code: "composer", label: "Composer", sortOrder: 1 },
				{ code: "arranger", label: "Arranger", sortOrder: 2 },
			]);
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});
			await db.insert(trackCreditRoles).values([
				{ trackCreditId: "tc_001", roleCode: "composer", rolePosition: 1 },
				{ trackCreditId: "tc_001", roleCode: "arranger", rolePosition: 2 },
			]);

			const res = await app.request("/rel_test_001/tracks/tr_test_001/credits");
			const json = await expectSuccess<TrackCreditResponse[]>(res);
			expect(json[0]?.roles).toHaveLength(2);
		});
	});

	describe("POST /:releaseId/tracks/:trackId/credits - クレジット追加", () => {
		test("存在しないトラックは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));

			const res = await app.request(
				"/rel_test_001/tracks/tr_nonexistent/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					creditName: "Test Artist",
				}),
			);
			await expectNotFound(res);
		});

		test("存在しないアーティストは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_nonexistent",
					creditName: "Test",
				}),
			);
			await expectNotFound(res);
		});

		test("新しいクレジットを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db
				.insert(artists)
				.values(createTestArtist({ id: "ar_test_001", name: "Test Artist" }));

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					creditName: "Test Artist",
				}),
			);

			const json = await expectCreated<TrackCreditResponse>(res);
			expect(json.id).toBe("tc_001");
			expect(json.creditName).toBe("Test Artist");
		});

		test("別名義付きでクレジットを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_001",
					name: "Alias Name",
				}),
			);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias Name",
				}),
			);

			const json = await expectCreated<TrackCreditResponse>(res);
			expect(json.artistAliasId).toBe("aa_test_001");
		});

		test("アーティストに属さない別名義は404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db
				.insert(artists)
				.values([
					createTestArtist({ id: "ar_test_001" }),
					createTestArtist({ id: "ar_test_002" }),
				]);
			await db.insert(artistAliases).values(
				createTestArtistAlias({
					id: "aa_test_001",
					artistId: "ar_test_002", // 異なるアーティストに属する
					name: "Alias Name",
				}),
			);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					artistAliasId: "aa_test_001",
					creditName: "Alias Name",
				}),
			);

			await expectNotFound(res);
		});

		test("役割付きでクレジットを追加できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(creditRoles).values([
				{ code: "composer", label: "Composer", sortOrder: 1 },
				{ code: "arranger", label: "Arranger", sortOrder: 2 },
			]);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					creditName: "Artist",
					rolesCodes: ["composer", "arranger"],
				}),
			);

			await expectCreated<TrackCreditResponse>(res);

			// 役割が登録されているか確認
			const checkRes = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
			);
			const credits = await expectSuccess<TrackCreditResponse[]>(checkRes);
			expect(credits[0]?.roles).toHaveLength(2);
		});

		test("ID重複は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_001",
					artistId: "ar_test_001",
					creditName: "Artist 2",
				}),
			);

			await expectConflict(res);
		});

		test("同一トラックで同一アーティスト・別名義の重複は409を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
				postJson({
					id: "tc_002",
					artistId: "ar_test_001",
					creditName: "Artist Same",
				}),
			);

			await expectConflict(res);
		});
	});

	describe("PUT /:releaseId/tracks/:trackId/credits/:creditId - クレジット更新", () => {
		test("存在しないクレジットは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_nonexistent",
				putJson({ creditName: "Updated" }),
			);

			await expectNotFound(res);
		});

		test("クレジット名を更新できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Old Name",
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001",
				putJson({ creditName: "New Name" }),
			);

			const json = await expectSuccess<TrackCreditResponse>(res);
			expect(json.creditName).toBe("New Name");
		});

		test("役割を更新できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(creditRoles).values([
				{ code: "composer", label: "Composer", sortOrder: 1 },
				{ code: "lyricist", label: "Lyricist", sortOrder: 2 },
			]);
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});
			await db.insert(trackCreditRoles).values({
				trackCreditId: "tc_001",
				roleCode: "composer",
				rolePosition: 1,
			});

			// creditNameも一緒に送信（rolesCodes単独では更新値がなくなるため）
			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001",
				putJson({
					creditName: "Artist",
					rolesCodes: ["lyricist"],
				}),
			);

			await expectSuccess<TrackCreditResponse>(res);

			// 役割が更新されたか確認
			const checkRes = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
			);
			const credits = await expectSuccess<TrackCreditResponse[]>(checkRes);
			expect(credits[0]?.roles).toHaveLength(1);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});

			const oldTimestamp = new Date(2000, 0, 1).toISOString();
			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001",
				putJson({
					creditName: "Updated",
					updatedAt: oldTimestamp,
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:releaseId/tracks/:trackId/credits/:creditId - クレジット削除", () => {
		test("存在しないクレジットは404を返す", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_nonexistent",
				deleteRequest(),
			);

			await expectNotFound(res);
		});

		test("クレジットを削除できる", async () => {
			await db
				.insert(releases)
				.values(createTestRelease({ id: "rel_test_001" }));
			await db
				.insert(tracks)
				.values(
					createTestTrack({ id: "tr_test_001", releaseId: "rel_test_001" }),
				);
			await db.insert(artists).values(createTestArtist({ id: "ar_test_001" }));
			await db.insert(trackCredits).values({
				id: "tc_001",
				trackId: "tr_test_001",
				artistId: "ar_test_001",
				creditName: "Artist",
			});

			const res = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits/tc_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);

			// 削除されたことを確認
			const checkRes = await app.request(
				"/rel_test_001/tracks/tr_test_001/credits",
			);
			const credits = await expectSuccess<TrackCreditResponse[]>(checkRes);
			expect(credits).toHaveLength(0);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackCreditsRouter, { user: null });
			const res = await unauthApp.request(
				"/rel_test_001/tracks/tr_test_001/credits",
			);
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackCreditsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request(
				"/rel_test_001/tracks/tr_test_001/credits",
			);
			await expectForbidden(res);
		});
	});
});
