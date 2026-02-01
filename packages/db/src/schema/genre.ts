import { type InferSelectModel, sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { tracks } from "./track";

/**
 * Genres table - master table for music genres
 * code is the primary key (e.g., rock, jazz, electronic)
 */
export const genres = sqliteTable(
	"genres",
	{
		code: text("code").primaryKey(),
		nameJa: text("name_ja").notNull(),
		nameEn: text("name_en").notNull(),
		color: text("color").notNull(),
		icon: text("icon").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("idx_genres_sort_order").on(table.sortOrder)],
);

/**
 * Track Genres table - junction table for track-genre many-to-many relationship
 * Maximum 5 genres per track
 */
export const trackGenres = sqliteTable(
	"track_genres",
	{
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		genreCode: text("genre_code")
			.notNull()
			.references(() => genres.code, { onDelete: "restrict" }),
		position: integer("position").default(1).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.trackId, table.genreCode],
		}),
		index("idx_track_genres_track").on(table.trackId),
		index("idx_track_genres_genre").on(table.genreCode),
	],
);

// Type exports for table rows
export type Genre = InferSelectModel<typeof genres>;
export type TrackGenre = InferSelectModel<typeof trackGenres>;
