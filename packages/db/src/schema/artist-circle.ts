import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
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
export const artists = pgTable(
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("uq_artists_name").on(table.name),
		index("idx_artists_sort").on(table.sortName),
		index("idx_artists_initial").on(table.nameInitial, table.initialScript),
		index("idx_artists_name_lower").on(sql`lower(${table.name})`),
	],
);

// アーティスト別名義テーブル
export const artistAliases = pgTable(
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
		periodFrom: date("period_from", { mode: "string" }),
		periodTo: date("period_to", { mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_artist_aliases_artist_id").on(table.artistId),
		index("idx_artist_aliases_alias_type").on(table.aliasTypeCode),
		uniqueIndex("uq_artist_aliases_name").on(table.artistId, table.name),
		index("idx_artist_aliases_name_lower").on(sql`lower(${table.name})`),
	],
);

// サークルテーブル
export const circles = pgTable(
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("uq_circles_name").on(table.name),
		index("idx_circles_initial").on(table.nameInitial, table.initialScript),
		index("idx_circles_name_lower").on(sql`lower(${table.name})`),
	],
);

// サークル外部リンクテーブル
export const circleLinks = pgTable(
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
		isOfficial: boolean("is_official").default(true).notNull(),
		isPrimary: boolean("is_primary").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_circle_links_circle_id").on(table.circleId),
		index("idx_circle_links_platform").on(table.platformCode),
		uniqueIndex("uq_circle_links_circle_url").on(table.circleId, table.url),
	],
);
