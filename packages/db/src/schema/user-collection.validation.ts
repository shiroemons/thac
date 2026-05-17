import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	COLLECTION_ITEM_TARGET_TYPES,
	COLLECTION_ITEM_TYPES,
	COLLECTION_KINDS,
	COLLECTION_VISIBILITIES,
	userCollectionItems,
	userCollections,
} from "./user-collection";

const collectionNameSchema = z
	.string()
	.trim()
	.min(1, "コレクション名は必須です")
	.max(100, "コレクション名は100文字以内で入力してください");

const collectionDescriptionSchema = z
	.string()
	.trim()
	.max(500, "説明は500文字以内で入力してください");

const itemNoteSchema = z
	.string()
	.trim()
	.max(280, "メモは280文字以内で入力してください");

export const createUserCollectionSchema = z.object({
	name: collectionNameSchema,
	description: collectionDescriptionSchema.optional().nullable(),
	kind: z.enum(COLLECTION_KINDS).optional().default("collection"),
	visibility: z.enum(COLLECTION_VISIBILITIES).optional().default("private"),
	ordered: z.boolean().optional().default(false),
	itemType: z.enum(COLLECTION_ITEM_TYPES).optional().nullable(),
});

export const updateUserCollectionSchema = z.object({
	name: collectionNameSchema.optional(),
	description: collectionDescriptionSchema.optional().nullable(),
	visibility: z.enum(COLLECTION_VISIBILITIES).optional(),
	ordered: z.boolean().optional(),
	itemType: z.enum(COLLECTION_ITEM_TYPES).optional().nullable(),
});

export const addUserCollectionItemSchema = z.object({
	targetType: z.enum(COLLECTION_ITEM_TARGET_TYPES),
	targetId: z.string().trim().min(1, "対象IDは必須です"),
	note: itemNoteSchema.optional().nullable(),
});

export const reorderUserCollectionItemsSchema = z.object({
	items: z
		.array(
			z.object({
				itemId: z.string().min(1),
				position: z.number().int().min(0),
			}),
		)
		.min(1, "並び替え対象が空です"),
});

export const likeTargetSchema = z.object({
	targetType: z.enum(COLLECTION_ITEM_TARGET_TYPES),
	targetId: z.string().trim().min(1),
});

export const selectUserCollectionSchema = createSelectSchema(userCollections);
export const selectUserCollectionItemSchema =
	createSelectSchema(userCollectionItems);

export type CreateUserCollectionInput = z.infer<
	typeof createUserCollectionSchema
>;
export type UpdateUserCollectionInput = z.infer<
	typeof updateUserCollectionSchema
>;
export type AddUserCollectionItemInput = z.infer<
	typeof addUserCollectionItemSchema
>;
export type ReorderUserCollectionItemsInput = z.infer<
	typeof reorderUserCollectionItemsSchema
>;
export type LikeTargetInput = z.infer<typeof likeTargetSchema>;
