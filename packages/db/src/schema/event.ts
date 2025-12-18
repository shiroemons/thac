import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

// イベントシリーズテーブル（例: コミックマーケット）
export const eventSeries = sqliteTable(
	"event_series",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_event_series_name").on(table.name),
		index("idx_event_series_sort_order").on(table.sortOrder),
		uniqueIndex("uq_event_series_name").on(table.name),
	],
);

// イベントテーブル（例: コミックマーケット108）
export const events = sqliteTable(
	"events",
	{
		id: text("id").primaryKey(),
		eventSeriesId: text("event_series_id")
			.notNull()
			.references(() => eventSeries.id, { onDelete: "restrict" }),
		name: text("name").notNull(),
		edition: integer("edition"),
		totalDays: integer("total_days"),
		venue: text("venue"),
		startDate: text("start_date"),
		endDate: text("end_date"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_events_event_series_id").on(table.eventSeriesId),
		index("idx_events_edition").on(table.edition),
		index("idx_events_start_date").on(table.startDate),
		uniqueIndex("uq_events_series_edition").on(
			table.eventSeriesId,
			table.edition,
		),
	],
);

// イベント開催日テーブル（1日目、2日目など）
export const eventDays = sqliteTable(
	"event_days",
	{
		id: text("id").primaryKey(),
		eventId: text("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		dayNumber: integer("day_number").notNull(),
		date: text("date").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_event_days_event_id").on(table.eventId),
		index("idx_event_days_date").on(table.date),
		uniqueIndex("uq_event_days_event_day_number").on(
			table.eventId,
			table.dayNumber,
		),
		uniqueIndex("uq_event_days_event_date").on(table.eventId, table.date),
	],
);
