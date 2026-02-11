import { type InferSelectModel, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { tracks } from "./track";

/**
 * Genres table - master table for music genres
 * code is the primary key (e.g., rock, jazz, electronic)
 */
export const genres = pgTable(
	"genres",
	{
		code: text("code").primaryKey(),
		nameJa: text("name_ja").notNull(),
		nameEn: text("name_en").notNull(),
		color: text("color").notNull(),
		icon: text("icon").notNull(),
		description: text("description"),
		sortOrder: integer("sort_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("idx_genres_sort_order").on(table.sortOrder)],
);

/**
 * Track Genres table - junction table for track-genre many-to-many relationship
 * Maximum 5 genres per track
 */
export const trackGenres = pgTable(
	"track_genres",
	{
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		genreCode: text("genre_code")
			.notNull()
			.references(() => genres.code, { onDelete: "restrict" }),
		position: integer("position").default(1).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.trackId, table.genreCode],
		}),
		index("idx_track_genres_track").on(table.trackId),
		index("idx_track_genres_genre").on(table.genreCode),
		index("idx_track_genres_track_position").on(table.trackId, table.position),
		check(
			"check_track_genres_position",
			sql`"position" >= 1 AND "position" <= 5`,
		),
	],
);

// Type exports for table rows
export type Genre = InferSelectModel<typeof genres>;
export type TrackGenre = InferSelectModel<typeof trackGenres>;
