import { type InferSelectModel, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { platforms } from "./master";
import { releases } from "./release";
import { tracks } from "./track";

// Visibility types
export const VISIBILITY_TYPES = ["public", "unlisted", "private"] as const;
export type VisibilityType = (typeof VISIBILITY_TYPES)[number];

/**
 * ReleasePublications table - stores publication/distribution links for releases
 */
export const releasePublications = sqliteTable(
	"release_publications",
	{
		id: text("id").primaryKey(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		platformCode: text("platform_code")
			.notNull()
			.references(() => platforms.code, { onDelete: "restrict" }),
		url: text("url").notNull(),
		platformItemId: text("platform_item_id"),
		countryCode: text("country_code"),
		visibility: text("visibility"),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		removedAt: integer("removed_at", { mode: "timestamp_ms" }),
		isOfficial: integer("is_official", { mode: "boolean" })
			.default(true)
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
		index("idx_release_publications_release").on(table.releaseId),
		index("idx_release_publications_platform").on(table.platformCode),
		uniqueIndex("uq_release_publications_source").on(
			table.releaseId,
			table.platformCode,
			table.platformItemId,
		),
		uniqueIndex("uq_release_publications_url").on(table.releaseId, table.url),
	],
);

/**
 * TrackPublications table - stores publication/distribution links for individual tracks
 */
export const trackPublications = sqliteTable(
	"track_publications",
	{
		id: text("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		platformCode: text("platform_code")
			.notNull()
			.references(() => platforms.code, { onDelete: "restrict" }),
		url: text("url").notNull(),
		platformItemId: text("platform_item_id"),
		countryCode: text("country_code"),
		visibility: text("visibility"),
		publishedAt: integer("published_at", { mode: "timestamp_ms" }),
		removedAt: integer("removed_at", { mode: "timestamp_ms" }),
		isOfficial: integer("is_official", { mode: "boolean" })
			.default(true)
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
		index("idx_track_publications_track").on(table.trackId),
		index("idx_track_publications_platform").on(table.platformCode),
		uniqueIndex("uq_track_publications_source").on(
			table.trackId,
			table.platformCode,
			table.platformItemId,
		),
		uniqueIndex("uq_track_publications_url").on(table.trackId, table.url),
	],
);

// Type exports for table rows
export type ReleasePublication = InferSelectModel<typeof releasePublications>;
export type TrackPublication = InferSelectModel<typeof trackPublications>;
