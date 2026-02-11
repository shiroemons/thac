import { type InferSelectModel, sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { releases } from "./release";
import { tracks } from "./track";

/**
 * ReleaseJanCodes table - stores JAN/EAN barcodes for releases
 */
export const releaseJanCodes = pgTable(
	"release_jan_codes",
	{
		id: text("id").primaryKey(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		janCode: text("jan_code").notNull(),
		label: text("label"),
		countryCode: text("country_code"),
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
		index("idx_release_jan_codes_release").on(table.releaseId),
		uniqueIndex("uq_release_jan_codes_jan").on(table.janCode),
		uniqueIndex("uq_release_jan_codes_primary")
			.on(table.releaseId)
			.where(sql`${table.isPrimary} = true`),
	],
);

/**
 * TrackIsrcs table - stores ISRCs (International Standard Recording Codes) for tracks
 */
export const trackIsrcs = pgTable(
	"track_isrcs",
	{
		id: text("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		isrc: text("isrc").notNull(),
		isPrimary: boolean("is_primary").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_track_isrcs_track").on(table.trackId),
		uniqueIndex("uq_track_isrcs").on(table.trackId, table.isrc),
		uniqueIndex("uq_track_isrcs_primary")
			.on(table.trackId)
			.where(sql`${table.isPrimary} = true`),
	],
);

// Type exports for table rows
export type ReleaseJanCode = InferSelectModel<typeof releaseJanCodes>;
export type TrackIsrc = InferSelectModel<typeof trackIsrcs>;
