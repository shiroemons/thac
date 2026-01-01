/**
 * Admin Events API 統合テスト
 *
 * @description
 * イベント・イベントシリーズ管理APIのCRUD操作、認証、楽観的ロックをテスト
 */

import type { Database } from "bun:sqlite";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "bun:test";
import {
	__resetDatabase,
	__setTestDatabase,
	eventSeries,
	events,
} from "@thac/db";
import {
	eventSeriesRouter,
	eventsAdminRouter,
} from "../../../src/routes/admin/events";
import { createTestEvent, createTestEventSeries } from "../../helpers/fixtures";
import { createTestAdminApp } from "../../helpers/test-app";
import { createTestDatabase, truncateAllTables } from "../../helpers/test-db";

// 型定義
interface EventSeriesListResponse {
	data: Array<{
		id: string;
		name: string;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}>;
	total: number;
}

interface EventSeriesResponse {
	id: string;
	name: string;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
	events?: Array<unknown>;
}

interface EventListResponse {
	data: Array<{
		id: string;
		eventSeriesId: string | null;
		name: string;
		edition: number | null;
		totalDays: number;
		venue: string | null;
		startDate: string | null;
		endDate: string | null;
		createdAt: string;
		updatedAt: string;
		seriesName: string | null;
	}>;
	total: number;
	page: number;
	limit: number;
}

interface EventResponse {
	id: string;
	eventSeriesId: string | null;
	name: string;
	edition: number | null;
	totalDays: number;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
	createdAt: string;
	updatedAt: string;
	seriesName?: string | null;
	days?: Array<unknown>;
}

interface ErrorResponse {
	error: string;
	details?: Record<string, string[]>;
}

// 共有テストデータベース
let testDb: ReturnType<typeof createTestDatabase>["db"];
let sqlite: Database;

beforeAll(() => {
	const result = createTestDatabase();
	testDb = result.db;
	sqlite = result.sqlite;
	__setTestDatabase(testDb);
});

beforeEach(() => {
	truncateAllTables(sqlite);
});

afterAll(() => {
	__resetDatabase();
	sqlite.close();
});

describe("Admin Event Series API", () => {
	describe("GET / - 一覧取得", () => {
		it("イベントシリーズが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventSeriesListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("イベントシリーズ一覧を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series1 = createTestEventSeries({
				name: "コミックマーケット",
				sortOrder: 1,
			});
			const series2 = createTestEventSeries({
				name: "博麗神社例大祭",
				sortOrder: 2,
			});
			await testDb.insert(eventSeries).values([series1, series2]);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventSeriesListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series1 = createTestEventSeries({ name: "コミックマーケット" });
			const series2 = createTestEventSeries({ name: "博麗神社例大祭" });
			await testDb.insert(eventSeries).values([series1, series2]);

			const res = await app.request("/?search=コミック");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventSeriesListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("コミックマーケット");
		});
	});

	describe("GET /:id - 個別取得", () => {
		it("存在するイベントシリーズを返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries({ name: "コミックマーケット" });
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(`/${series.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventSeriesResponse;
			expect(json.id).toBe(series.id);
			expect(json.name).toBe("コミックマーケット");
			expect(json.events).toBeDefined();
		});

		it("存在しないイベントシリーズは404を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しいイベントシリーズを作成できる", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries({ name: "新しいイベント" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(series),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as EventSeriesResponse;
			expect(json.id).toBe(series.id);
			expect(json.name).toBe(series.name);
		});

		it("sortOrderが未指定の場合は自動設定される", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const existingSeries = createTestEventSeries({ sortOrder: 5 });
			await testDb.insert(eventSeries).values(existingSeries);

			const newSeries = createTestEventSeries();
			const { sortOrder: _, ...seriesWithoutSortOrder } = newSeries;
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(seriesWithoutSortOrder),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as EventSeriesResponse;
			expect(json.sortOrder).toBe(6);
		});

		it("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const duplicateSeries = createTestEventSeries({
				id: series.id,
				name: "Different Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateSeries),
			});

			expect(res.status).toBe(409);
		});

		it("重複する名前は409を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries({ name: "コミックマーケット" });
			await testDb.insert(eventSeries).values(series);

			const duplicateSeries = createTestEventSeries({
				name: "コミックマーケット",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateSeries),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:id - 更新", () => {
		it("イベントシリーズを更新できる", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries({ name: "Original Series" });
			await testDb.insert(eventSeries).values(series);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${series.id}`);
			const existingSeries = (await getRes.json()) as EventSeriesResponse;

			const updateRes = await app.request(`/${series.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated Series",
					updatedAt: existingSeries.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as EventSeriesResponse;
			expect(json.name).toBe("Updated Series");
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(`/${series.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:id - 削除", () => {
		it("イベントシリーズを削除できる", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(`/${series.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request(`/${series.id}`);
			expect(getRes.status).toBe(404);
		});

		it("イベントが紐付いている場合は削除できない", async () => {
			const app = createTestAdminApp(eventSeriesRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event = createTestEvent({ eventSeriesId: series.id });
			await testDb.insert(events).values(event);

			const res = await app.request(`/${series.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(409);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toContain("イベント");
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(eventSeriesRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});

describe("Admin Events API", () => {
	describe("GET / - 一覧取得", () => {
		it("イベントが存在しない場合、空配列を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const res = await app.request("/");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventListResponse;
			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		it("イベント一覧をページネーション付きで返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event1 = createTestEvent({ name: "Event 1" });
			const event2 = createTestEvent({ name: "Event 2" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request("/?page=1&limit=10");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventListResponse;
			expect(json.data.length).toBe(2);
			expect(json.total).toBe(2);
		});

		it("シリーズIDでフィルタリングできる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event1 = createTestEvent({
				name: "Linked Event",
				eventSeriesId: series.id,
			});
			const event2 = createTestEvent({ name: "Other Event" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request(`/?seriesId=${series.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("Linked Event");
		});

		it("検索クエリでフィルタリングできる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event1 = createTestEvent({ name: "コミックマーケット101" });
			const event2 = createTestEvent({ name: "例大祭21" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request("/?search=コミック");
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventListResponse;
			expect(json.data.length).toBe(1);
			expect(json.data[0]?.name).toBe("コミックマーケット101");
		});
	});

	describe("GET /:id - 個別取得", () => {
		it("存在するイベントを返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent({ name: "Test Event" });
			await testDb.insert(events).values(event);

			const res = await app.request(`/${event.id}`);
			expect(res.status).toBe(200);

			const json = (await res.json()) as EventResponse;
			expect(json.id).toBe(event.id);
			expect(json.name).toBe("Test Event");
			expect(json.days).toBeDefined();
		});

		it("存在しないイベントは404を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const res = await app.request("/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST / - 新規作成", () => {
		it("新しいイベントを作成できる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent({ name: "New Event" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(event),
			});

			expect(res.status).toBe(201);

			const json = (await res.json()) as EventResponse;
			expect(json.id).toBe(event.id);
			expect(json.name).toBe(event.name);
		});

		it("シリーズを紐付けてイベントを作成できる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event = createTestEvent({
				name: "コミックマーケット101",
				eventSeriesId: series.id,
				edition: 101,
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(event),
			});

			expect(res.status).toBe(201);
			const json = (await res.json()) as EventResponse;
			expect(json.eventSeriesId).toBe(series.id);
			expect(json.edition).toBe(101);
		});

		it("存在しないシリーズIDは404を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent({ eventSeriesId: "nonexistent" });
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(event),
			});

			expect(res.status).toBe(404);
		});

		it("同一シリーズ内で重複する回次は409を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event1 = createTestEvent({
				eventSeriesId: series.id,
				edition: 101,
			});
			await testDb.insert(events).values(event1);

			const event2 = createTestEvent({
				eventSeriesId: series.id,
				edition: 101,
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(event2),
			});

			expect(res.status).toBe(409);
		});

		it("重複するIDは409を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const duplicateEvent = createTestEvent({
				id: event.id,
				name: "Different Name",
			});
			const res = await app.request("/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(duplicateEvent),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("PUT /:id - 更新", () => {
		it("イベントを更新できる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent({ name: "Original Event" });
			await testDb.insert(events).values(event);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${event.id}`);
			const existingEvent = (await getRes.json()) as EventResponse;

			const updateRes = await app.request(`/${event.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated Event",
					updatedAt: existingEvent.updatedAt,
				}),
			});

			expect(updateRes.status).toBe(200);
			const json = (await updateRes.json()) as EventResponse;
			expect(json.name).toBe("Updated Event");
		});

		it("存在しないイベントは404を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const res = await app.request("/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const res = await app.request(`/${event.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			});

			expect(res.status).toBe(409);
		});
	});

	describe("DELETE /:id - 削除", () => {
		it("イベントを削除できる", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const res = await app.request(`/${event.id}`, {
				method: "DELETE",
			});

			expect(res.status).toBe(200);

			// 削除されたことを確認
			const getRes = await app.request(`/${event.id}`);
			expect(getRes.status).toBe(404);
		});

		it("存在しないイベントは404を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter);

			const res = await app.request("/nonexistent", {
				method: "DELETE",
			});

			expect(res.status).toBe(404);
		});
	});

	describe("認証・認可", () => {
		it("未認証リクエストは401を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter, { user: null });

			const res = await app.request("/");
			expect(res.status).toBe(401);
		});

		it("非管理者ユーザーは403を返す", async () => {
			const app = createTestAdminApp(eventsAdminRouter, {
				user: { role: "user" },
			});

			const res = await app.request("/");
			expect(res.status).toBe(403);
		});
	});
});
