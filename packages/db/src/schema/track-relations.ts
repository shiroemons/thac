import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { officialSongs } from "./official";
import { tracks } from "./track";

/**
 * TrackOfficialSongs table - maps tracks to their original official songs
 * Supports multiple original songs per track with part position ordering
 */
export const trackOfficialSongs = pgTable(
	"track_official_songs",
	{
		id: text("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		officialSongId: text("official_song_id").references(
			() => officialSongs.id,
			{ onDelete: "restrict" },
		),
		customSongName: text("custom_song_name"),
		partPosition: integer("part_position"),
		startSecond: numeric("start_second"),
		endSecond: numeric("end_second"),
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
		index("idx_track_official_songs_track").on(table.trackId),
		index("idx_track_official_songs_song").on(table.officialSongId),
		uniqueIndex("uq_track_official_songs").on(
			table.trackId,
			table.officialSongId,
			table.partPosition,
		),
	],
);

/**
 * TrackDerivations table - manages derivation relationships between tracks
 * Self-referencing table where childTrackId is derived from parentTrackId
 */
export const trackDerivations = pgTable(
	"track_derivations",
	{
		id: text("id").primaryKey(),
		childTrackId: text("child_track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		parentTrackId: text("parent_track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "restrict" }),
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
		index("idx_track_derivations_child").on(table.childTrackId),
		index("idx_track_derivations_parent").on(table.parentTrackId),
		uniqueIndex("uq_track_derivations").on(
			table.childTrackId,
			table.parentTrackId,
		),
	],
);

// Type exports for table rows
export type TrackOfficialSong = InferSelectModel<typeof trackOfficialSongs>;
export type TrackDerivation = InferSelectModel<typeof trackDerivations>;
