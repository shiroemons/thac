import { describe, expect, it } from "vitest";
import type {
	Event,
	EventDay,
	PaginatedResponse,
	Platform,
} from "./api-client";
import {
	eventDaySelectOptionsQueryOptions,
	eventDaysQueryOptions,
	eventSelectOptionsQueryOptions,
	type GroupedSelectOptions,
	platformGroupedOptionsQueryOptions,
	type SelectOption,
} from "./query-options";

describe("query-options select functions", () => {
	describe("eventSelectOptionsQueryOptions", () => {
		it("正しいqueryKeyを持つ", () => {
			const options = eventSelectOptionsQueryOptions();
			expect(options.queryKey).toEqual(["events", "selectOptions"]);
		});

		it("selectでイベントをセレクトオプションに変換する", () => {
			const options = eventSelectOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Event> = {
				data: [
					{
						id: "event-001",
						name: "イベントA",
						eventSeriesId: null,
						edition: null,
						totalDays: null,
						seriesName: null,
						startDate: null,
						endDate: null,
						venue: null,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						id: "event-002",
						name: "イベントB",
						eventSeriesId: "series-001",
						edition: null,
						totalDays: null,
						seriesName: "シリーズX",
						startDate: null,
						endDate: null,
						venue: null,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 2,
				page: 1,
				limit: 500,
			};

			const result = options.select?.(mockResponse) as SelectOption[];

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ value: "event-001", label: "イベントA" });
			expect(result[1]).toEqual({
				value: "event-002",
				label: "【シリーズX】イベントB",
			});
		});

		it("seriesNameがある場合はラベルに含める", () => {
			const options = eventSelectOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Event> = {
				data: [
					{
						id: "event-001",
						name: "イベント名",
						eventSeriesId: "series-001",
						edition: null,
						totalDays: null,
						seriesName: "シリーズ名",
						startDate: null,
						endDate: null,
						venue: null,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 1,
				page: 1,
				limit: 500,
			};

			const result = options.select?.(mockResponse) as SelectOption[];

			expect(result[0].label).toBe("【シリーズ名】イベント名");
		});
	});

	describe("eventDaysQueryOptions", () => {
		it("eventIdがnullの場合はenabledがfalseになる", () => {
			const options = eventDaysQueryOptions(null);
			expect(options.enabled).toBe(false);
		});

		it("eventIdがある場合はenabledがtrueになる", () => {
			const options = eventDaysQueryOptions("event-001");
			expect(options.enabled).toBe(true);
		});

		it("正しいqueryKeyを持つ", () => {
			const options = eventDaysQueryOptions("event-001");
			expect(options.queryKey).toEqual(["events", "event-001", "days"]);
		});
	});

	describe("eventDaySelectOptionsQueryOptions", () => {
		it("eventIdがnullの場合はenabledがfalseになる", () => {
			const options = eventDaySelectOptionsQueryOptions(null);
			expect(options.enabled).toBe(false);
		});

		it("eventIdがある場合はenabledがtrueになる", () => {
			const options = eventDaySelectOptionsQueryOptions("event-001");
			expect(options.enabled).toBe(true);
		});

		it("正しいqueryKeyを持つ（eventDaysQueryOptionsと同じ）", () => {
			const options = eventDaySelectOptionsQueryOptions("event-001");
			expect(options.queryKey).toEqual(["events", "event-001", "days"]);
		});

		it("selectでイベント日をセレクトオプションに変換する（1日のみ）", () => {
			const options = eventDaySelectOptionsQueryOptions("event-001");
			const mockDays: EventDay[] = [
				{
					id: "day-001",
					eventId: "event-001",
					dayNumber: 1,
					date: "2024-05-01",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
				},
			];

			const result = options.select?.(mockDays) as SelectOption[];

			expect(result).toHaveLength(1);
			// 1日のみの場合は日付のみ
			expect(result[0]).toEqual({ value: "day-001", label: "2024-05-01" });
		});

		it("selectでイベント日をセレクトオプションに変換する（複数日）", () => {
			const options = eventDaySelectOptionsQueryOptions("event-001");
			const mockDays: EventDay[] = [
				{
					id: "day-001",
					eventId: "event-001",
					dayNumber: 1,
					date: "2024-05-01",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
				},
				{
					id: "day-002",
					eventId: "event-001",
					dayNumber: 2,
					date: "2024-05-02",
					createdAt: "2024-01-01",
					updatedAt: "2024-01-01",
				},
			];

			const result = options.select?.(mockDays) as SelectOption[];

			expect(result).toHaveLength(2);
			// 複数日の場合は日数と日付
			expect(result[0]).toEqual({
				value: "day-001",
				label: "1日目（2024-05-01）",
			});
			expect(result[1]).toEqual({
				value: "day-002",
				label: "2日目（2024-05-02）",
			});
		});
	});

	describe("platformGroupedOptionsQueryOptions", () => {
		it("正しいqueryKeyを持つ", () => {
			const options = platformGroupedOptionsQueryOptions();
			expect(options.queryKey).toEqual(["platforms", "grouped"]);
		});

		it("selectでプラットフォームをカテゴリ別にグルーピングする", () => {
			const options = platformGroupedOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Platform> = {
				data: [
					{
						code: "spotify",
						name: "Spotify",
						category: "streaming",
						urlPattern: null,
						sortOrder: 1,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "youtube",
						name: "YouTube",
						category: "video",
						urlPattern: null,
						sortOrder: 2,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "bandcamp",
						name: "Bandcamp",
						category: "download",
						urlPattern: null,
						sortOrder: 3,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 3,
				page: 1,
				limit: 100,
			};

			const result = options.select?.(mockResponse) as GroupedSelectOptions[];

			// カテゴリ順: streaming, download, video, shop, other
			expect(result).toHaveLength(3);
			expect(result[0].label).toBe("ストリーミング");
			expect(result[0].options).toContainEqual({
				value: "spotify",
				label: "Spotify",
			});
			expect(result[1].label).toBe("ダウンロード");
			expect(result[1].options).toContainEqual({
				value: "bandcamp",
				label: "Bandcamp",
			});
			expect(result[2].label).toBe("動画");
			expect(result[2].options).toContainEqual({
				value: "youtube",
				label: "YouTube",
			});
		});

		it("カテゴリがnullの場合はotherとして扱う", () => {
			const options = platformGroupedOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Platform> = {
				data: [
					{
						code: "unknown",
						name: "Unknown Platform",
						category: null,
						urlPattern: null,
						sortOrder: 1,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 1,
				page: 1,
				limit: 100,
			};

			const result = options.select?.(mockResponse) as GroupedSelectOptions[];

			expect(result).toHaveLength(1);
			expect(result[0].label).toBe("その他");
		});

		it("定義されていないカテゴリは「その他」ラベルになる", () => {
			const options = platformGroupedOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Platform> = {
				data: [
					{
						code: "custom",
						name: "Custom Platform",
						category: "unknown_category",
						urlPattern: null,
						sortOrder: 1,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 1,
				page: 1,
				limit: 100,
			};

			const result = options.select?.(mockResponse) as GroupedSelectOptions[];

			expect(result).toHaveLength(1);
			expect(result[0].label).toBe("その他");
		});

		it("カテゴリの順序が正しい", () => {
			const options = platformGroupedOptionsQueryOptions();
			const mockResponse: PaginatedResponse<Platform> = {
				data: [
					{
						code: "shop1",
						name: "Shop",
						category: "shop",
						urlPattern: null,
						sortOrder: 1,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "stream1",
						name: "Stream",
						category: "streaming",
						urlPattern: null,
						sortOrder: 2,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "video1",
						name: "Video",
						category: "video",
						urlPattern: null,
						sortOrder: 3,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "dl1",
						name: "Download",
						category: "download",
						urlPattern: null,
						sortOrder: 4,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
					{
						code: "other1",
						name: "Other",
						category: "other",
						urlPattern: null,
						sortOrder: 5,
						createdAt: "2024-01-01",
						updatedAt: "2024-01-01",
					},
				],
				total: 5,
				page: 1,
				limit: 100,
			};

			const result = options.select?.(mockResponse) as GroupedSelectOptions[];

			// 期待される順序: streaming, download, video, shop, other
			expect(result.map((g) => g.label)).toEqual([
				"ストリーミング",
				"ダウンロード",
				"動画",
				"ショップ",
				"その他",
			]);
		});
	});
});
