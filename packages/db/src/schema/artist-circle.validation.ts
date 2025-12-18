import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	artistAliases,
	artists,
	circleLinks,
	circles,
	INITIAL_SCRIPTS,
} from "./artist-circle";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// 頭文字の文字種スキーマ
const initialScriptSchema = z.enum(INITIAL_SCRIPTS);

// 頭文字バリデーション（1文字）
const nameInitialSchema = z
	.string()
	.length(1, "1文字で入力してください")
	.optional()
	.nullable();

// 日付バリデーション（ISO 8601形式）
const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
	.optional()
	.nullable();

// URLバリデーション
const urlSchema = z.string().url("有効なURLを入力してください");

// 頭文字の条件付き必須バリデーション用関数
const requiresInitial = (initialScript: string) =>
	["latin", "hiragana", "katakana"].includes(initialScript);

// Artists
export const insertArtistSchema = createInsertSchema(artists, {
	id: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	nameJa: optionalString,
	nameEn: optionalString,
	sortName: optionalString,
	nameInitial: nameInitialSchema,
	initialScript: initialScriptSchema,
	notes: optionalString.pipe(
		z
			.string()
			.max(1000, "1000文字以内で入力してください")
			.optional()
			.nullable(),
	),
})
	.omit({ createdAt: true, updatedAt: true })
	.refine(
		(data) => {
			if (requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const updateArtistSchema = z
	.object({
		name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
		nameJa: optionalString,
		nameEn: optionalString,
		sortName: optionalString,
		nameInitial: nameInitialSchema,
		initialScript: initialScriptSchema.optional(),
		notes: optionalString.pipe(
			z
				.string()
				.max(1000, "1000文字以内で入力してください")
				.optional()
				.nullable(),
		),
	})
	.refine(
		(data) => {
			if (data.initialScript && requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const selectArtistSchema = createSelectSchema(artists);

// ArtistAliases
export const insertArtistAliasSchema = createInsertSchema(artistAliases, {
	id: nonEmptyString,
	artistId: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	aliasTypeCode: optionalString,
	nameInitial: nameInitialSchema,
	initialScript: initialScriptSchema,
	periodFrom: isoDateSchema,
	periodTo: isoDateSchema,
})
	.omit({ createdAt: true, updatedAt: true })
	.refine(
		(data) => {
			if (requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const updateArtistAliasSchema = z
	.object({
		artistId: nonEmptyString.optional(),
		name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
		aliasTypeCode: optionalString,
		nameInitial: nameInitialSchema,
		initialScript: initialScriptSchema.optional(),
		periodFrom: isoDateSchema,
		periodTo: isoDateSchema,
	})
	.refine(
		(data) => {
			if (data.initialScript && requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const selectArtistAliasSchema = createSelectSchema(artistAliases);

// Circles
export const insertCircleSchema = createInsertSchema(circles, {
	id: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	nameJa: optionalString,
	nameEn: optionalString,
	nameInitial: nameInitialSchema,
	initialScript: initialScriptSchema,
	notes: optionalString.pipe(
		z
			.string()
			.max(1000, "1000文字以内で入力してください")
			.optional()
			.nullable(),
	),
})
	.omit({ createdAt: true, updatedAt: true })
	.refine(
		(data) => {
			if (requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const updateCircleSchema = z
	.object({
		name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
		nameJa: optionalString,
		nameEn: optionalString,
		nameInitial: nameInitialSchema,
		initialScript: initialScriptSchema.optional(),
		notes: optionalString.pipe(
			z
				.string()
				.max(1000, "1000文字以内で入力してください")
				.optional()
				.nullable(),
		),
	})
	.refine(
		(data) => {
			if (data.initialScript && requiresInitial(data.initialScript)) {
				return data.nameInitial && data.nameInitial.length === 1;
			}
			return true;
		},
		{
			message: "この文字種では頭文字の入力が必須です",
			path: ["nameInitial"],
		},
	);

export const selectCircleSchema = createSelectSchema(circles);

// CircleLinks
export const insertCircleLinkSchema = createInsertSchema(circleLinks, {
	id: nonEmptyString,
	circleId: nonEmptyString,
	platformCode: nonEmptyString,
	url: urlSchema,
	platformId: optionalString,
	handle: optionalString,
	isOfficial: z.boolean().default(true),
	isPrimary: z.boolean().default(false),
}).omit({ createdAt: true, updatedAt: true });

export const updateCircleLinkSchema = z.object({
	platformCode: nonEmptyString.optional(),
	url: urlSchema.optional(),
	platformId: optionalString,
	handle: optionalString,
	isOfficial: z.boolean().optional(),
	isPrimary: z.boolean().optional(),
});

export const selectCircleLinkSchema = createSelectSchema(circleLinks);

// Type exports
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type UpdateArtist = z.infer<typeof updateArtistSchema>;
export type SelectArtist = z.infer<typeof selectArtistSchema>;

export type InsertArtistAlias = z.infer<typeof insertArtistAliasSchema>;
export type UpdateArtistAlias = z.infer<typeof updateArtistAliasSchema>;
export type SelectArtistAlias = z.infer<typeof selectArtistAliasSchema>;

export type InsertCircle = z.infer<typeof insertCircleSchema>;
export type UpdateCircle = z.infer<typeof updateCircleSchema>;
export type SelectCircle = z.infer<typeof selectCircleSchema>;

export type InsertCircleLink = z.infer<typeof insertCircleLinkSchema>;
export type UpdateCircleLink = z.infer<typeof updateCircleLinkSchema>;
export type SelectCircleLink = z.infer<typeof selectCircleLinkSchema>;
