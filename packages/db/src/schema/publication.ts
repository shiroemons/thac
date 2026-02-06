import type { InferSelectModel } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { platforms } from "./master";
import { releases } from "./release";
import { tracks } from "./track";

/**
 * ReleasePublications table - stores publication/distribution links for releases
 */
export const releasePublications = pgTable(
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_release_publications_release").on(table.releaseId),
		index("idx_release_publications_platform").on(table.platformCode),
		uniqueIndex("uq_release_publications_url").on(table.releaseId, table.url),
	],
);

/**
 * TrackPublications table - stores publication/distribution links for individual tracks
 */
export const trackPublications = pgTable(
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
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_track_publications_track").on(table.trackId),
		index("idx_track_publications_platform").on(table.platformCode),
		uniqueIndex("uq_track_publications_url").on(table.trackId, table.url),
	],
);

// Type exports for table rows
export type ReleasePublication = InferSelectModel<typeof releasePublications>;
export type TrackPublication = InferSelectModel<typeof trackPublications>;
