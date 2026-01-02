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
	eventDays,
	events,
} from "@thac/db";
import { eventDaysRouter } from "../../../src/routes/admin/events/event-days";
import { createTestEvent } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// レスポンスの型定義
interface EventDayResponse {
	id: string;
	eventId: string;
	dayNumber: number;
	date: string;
	updatedAt: string;
}

interface ErrorResponse {
	error: string;
	details?: unknown;
}

interface DeleteResponse {
	success: boolean;
	id: string;
}

describe("Admin Event Days API", () => {
	let sqlite: Database;
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		const testDb = createTestDatabase();
		sqlite = testDb.sqlite;
		__setTestDatabase(testDb.db);
		app = createTestAdminApp(eventDaysRouter);
	});

	beforeEach(() => {
		truncateAllTables(sqlite);
	});

	afterAll(() => {
		__resetDatabase();
		sqlite.close();
	});

	describe("GET /:eventId/days - 開催日一覧取得", () => {
		test("存在しないイベントは404を返す", async () => {
			const res = await app.request("/ev_nonexistent/days");
			expect(res.status).toBe(404);
		});

		test("開催日がない場合は空配列を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));

			const res = await app.request("/ev_test_001/days");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventDayResponse[];
			expect(json).toEqual([]);
		});

		test("開催日一覧を日番号順で返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values([
				{
					id: "ed_002",
					eventId: "ev_test_001",
					dayNumber: 2,
					date: "2024-08-12",
				},
				{
					id: "ed_001",
					eventId: "ev_test_001",
					dayNumber: 1,
					date: "2024-08-11",
				},
				{
					id: "ed_003",
					eventId: "ev_test_001",
					dayNumber: 3,
					date: "2024-08-13",
				},
			]);

			const res = await app.request("/ev_test_001/days");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventDayResponse[];
			expect(json).toHaveLength(3);
			expect(json[0]?.dayNumber).toBe(1);
			expect(json[1]?.dayNumber).toBe(2);
			expect(json[2]?.dayNumber).toBe(3);
		});
	});

	describe("POST /:eventId/days - 開催日追加", () => {
		test("存在しないイベントは404を返す", async () => {
			const res = await app.request("/ev_nonexistent/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_001",
					dayNumber: 1,
					date: "2024-08-11",
				}),
			});
			expect(res.status).toBe(404);
		});

		test("新しい開催日を追加できる", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));

			const res = await app.request("/ev_test_001/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_001",
					dayNumber: 1,
					date: "2024-08-11",
				}),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as EventDayResponse;
			expect(json.id).toBe("ed_001");
			expect(json.dayNumber).toBe(1);
			expect(json.date).toBe("2024-08-11");
		});

		test("ID重複は409を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_001",
					dayNumber: 2,
					date: "2024-08-12",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("同一イベント内で日番号が重複すると409を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_002",
					dayNumber: 1,
					date: "2024-08-12",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("同一イベント内で日付が重複すると409を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_002",
					dayNumber: 2,
					date: "2024-08-11",
				}),
			});

			expect(res.status).toBe(409);
		});

		test("異なるイベントでは同じ日番号・日付を使用可能", async () => {
			await db
				.insert(events)
				.values([
					createTestEvent({ id: "ev_test_001" }),
					createTestEvent({ id: "ev_test_002" }),
				]);
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_002/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: "ed_002",
					dayNumber: 1,
					date: "2024-08-11",
				}),
			});

			expect(res.status).toBe(201);
		});

		test("バリデーションエラーは400を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));

			const res = await app.request("/ev_test_001/days", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					// id missing
					dayNumber: 1,
					date: "2024-08-11",
				}),
			});

			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBeDefined();
		});
	});

	describe("PUT /:eventId/days/:dayId - 開催日更新", () => {
		test("存在しない開催日は404を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));

			const res = await app.request("/ev_test_001/days/ed_nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		test("開催日を更新できる", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days/ed_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ date: "2024-08-15" }),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as EventDayResponse;
			expect(json.date).toBe("2024-08-15");
		});

		test("日番号を更新できる", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days/ed_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dayNumber: 2 }),
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as EventDayResponse;
			expect(json.dayNumber).toBe(2);
		});

		test("更新時に日番号が他と重複すると409を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values([
				{
					id: "ed_001",
					eventId: "ev_test_001",
					dayNumber: 1,
					date: "2024-08-11",
				},
				{
					id: "ed_002",
					eventId: "ev_test_001",
					dayNumber: 2,
					date: "2024-08-12",
				},
			]);

			const res = await app.request("/ev_test_001/days/ed_002", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ dayNumber: 1 }),
			});

			expect(res.status).toBe(409);
		});

		test("更新時に日付が他と重複すると409を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values([
				{
					id: "ed_001",
					eventId: "ev_test_001",
					dayNumber: 1,
					date: "2024-08-11",
				},
				{
					id: "ed_002",
					eventId: "ev_test_001",
					dayNumber: 2,
					date: "2024-08-12",
				},
			]);

			const res = await app.request("/ev_test_001/days/ed_002", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ date: "2024-08-11" }),
			});

			expect(res.status).toBe(409);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days/ed_001", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					date: "2024-08-15",
					updatedAt: "2000-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:eventId/days/:dayId - 開催日削除", () => {
		test("存在しない開催日は404を返す", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));

			const res = await app.request("/ev_test_001/days/ed_nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});

		test("開催日を削除できる", async () => {
			await db.insert(events).values(createTestEvent({ id: "ev_test_001" }));
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			const res = await app.request("/ev_test_001/days/ed_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(200);
			const json = (await res.json()) as DeleteResponse;
			expect(json.success).toBe(true);
			expect(json.id).toBe("ed_001");

			// 削除されたことを確認
			const checkRes = await app.request("/ev_test_001/days");
			const days = (await checkRes.json()) as EventDayResponse[];
			expect(days).toHaveLength(0);
		});

		test("別のイベントの開催日は削除できない", async () => {
			await db
				.insert(events)
				.values([
					createTestEvent({ id: "ev_test_001" }),
					createTestEvent({ id: "ev_test_002" }),
				]);
			await db.insert(eventDays).values({
				id: "ed_001",
				eventId: "ev_test_001",
				dayNumber: 1,
				date: "2024-08-11",
			});

			// ev_test_002のエンドポイントからev_test_001の開催日を削除しようとする
			const res = await app.request("/ev_test_002/days/ed_001", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(eventDaysRouter, { user: null });
			const res = await unauthApp.request("/ev_test_001/days");
			expect(res.status).toBe(401);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(eventDaysRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/ev_test_001/days");
			expect(res.status).toBe(403);
		});
	});
});
