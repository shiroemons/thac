import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { aliasTypes, platforms } from "./master";

// 頭文字の文字種（共通enum値として使用）
export const INITIAL_SCRIPTS = [
	"latin",
	"hiragana",
	"katakana",
	"kanji",
	"digit",
	"symbol",
	"other",
] as const;

export type InitialScript = (typeof INITIAL_SCRIPTS)[number];

// アーティストテーブル
export const artists = sqliteTable(
	"artists",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		nameJa: text("name_ja"),
		nameEn: text("name_en"),
		sortName: text("sort_name"),
		nameInitial: text("name_initial"),
		initialScript: text("initial_script").notNull(),
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
		uniqueIndex("uq_artists_name").on(table.name),
		index("idx_artists_sort").on(table.sortName),
		index("idx_artists_initial").on(table.nameInitial, table.initialScript),
	],
);

// アーティスト別名義テーブル
export const artistAliases = sqliteTable(
	"artist_aliases",
	{
		id: text("id").primaryKey(),
		artistId: text("artist_id")
			.notNull()
			.references(() => artists.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		aliasTypeCode: text("alias_type_code").references(() => aliasTypes.code),
		nameInitial: text("name_initial"),
		initialScript: text("initial_script").notNull(),
		periodFrom: text("period_from"),
		periodTo: text("period_to"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_artist_aliases_artist_id").on(table.artistId),
		uniqueIndex("uq_artist_aliases_name").on(table.artistId, table.name),
	],
);

// サークルテーブル
export const circles = sqliteTable(
	"circles",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		nameJa: text("name_ja"),
		nameEn: text("name_en"),
		sortName: text("sort_name"),
		nameInitial: text("name_initial"),
		initialScript: text("initial_script").notNull(),
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
		uniqueIndex("uq_circles_name").on(table.name),
		index("idx_circles_initial").on(table.nameInitial, table.initialScript),
	],
);

// サークル外部リンクテーブル
export const circleLinks = sqliteTable(
	"circle_links",
	{
		id: text("id").primaryKey(),
		circleId: text("circle_id")
			.notNull()
			.references(() => circles.id, { onDelete: "cascade" }),
		platformCode: text("platform_code")
			.notNull()
			.references(() => platforms.code, { onDelete: "restrict" }),
		url: text("url").notNull(),
		platformId: text("platform_id"),
		handle: text("handle"),
		isOfficial: integer("is_official", { mode: "boolean" })
			.default(true)
			.notNull(),
		isPrimary: integer("is_primary", { mode: "boolean" })
			.default(false)
			.notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_circle_links_circle_id").on(table.circleId),
		uniqueIndex("uq_circle_links_circle_url").on(table.circleId, table.url),
	],
);
