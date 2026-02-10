import { type InferSelectModel, relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { tracks } from "./track";

/**
 * Tags table - master table for user-defined tags
 * id is TypeID format with "tag_" prefix
 */
export const tags = pgTable("tags", {
	id: text("id").primaryKey(),
	name: text("name").notNull().unique(),
	attributes: jsonb("attributes").$type<Record<string, unknown>>(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

/**
 * Track Tags table - junction table for track-tag many-to-many relationship
 * Maximum 15 tags per track
 */
export const trackTags = pgTable(
	"track_tags",
	{
		trackId: text("track_id")
			.notNull()
			.references(() => tracks.id, { onDelete: "cascade" }),
		tagId: text("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "restrict" }),
		position: integer("position").notNull(), // 1-15
		isLocked: boolean("is_locked").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.trackId, table.tagId],
		}),
		index("idx_track_tags_track").on(table.trackId),
		index("idx_track_tags_tag").on(table.tagId),
		index("idx_track_tags_track_locked_pos").on(
			table.trackId,
			table.isLocked,
			table.position,
		),
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
