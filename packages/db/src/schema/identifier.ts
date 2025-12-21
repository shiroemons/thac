import { type InferSelectModel, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { releases } from "./release";
import { tracks } from "./track";

/**
 * ReleaseJanCodes table - stores JAN/EAN barcodes for releases
 */
export const releaseJanCodes = sqliteTable(
	"release_jan_codes",
	{
		id: text("id").primaryKey(),
		releaseId: text("release_id")
			.notNull()
			.references(() => releases.id, { onDelete: "cascade" }),
		janCode: text("jan_code").notNull(),
		label: text("label"),
		countryCode: text("country_code"),
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
		index("idx_release_jan_codes_release").on(table.releaseId),
		uniqueIndex("uq_release_jan_codes_jan").on(table.janCode),
		uniqueIndex("uq_release_jan_codes_primary")
			.on(table.releaseId)
			.where(sql`${table.isPrimary} = 1`),
	],
);

/**
 * TrackIsrcs table - stores ISRCs (International Standard Recording Codes) for tracks
 */
export const trackIsrcs = sqliteTable(
	"track_isrcs",
	{
		id: text("id").primaryKey(),
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		isrc: text("isrc").notNull(),
		assignedAt: text("assigned_at"),
		isPrimary: integer("is_primary", { mode: "boolean" })
			.default(true)
			.notNull(),
		source: text("source"),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_track_isrcs_track").on(table.trackId),
		uniqueIndex("uq_track_isrcs").on(table.trackId, table.isrc),
		uniqueIndex("uq_track_isrcs_primary")
			.on(table.trackId)
			.where(sql`${table.isPrimary} = 1`),
	],
);

// Type exports for table rows
export type ReleaseJanCode = InferSelectModel<typeof releaseJanCodes>;
export type TrackIsrc = InferSelectModel<typeof trackIsrcs>;
