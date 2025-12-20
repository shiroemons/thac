import { sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { circles } from "./artist-circle";
import { eventDays } from "./event";

// リリースタイプの定義
export const RELEASE_TYPES = [
	"album",
	"single",
	"ep",
	"digital",
	"video",
] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

// 参加形態の定義
export const PARTICIPATION_TYPES = [
	"host",
	"co-host",
	"participant",
	"guest",
	"split_partner",
] as const;

export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];

// リリーステーブル
export const releases = sqliteTable(
	"releases",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		nameJa: text("name_ja"),
		nameEn: text("name_en"),
		catalogNumber: text("catalog_number"),
		releaseDate: text("release_date"),
		releaseType: text("release_type"),
		eventDayId: text("event_day_id").references(() => eventDays.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_releases_date").on(table.releaseDate),
		index("idx_releases_type").on(table.releaseType),
		index("idx_releases_event_day").on(table.eventDayId),
		index("idx_releases_catalog").on(table.catalogNumber),
	],
);

// ディスクテーブル
export const discs = sqliteTable(
	"discs",
	{
		id: text("id").primaryKey(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		discNumber: integer("disc_number").notNull(),
		discName: text("disc_name"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_discs_release").on(table.releaseId),
		uniqueIndex("uq_discs_release_number").on(
			table.releaseId,
			table.discNumber,
		),
	],
);

// リリースサークル関連テーブル
export const releaseCircles = sqliteTable(
	"release_circles",
	{
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		circleId: text("circle_id")
			.notNull()
			.references(() => circles.id, { onDelete: "restrict" }),
		participationType: text("participation_type").notNull(),
		position: integer("position").default(1),
	},
	(table) => [
		primaryKey({
			columns: [table.releaseId, table.circleId, table.participationType],
		}),
		index("idx_release_circles_circle").on(table.circleId),
	],
);
