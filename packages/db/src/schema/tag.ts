import { type InferSelectModel, relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { tracks } from "./track";

/**
 * Tags table - master table for user-defined tags
 * id is TypeID format with "tag_" prefix
 */
export const tags = sqliteTable("tags", {
	id: text("id").primaryKey(),
	name: text("name").notNull().unique(),
	attributes: text("attributes"), // JSON format (nullable)
	createdAt: integer("created_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
});

/**
 * Track Tags table - junction table for track-tag many-to-many relationship
 * Maximum 15 tags per track
 */
export const trackTags = sqliteTable(
	"track_tags",
	{
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "restrict" }),
		position: integer("position").notNull(), // 1-15
		isLocked: integer("is_locked", { mode: "boolean" })
			.notNull()
			.default(false),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.trackId, table.tagId],
		}),
		index("idx_track_tags_track").on(table.trackId),
		index("idx_track_tags_tag").on(table.tagId),
	],
);

// Relations
export const tagsRelations = relations(tags, ({ many }) => ({
	trackTags: many(trackTags),
}));

export const trackTagsRelations = relations(trackTags, ({ one }) => ({
	track: one(tracks, {
		fields: [trackTags.trackId],
		references: [tracks.id],
	}),
	tag: one(tags, {
		fields: [trackTags.tagId],
		references: [tags.id],
	}),
}));

// Type exports for table rows
export type Tag = InferSelectModel<typeof tags>;
export type TrackTag = InferSelectModel<typeof trackTags>;
