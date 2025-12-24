import { type InferSelectModel, sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { artistAliases, artists } from "./artist-circle";
import { eventDays, events } from "./event";
import { aliasTypes, creditRoles } from "./master";
import { discs, releases } from "./release";

/**
 * Tracks table - holds individual track/song information within a release
 * disc_id is nullable to support single-track releases without disc structure
 */
export const tracks = sqliteTable(
	"tracks",
	{
		id: text("id").primaryKey(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		discId: text("disc_id").references(() => discs.id, { onDelete: "cascade" }),
		trackNumber: integer("track_number").notNull(),
		name: text("name").notNull(),
		nameJa: text("name_ja"),
		nameEn: text("name_en"),
		releaseDate: text("release_date"),
		releaseYear: integer("release_year"),
		releaseMonth: integer("release_month"),
		releaseDay: integer("release_day"),
		eventId: text("event_id").references(() => events.id, {
			onDelete: "set null",
		}),
		eventDayId: text("event_day_id").references(() => eventDays.id, {
			onDelete: "set null",
		}),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_tracks_release").on(table.releaseId),
		index("idx_tracks_disc").on(table.discId),
		index("idx_tracks_date").on(table.releaseDate),
		index("idx_tracks_year").on(table.releaseYear),
		index("idx_tracks_event").on(table.eventId),
		index("idx_tracks_event_day").on(table.eventDayId),
		// Composite index for ordering tracks by release, disc, and track number
		index("idx_tracks_ordering").on(
			table.releaseId,
			table.discId,
			table.trackNumber,
		),
		// Conditional unique index: track number unique within release when disc_id IS NULL
		uniqueIndex("uq_tracks_release_tracknumber")
			.on(table.releaseId, table.trackNumber)
			.where(sql`${table.discId} IS NULL`),
		// Conditional unique index: track number unique within disc when disc_id IS NOT NULL
		uniqueIndex("uq_tracks_disc_tracknumber")
			.on(table.discId, table.trackNumber)
			.where(sql`${table.discId} IS NOT NULL`),
	],
);

/**
 * Track Credits table - maps credit display names to artists/aliases
 * creditName is the name shown on the physical/digital release
 */
export const trackCredits = sqliteTable(
	"track_credits",
	{
		id: text("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		artistId: text("artist_id")
			.notNull()
			.references(() => artists.id, { onDelete: "restrict" }),
		creditName: text("credit_name").notNull(),
		aliasTypeCode: text("alias_type_code").references(() => aliasTypes.code),
		creditPosition: integer("credit_position"),
		artistAliasId: text("artist_alias_id").references(() => artistAliases.id, {
			onDelete: "set null",
		}),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_track_credits_track").on(table.trackId),
		index("idx_track_credits_artist").on(table.artistId),
		index("idx_track_credits_alias").on(table.artistAliasId),
		// Prevent duplicate credits: artist without alias on same track
		uniqueIndex("uq_track_credits_no_alias")
			.on(table.trackId, table.artistId)
			.where(sql`${table.artistAliasId} IS NULL`),
		// Prevent duplicate credits: artist with same alias on same track
		uniqueIndex("uq_track_credits_with_alias")
			.on(table.trackId, table.artistId, table.artistAliasId)
			.where(sql`${table.artistAliasId} IS NOT NULL`),
	],
);

/**
 * Track Credit Roles table - many-to-many relationship between credits and roles
 * Composite primary key: (trackCreditId, roleCode, rolePosition)
 */
export const trackCreditRoles = sqliteTable(
	"track_credit_roles",
	{
		trackCreditId: text("track_credit_id")
			.notNull()
			.references(() => trackCredits.id, { onDelete: "cascade" }),
		roleCode: text("role_code")
			.notNull()
			.references(() => creditRoles.code),
		rolePosition: integer("role_position").notNull().default(1),
	},
	(table) => [
		primaryKey({
			columns: [table.trackCreditId, table.roleCode, table.rolePosition],
		}),
		index("idx_track_credit_roles_credit").on(table.trackCreditId),
		// Composite index for role-based credit queries
		index("idx_track_credit_roles_composite").on(
			table.trackCreditId,
			table.roleCode,
		),
	],
);

// Type exports for table rows
export type Track = InferSelectModel<typeof tracks>;
export type TrackCredit = InferSelectModel<typeof trackCredits>;
export type TrackCreditRole = InferSelectModel<typeof trackCreditRoles>;
