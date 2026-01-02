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
	test,
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
import {
	type DeleteResponse,
	deleteRequest,
	expectBadRequest,
	expectConflict,
	expectCreated,
	expectEmptyList,
	expectForbidden,
	expectNotFound,
	expectPagination,
	expectSuccess,
	expectUnauthorized,
	type PaginatedResponse,
	postJson,
	putJson,
} from "../../helpers/test-response";

// エンティティ固有のレスポンス型
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
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		app = createTestAdminApp(eventSeriesRouter);
	});

	describe("GET / - 一覧取得", () => {
		test("イベントシリーズが存在しない場合、空配列を返す", async () => {
			const res = await app.request("/");
			const json = await expectSuccess<EventSeriesListResponse>(res);

			expect(json.data).toEqual([]);
			expect(json.total).toBe(0);
		});

		test("イベントシリーズ一覧を返す", async () => {
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
			const json = await expectSuccess<EventSeriesListResponse>(res);

			expect(json.data).toHaveLength(2);
			expect(json.total).toBe(2);
		});

		test("検索クエリでフィルタリングできる", async () => {
			const series1 = createTestEventSeries({ name: "コミックマーケット" });
			const series2 = createTestEventSeries({ name: "博麗神社例大祭" });
			await testDb.insert(eventSeries).values([series1, series2]);

			const res = await app.request("/?search=コミック");
			const json = await expectSuccess<EventSeriesListResponse>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("コミックマーケット");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するイベントシリーズを返す", async () => {
			const series = createTestEventSeries({ name: "コミックマーケット" });
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(`/${series.id}`);
			const json = await expectSuccess<EventSeriesResponse>(res);

			expect(json.id).toBe(series.id);
			expect(json.name).toBe("コミックマーケット");
			expect(json.events).toBeDefined();
		});

		test("存在しないイベントシリーズは404を返す", async () => {
			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいイベントシリーズを作成できる", async () => {
			const series = createTestEventSeries({ name: "新しいイベント" });
			const res = await app.request("/", postJson(series));

			const json = await expectCreated<EventSeriesResponse>(res);
			expect(json.id).toBe(series.id);
			expect(json.name).toBe(series.name);
		});

		test("sortOrderが未指定の場合は自動設定される", async () => {
			const existingSeries = createTestEventSeries({ sortOrder: 5 });
			await testDb.insert(eventSeries).values(existingSeries);

			const newSeries = createTestEventSeries();
			const { sortOrder: _, ...seriesWithoutSortOrder } = newSeries;
			const res = await app.request("/", postJson(seriesWithoutSortOrder));

			const json = await expectCreated<EventSeriesResponse>(res);
			expect(json.sortOrder).toBe(6);
		});

		test("重複するIDは409を返す", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const duplicateSeries = createTestEventSeries({
				id: series.id,
				name: "Different Name",
			});
			const res = await app.request("/", postJson(duplicateSeries));

			await expectConflict(res);
		});

		test("重複する名前は409を返す", async () => {
			const series = createTestEventSeries({ name: "コミックマーケット" });
			await testDb.insert(eventSeries).values(series);

			const duplicateSeries = createTestEventSeries({
				name: "コミックマーケット",
			});
			const res = await app.request("/", postJson(duplicateSeries));

			await expectConflict(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("イベントシリーズを更新できる", async () => {
			const series = createTestEventSeries({ name: "Original Series" });
			await testDb.insert(eventSeries).values(series);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${series.id}`);
			const existingSeries = await expectSuccess<EventSeriesResponse>(getRes);

			const res = await app.request(
				`/${series.id}`,
				putJson({
					name: "Updated Series",
					updatedAt: existingSeries.updatedAt,
				}),
			);

			const json = await expectSuccess<EventSeriesResponse>(res);
			expect(json.name).toBe("Updated Series");
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(
				`/${series.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("イベントシリーズを削除できる", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const res = await app.request(`/${series.id}`, deleteRequest());
			await expectSuccess<DeleteResponse>(res);

			// 削除されたことを確認
			const getRes = await app.request(`/${series.id}`);
			await expectNotFound(getRes);
		});

		test("イベントが紐付いている場合は削除できない", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event = createTestEvent({ eventSeriesId: series.id });
			await testDb.insert(events).values(event);

			const res = await app.request(`/${series.id}`, deleteRequest());

			const json = await expectConflict(res);
			expect(json.error).toContain("イベント");
		});
	});

	describe("PUT /reorder - ソート順一括更新", () => {
		test("複数のイベントシリーズのsortOrderを一括更新できる", async () => {
			const series1 = createTestEventSeries({ sortOrder: 0 });
			const series2 = createTestEventSeries({ sortOrder: 1 });
			await testDb.insert(eventSeries).values([series1, series2]);

			const res = await app.request(
				"/reorder",
				putJson({
					items: [
						{ id: series1.id, sortOrder: 1 },
						{ id: series2.id, sortOrder: 0 },
					],
				}),
			);

			await expectSuccess(res);

			// 更新されたことを確認
			const getRes1 = await app.request(`/${series1.id}`);
			const json1 = await expectSuccess<EventSeriesResponse>(getRes1);
			expect(json1.sortOrder).toBe(1);

			const getRes2 = await app.request(`/${series2.id}`);
			const json2 = await expectSuccess<EventSeriesResponse>(getRes2);
			expect(json2.sortOrder).toBe(0);
		});

		test("itemsが配列でない場合は400を返す", async () => {
			const res = await app.request("/reorder", putJson({ items: "invalid" }));
			await expectBadRequest(res);
		});

		test("itemsが不正な形式の場合は400を返す", async () => {
			const res = await app.request(
				"/reorder",
				putJson({
					items: [{ id: "test" }], // sortOrder missing
				}),
			);

			await expectBadRequest(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(eventSeriesRouter, { user: null });
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(eventSeriesRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			await expectForbidden(res);
		});
	});
});

describe("Admin Events API", () => {
	let app: ReturnType<typeof createTestAdminApp>;

	beforeAll(() => {
		app = createTestAdminApp(eventsAdminRouter);
	});

	describe("GET / - 一覧取得", () => {
		test("イベントが存在しない場合、空配列を返す", async () => {
			const res = await app.request("/");
			await expectEmptyList<EventResponse>(res);
		});

		test("イベント一覧をページネーション付きで返す", async () => {
			const event1 = createTestEvent({ name: "Event 1" });
			const event2 = createTestEvent({ name: "Event 2" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request("/?page=1&limit=10");
			const json = await expectSuccess<PaginatedResponse<EventResponse>>(res);

			expectPagination(json, { total: 2, length: 2 });
		});

		test("シリーズIDでフィルタリングできる", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event1 = createTestEvent({
				name: "Linked Event",
				eventSeriesId: series.id,
			});
			const event2 = createTestEvent({ name: "Other Event" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request(`/?seriesId=${series.id}`);
			const json = await expectSuccess<PaginatedResponse<EventResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("Linked Event");
		});

		test("検索クエリでフィルタリングできる", async () => {
			const event1 = createTestEvent({ name: "コミックマーケット101" });
			const event2 = createTestEvent({ name: "例大祭21" });
			await testDb.insert(events).values([event1, event2]);

			const res = await app.request("/?search=コミック");
			const json = await expectSuccess<PaginatedResponse<EventResponse>>(res);

			expect(json.data).toHaveLength(1);
			expect(json.data[0]?.name).toBe("コミックマーケット101");
		});
	});

	describe("GET /:id - 個別取得", () => {
		test("存在するイベントを返す", async () => {
			const event = createTestEvent({ name: "Test Event" });
			await testDb.insert(events).values(event);

			const res = await app.request(`/${event.id}`);
			const json = await expectSuccess<EventResponse>(res);

			expect(json.id).toBe(event.id);
			expect(json.name).toBe("Test Event");
			expect(json.days).toBeDefined();
		});

		test("存在しないイベントは404を返す", async () => {
			const res = await app.request("/nonexistent");
			await expectNotFound(res);
		});
	});

	describe("POST / - 新規作成", () => {
		test("新しいイベントを作成できる", async () => {
			const event = createTestEvent({ name: "New Event" });
			const res = await app.request("/", postJson(event));

			const json = await expectCreated<EventResponse>(res);
			expect(json.id).toBe(event.id);
			expect(json.name).toBe(event.name);
		});

		test("シリーズを紐付けてイベントを作成できる", async () => {
			const series = createTestEventSeries();
			await testDb.insert(eventSeries).values(series);

			const event = createTestEvent({
				name: "コミックマーケット101",
				eventSeriesId: series.id,
				edition: 101,
			});
			const res = await app.request("/", postJson(event));

			const json = await expectCreated<EventResponse>(res);
			expect(json.eventSeriesId).toBe(series.id);
			expect(json.edition).toBe(101);
		});

		test("存在しないシリーズIDは404を返す", async () => {
			const event = createTestEvent({ eventSeriesId: "nonexistent" });
			const res = await app.request("/", postJson(event));

			await expectNotFound(res);
		});

		test("同一シリーズ内で重複する回次は409を返す", async () => {
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
			const res = await app.request("/", postJson(event2));

			await expectConflict(res);
		});

		test("重複するIDは409を返す", async () => {
			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const duplicateEvent = createTestEvent({
				id: event.id,
				name: "Different Name",
			});
			const res = await app.request("/", postJson(duplicateEvent));

			await expectConflict(res);
		});
	});

	describe("PUT /:id - 更新", () => {
		test("イベントを更新できる", async () => {
			const event = createTestEvent({ name: "Original Event" });
			await testDb.insert(events).values(event);

			// 最新のupdatedAtを取得
			const getRes = await app.request(`/${event.id}`);
			const existingEvent = await expectSuccess<EventResponse>(getRes);

			const res = await app.request(
				`/${event.id}`,
				putJson({
					name: "Updated Event",
					updatedAt: existingEvent.updatedAt,
				}),
			);

			const json = await expectSuccess<EventResponse>(res);
			expect(json.name).toBe("Updated Event");
		});

		test("存在しないイベントは404を返す", async () => {
			const res = await app.request(
				"/nonexistent",
				putJson({ name: "Updated" }),
			);
			await expectNotFound(res);
		});

		test("楽観的ロック: 古いupdatedAtでは競合エラーを返す", async () => {
			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const res = await app.request(
				`/${event.id}`,
				putJson({
					name: "Updated",
					updatedAt: "2020-01-01T00:00:00.000Z",
				}),
			);

			await expectConflict(res);
		});
	});

	describe("DELETE /:id - 削除", () => {
		test("イベントを削除できる", async () => {
			const event = createTestEvent();
			await testDb.insert(events).values(event);

			const res = await app.request(`/${event.id}`, deleteRequest());
			await expectSuccess<DeleteResponse>(res);

			// 削除されたことを確認
			const getRes = await app.request(`/${event.id}`);
			await expectNotFound(getRes);
		});

		test("存在しないイベントは404を返す", async () => {
			const res = await app.request("/nonexistent", deleteRequest());
			await expectNotFound(res);
		});
	});

	describe("認証・認可", () => {
		test("未認証リクエストは401を返す", async () => {
			const unauthApp = createTestAdminApp(eventsAdminRouter, { user: null });
			const res = await unauthApp.request("/");
			await expectUnauthorized(res);
		});

		test("非管理者ユーザーは403を返す", async () => {
			const nonAdminApp = createTestAdminApp(eventsAdminRouter, {
				user: { role: "user" },
			});
			const res = await nonAdminApp.request("/");
			await expectForbidden(res);
		});
	});
});
