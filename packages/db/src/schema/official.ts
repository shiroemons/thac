import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { officialWorkCategories, platforms } from "./master";

// 公式作品テーブル
export const officialWorks = pgTable(
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
		numberInSeries: real("number_in_series"),
		releaseDate: date("release_date", { mode: "string" }),
		officialOrganization: text("official_organization"),
		position: integer("position"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_official_works_category").on(table.categoryCode),
		index("idx_official_works_release_date").on(table.releaseDate),
		index("idx_official_works_position").on(table.position),
	],
);

// 公式楽曲テーブル
export const officialSongs = pgTable(
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
		isOriginal: boolean("is_original").default(true).notNull(),
		sourceSongId: text("source_song_id"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_official_songs_work").on(table.officialWorkId),
		index("idx_official_songs_source").on(table.sourceSongId),
	],
);

// 公式作品リンクテーブル
export const officialWorkLinks = pgTable(
	"official_work_links",
	{
		id: text("id").primaryKey(),
		officialWorkId: text("official_work_id")
			.notNull()
			.references(() => officialWorks.id, { onDelete: "cascade" }),
		platformCode: text("platform_code")
			.notNull()
			.references(() => platforms.code, { onDelete: "restrict" }),
		url: text("url").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_official_work_links_work_id").on(table.officialWorkId),
		uniqueIndex("uq_official_work_links_work_url").on(
			table.officialWorkId,
			table.url,
		),
	],
);

// 公式楽曲リンクテーブル
export const officialSongLinks = pgTable(
	"official_song_links",
	{
		id: text("id").primaryKey(),
		officialSongId: text("official_song_id")
			.notNull()
			.references(() => officialSongs.id, { onDelete: "cascade" }),
		platformCode: text("platform_code")
			.notNull()
			.references(() => platforms.code, { onDelete: "restrict" }),
		url: text("url").notNull(),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_official_song_links_song_id").on(table.officialSongId),
		uniqueIndex("uq_official_song_links_song_url").on(
			table.officialSongId,
			table.url,
		),
	],
);
