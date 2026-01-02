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
	db,
	officialSongs,
	trackOfficialSongs,
	tracks,
} from "@thac/db";
import { trackOfficialSongsRouter } from "../../../src/routes/admin/tracks/official-songs";
import {
	createTestOfficialSong,
	createTestTrack,
} from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";
import {
	type DeleteResponse,
	deleteRequest,
	expectBadRequest,
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
interface TrackOfficialSongResponse {
	id: string;
	trackId: string;
	officialSongId: string | null;
	partPosition: number;
	notes: string | null;
	officialSong?: {
		id: string;
		name: string;
		nameJa: string;
	} | null;
}

describe("Admin Track Official Songs API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(trackOfficialSongsRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:trackId/official-songs - 原曲紐付け一覧取得", () => {
		test("存在しないトラックは404を返す", async () => {
			const res = await app.request("/tr_nonexistent/official-songs");
			await expectNotFound(res);
		});

		test("紐付けがない場合は空配列を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request("/tr_test_001/official-songs");
			const json = await expectSuccess<TrackOfficialSongResponse[]>(res);
			expect(json).toEqual([]);
		});

		test("原曲紐付けを公式楽曲情報付きで返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db.insert(officialSongs).values(
				createTestOfficialSong({
					id: "os_test_001",
					name: "Official Song",
					nameJa: "公式楽曲",
				}),
			);
			await db.insert(trackOfficialSongs).values({
				id: "tos_001",
				trackId: "tr_test_001",
				officialSongId: "os_test_001",
				partPosition: 1,
			});

			const res = await app.request("/tr_test_001/official-songs");
			const json = await expectSuccess<TrackOfficialSongResponse[]>(res);
			expect(json).toHaveLength(1);
			expect(json[0]?.officialSongId).toBe("os_test_001");
			expect(json[0]?.officialSong?.name).toBe("Official Song");
		});

		test("partPosition順にソートして返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001", name: "Song A" }),
					createTestOfficialSong({ id: "os_test_002", name: "Song B" }),
				]);
			await db.insert(trackOfficialSongs).values([
				{
					id: "tos_002",
					trackId: "tr_test_001",
					officialSongId: "os_test_002",
					partPosition: 2,
				},
				{
					id: "tos_001",
					trackId: "tr_test_001",
					officialSongId: "os_test_001",
					partPosition: 1,
				},
			]);

			const res = await app.request("/tr_test_001/official-songs");
			const json = await expectSuccess<TrackOfficialSongResponse[]>(res);
			expect(json[0]?.partPosition).toBe(1);
			expect(json[1]?.partPosition).toBe(2);
		});
	});

	describe("POST /:trackId/official-songs - 原曲紐付け追加", () => {
		test("存在しないトラックは404を返す", async () => {
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));

			const res = await app.request(
				"/tr_nonexistent/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_test_001",
				}),
			);
			await expectNotFound(res);
		});

		test("存在しない公式楽曲は404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_nonexistent",
				}),
			);
			await expectNotFound(res);
		});

		test("新しい原曲紐付けを追加できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_test_001",
				}),
			);

			const json = await expectCreated<TrackOfficialSongResponse>(res);
			expect(json.id).toBe("tos_001");
			expect(json.officialSongId).toBe("os_test_001");
		});

		test("partPositionが自動設定される", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001" }),
					createTestOfficialSong({ id: "os_test_002" }),
				]);

			// 1つ目を追加
			await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_test_001",
				}),
			);

			// 2つ目を追加（partPosition自動設定）
			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_002",
					officialSongId: "os_test_002",
				}),
			);

			const json = await expectCreated<TrackOfficialSongResponse>(res);
			expect(json.partPosition).toBe(2);
		});

		test("ID重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001" }),
					createTestOfficialSong({ id: "os_test_002" }),
				]);
			await db.insert(trackOfficialSongs).values({
				id: "tos_001",
				trackId: "tr_test_001",
				officialSongId: "os_test_001",
				partPosition: 1,
			});

			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_test_002",
				}),
			);

			await expectConflict(res);
		});

		test("同一公式楽曲・順序の重複は409を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));
			await db.insert(trackOfficialSongs).values({
				id: "tos_001",
				trackId: "tr_test_001",
				officialSongId: "os_test_001",
				partPosition: 1,
			});

			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_002",
					officialSongId: "os_test_001",
					partPosition: 1,
				}),
			);

			await expectConflict(res);
		});

		test("メモ付きで紐付けを追加できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs",
				postJson({
					id: "tos_001",
					officialSongId: "os_test_001",
					notes: "イントロアレンジ",
				}),
			);

			const json = await expectCreated<TrackOfficialSongResponse>(res);
			expect(json.notes).toBe("イントロアレンジ");
		});
	});

	describe("PUT /:trackId/official-songs/:id - 原曲紐付け更新", () => {
		test("存在しない紐付けは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs/tos_nonexistent",
				putJson({ notes: "Updated" }),
			);

			await expectNotFound(res);
		});

		test("メモを更新できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));
			await db.insert(trackOfficialSongs).values({
				id: "tos_001",
				trackId: "tr_test_001",
				officialSongId: "os_test_001",
				partPosition: 1,
			});

			const res = await app.request(
				"/tr_test_001/official-songs/tos_001",
				putJson({ notes: "Updated notes" }),
			);

			const json = await expectSuccess<TrackOfficialSongResponse>(res);
			expect(json.notes).toBe("Updated notes");
		});
	});

	describe("DELETE /:trackId/official-songs/:id - 原曲紐付け削除", () => {
		test("存在しない紐付けは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs/tos_nonexistent",
				deleteRequest(),
			);

			await expectNotFound(res);
		});

		test("紐付けを削除できる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values(createTestOfficialSong({ id: "os_test_001" }));
			await db.insert(trackOfficialSongs).values({
				id: "tos_001",
				trackId: "tr_test_001",
				officialSongId: "os_test_001",
				partPosition: 1,
			});

			const res = await app.request(
				"/tr_test_001/official-songs/tos_001",
				deleteRequest(),
			);

			const json = await expectSuccess<DeleteResponse>(res);
			expect(json.success).toBe(true);
			expect(json.id).toBe("tos_001");

			// 削除されたことを確認
			const checkRes = await app.request("/tr_test_001/official-songs");
			const relations =
				await expectSuccess<TrackOfficialSongResponse[]>(checkRes);
			expect(relations).toHaveLength(0);
		});
	});

	describe("PATCH /:trackId/official-songs/:id/reorder - 並べ替え", () => {
		test("存在しない紐付けは404を返す", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));

			const res = await app.request(
				"/tr_test_001/official-songs/tos_nonexistent/reorder",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ direction: "up" }),
				},
			);

			await expectNotFound(res);
		});

		test("先頭の要素をupできない", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001" }),
					createTestOfficialSong({ id: "os_test_002" }),
				]);
			await db.insert(trackOfficialSongs).values([
				{
					id: "tos_001",
					trackId: "tr_test_001",
					officialSongId: "os_test_001",
					partPosition: 1,
				},
				{
					id: "tos_002",
					trackId: "tr_test_001",
					officialSongId: "os_test_002",
					partPosition: 2,
				},
			]);

			const res = await app.request(
				"/tr_test_001/official-songs/tos_001/reorder",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ direction: "up" }),
				},
			);

			await expectBadRequest(res);
		});

		test("末尾の要素をdownできない", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001" }),
					createTestOfficialSong({ id: "os_test_002" }),
				]);
			await db.insert(trackOfficialSongs).values([
				{
					id: "tos_001",
					trackId: "tr_test_001",
					officialSongId: "os_test_001",
					partPosition: 1,
				},
				{
					id: "tos_002",
					trackId: "tr_test_001",
					officialSongId: "os_test_002",
					partPosition: 2,
				},
			]);

			const res = await app.request(
				"/tr_test_001/official-songs/tos_002/reorder",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ direction: "down" }),
				},
			);

			await expectBadRequest(res);
		});

		test("順序を入れ替えられる", async () => {
			await db.insert(tracks).values(createTestTrack({ id: "tr_test_001" }));
			await db
				.insert(officialSongs)
				.values([
					createTestOfficialSong({ id: "os_test_001", name: "Song A" }),
					createTestOfficialSong({ id: "os_test_002", name: "Song B" }),
				]);
			await db.insert(trackOfficialSongs).values([
				{
					id: "tos_001",
					trackId: "tr_test_001",
					officialSongId: "os_test_001",
					partPosition: 1,
				},
				{
					id: "tos_002",
					trackId: "tr_test_001",
					officialSongId: "os_test_002",
					partPosition: 2,
				},
			]);

			// tos_002をupする
			const res = await app.request(
				"/tr_test_001/official-songs/tos_002/reorder",
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ direction: "up" }),
				},
			);

			const json = await expectSuccess<TrackOfficialSongResponse[]>(res);
			// tos_002が先頭になっている
			expect(json[0]?.id).toBe("tos_002");
			expect(json[0]?.partPosition).toBe(1);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(trackOfficialSongsRouter, {
				user: null,
			});
			const res = await unauthApp.request("/tr_test_001/official-songs");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(trackOfficialSongsRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/tr_test_001/official-songs");
			await expectForbidden(res);
		});
	});
});
