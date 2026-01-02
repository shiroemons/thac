import {
	and,
	asc,
	db,
	eq,
	eventDays,
	eventSeries,
	events,
	inArray,
	like,
	or,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import {
	type ColumnDefinition,
	createExportResponse,
	formatToJSON,
	formatToTSV,
	generateFilename,
} from "../../../utils/export-formatter";

const eventExportRouter = new Hono<AdminContext>();

// イベントカラム定義
const eventColumns: ColumnDefinition<{
	id: string;
	eventSeriesId: string | null;
	name: string;
	edition: number | null;
	totalDays: number | null;
	venue: string | null;
	startDate: string | null;
	endDate: string | null;
	createdAt: Date;
	updatedAt: Date;
}>[] = [
	{ key: "id", label: "id" },
	{ key: "eventSeriesId", label: "eventSeriesId" },
	{ key: "name", label: "name" },
	{ key: "edition", label: "edition" },
	{ key: "totalDays", label: "totalDays" },
	{ key: "venue", label: "venue" },
	{ key: "startDate", label: "startDate" },
	{ key: "endDate", label: "endDate" },
	{ key: "createdAt", label: "createdAt" },
	{ key: "updatedAt", label: "updatedAt" },
];

// イベントエクスポート
eventExportRouter.get("/", async (c) => {
	try {
		const format = (c.req.query("format") || "json") as "tsv" | "json";
		const includeRelations = c.req.query("includeRelations") === "true";
		const seriesId = c.req.query("seriesId");
		const search = c.req.query("search");

		// フィルタ条件を構築
		const conditions = [];

		if (seriesId) {
			conditions.push(eq(events.eventSeriesId, seriesId));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(like(events.name, searchPattern), like(events.venue, searchPattern)),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得（ページネーションなし）
		const data = await db
			.select()
			.from(events)
			.where(whereCondition)
			.orderBy(asc(events.startDate));

		// 関連データ取得
		const daysMap = new Map<string, (typeof eventDays.$inferSelect)[]>();
		const seriesMap = new Map<string, typeof eventSeries.$inferSelect>();

		if (includeRelations && data.length > 0) {
			const eventIds = data.map((e) => e.id);
			const seriesIds = data
				.map((e) => e.eventSeriesId)
				.filter((id): id is string => id !== null);

			// イベント日程取得
			const days = await db
				.select()
				.from(eventDays)
				.where(inArray(eventDays.eventId, eventIds))
				.orderBy(asc(eventDays.dayNumber));

			for (const day of days) {
				const existing = daysMap.get(day.eventId) || [];
				existing.push(day);
				daysMap.set(day.eventId, existing);
			}

			// イベントシリーズ取得
			if (seriesIds.length > 0) {
				const series = await db
					.select()
					.from(eventSeries)
					.where(inArray(eventSeries.id, seriesIds));

				for (const s of series) {
					seriesMap.set(s.id, s);
				}
			}
		}

		// フォーマット
		if (format === "tsv") {
			// TSV形式: 関連データはJSON文字列として追加
			const exportData = data.map((e) => ({
				...e,
				...(includeRelations && {
					seriesName: e.eventSeriesId
						? seriesMap.get(e.eventSeriesId)?.name || ""
						: "",
					eventDays: JSON.stringify(
						daysMap.get(e.id)?.map((day) => ({
							dayNumber: day.dayNumber,
							date: day.date,
						})) || [],
					),
				}),
			}));

			const columns = includeRelations
				? [
						...eventColumns,
						{ key: "seriesName" as const, label: "seriesName" },
						{ key: "eventDays" as const, label: "eventDays" },
					]
				: eventColumns;

			const tsv = formatToTSV(
				exportData,
				columns as ColumnDefinition<(typeof exportData)[number]>[],
			);
			const filename = generateFilename("イベント", "tsv");
			return createExportResponse(tsv, filename, "tsv");
		}

		// JSON形式
		const exportData = data.map((e) => ({
			...e,
			...(includeRelations && {
				series: e.eventSeriesId ? seriesMap.get(e.eventSeriesId) : null,
				eventDays: daysMap.get(e.id) || [],
			}),
		}));

		const json = formatToJSON(exportData);
		const filename = generateFilename("イベント", "json");
		return createExportResponse(json, filename, "json");
	} catch (error) {
		return handleDbError(c, error, "GET /admin/export/events");
	}
});

export { eventExportRouter };
