import { type InferSelectModel, relations, sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const COLLECTION_KINDS = ["collection", "playlist"] as const;
export type CollectionKind = (typeof COLLECTION_KINDS)[number];

export const COLLECTION_VISIBILITIES = [
	"private",
	"unlisted",
	"public",
] as const;
export type CollectionVisibility = (typeof COLLECTION_VISIBILITIES)[number];

export const COLLECTION_ITEM_TARGET_TYPES = [
	"circle",
	"release",
	"track",
	"artist",
] as const;
export type CollectionItemTargetType =
	(typeof COLLECTION_ITEM_TARGET_TYPES)[number];

export const COLLECTION_ITEM_TYPES = [
	"track",
	"release",
	"circle",
	"artist",
] as const;
export type CollectionItemType = (typeof COLLECTION_ITEM_TYPES)[number];

export const userCollections = pgTable(
	"user_collections",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: text("kind").notNull().default("collection"),
		name: text("name").notNull(),
		description: text("description"),
		visibility: text("visibility").notNull().default("private"),
		ordered: boolean("ordered").notNull().default(false),
		isDefaultLiked: boolean("is_default_liked").notNull().default(false),
		itemType: text("item_type"),
		shortId: text("short_id"),
		coverImageUrl: text("cover_image_url"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_user_collections_user_kind").on(table.userId, table.kind),
		uniqueIndex("uq_user_collections_default_liked")
			.on(table.userId)
			.where(sql`${table.isDefaultLiked} = true`),
		uniqueIndex("uq_user_collections_short_id")
			.on(table.shortId)
			.where(sql`${table.shortId} IS NOT NULL`),
		check(
			"check_user_collections_kind",
			sql`"kind" IN ('collection','playlist')`,
		),
		check(
			"check_user_collections_visibility",
			sql`"visibility" IN ('private','unlisted','public')`,
		),
		check(
			"check_user_collections_item_type",
			sql`"item_type" IS NULL OR "item_type" IN ('track','release','circle','artist')`,
		),
	],
);

export const userCollectionItems = pgTable(
	"user_collection_items",
	{
		id: text("id").primaryKey(),
		collectionId: text("collection_id")
			.notNull()
			.references(() => userCollections.id, { onDelete: "cascade" }),
		targetType: text("target_type").notNull(),
		targetId: text("target_id").notNull(),
		position: integer("position"),
		note: text("note"),
		addedAt: timestamp("added_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("uq_user_collection_items_unique").on(
			table.collectionId,
			table.targetType,
			table.targetId,
		),
		index("idx_user_collection_items_target").on(
			table.targetType,
			table.targetId,
		),
		index("idx_user_collection_items_position")
			.on(table.collectionId, table.position)
			.where(sql`${table.position} IS NOT NULL`),
		check(
			"check_user_collection_items_target_type",
			sql`"target_type" IN ('circle','release','track','artist')`,
		),
	],
);

export const userCollectionsRelations = relations(
	userCollections,
	({ one, many }) => ({
		user: one(user, {
			fields: [userCollections.userId],
			references: [user.id],
		}),
		items: many(userCollectionItems),
	}),
);

export const userCollectionItemsRelations = relations(
	userCollectionItems,
	({ one }) => ({
		collection: one(userCollections, {
			fields: [userCollectionItems.collectionId],
			references: [userCollections.id],
		}),
	}),
);

export type UserCollection = InferSelectModel<typeof userCollections>;
export type UserCollectionItem = InferSelectModel<typeof userCollectionItems>;
