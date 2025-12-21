import { sql } from "drizzle-orm";
import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { officialWorkCategories } from "./master";

// 公式作品テーブル
export const officialWorks = sqliteTable(
	"official_works",
	{
		id: text("id").primaryKey(),
		categoryCode: text("category_code")
			.notNull()
			.references(() => officialWorkCategories.code),
		name: text("name").notNull(),
		nameJa: text("name_ja").notNull(),
		nameEn: text("name_en"),
		shortNameJa: text("short_name_ja"),
		shortNameEn: text("short_name_en"),
		seriesCode: text("series_code"),
		numberInSeries: real("number_in_series"),
		releaseDate: text("release_date"),
		officialOrganization: text("official_organization"),
		position: integer("position"),
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
		index("idx_official_works_category").on(table.categoryCode),
		index("idx_official_works_release_date").on(table.releaseDate),
		index("idx_official_works_position").on(table.position),
		uniqueIndex("uq_official_works_series_code").on(table.seriesCode),
	],
);

// 公式楽曲テーブル
export const officialSongs = sqliteTable(
	"official_songs",
	{
		id: text("id").primaryKey(),
		officialWorkId: text("official_work_id").references(
			() => officialWorks.id,
			{ onDelete: "cascade" },
		),
		trackNumber: integer("track_number"),
		name: text("name").notNull(),
		nameJa: text("name_ja").notNull(),
		nameEn: text("name_en"),
		composerName: text("composer_name"),
		arrangerName: text("arranger_name"),
		isOriginal: integer("is_original", { mode: "boolean" })
			.default(true)
			.notNull(),
		sourceSongId: text("source_song_id"),
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
		index("idx_official_songs_work").on(table.officialWorkId),
		index("idx_official_songs_source").on(table.sourceSongId),
	],
);
