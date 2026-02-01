import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { genres, trackGenres } from "./genre";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");

// Helper: 英小文字とアンダースコアのみ（1-50文字）
const genreCodeSchema = z
	.string()
	.trim()
	.min(1, "必須項目です")
	.max(50, "50文字以内で入力してください")
	.regex(
		/^[a-z][a-z0-9_]*$/,
		"英小文字で始まり、英小文字・数字・アンダースコアのみ使用可能です",
	);

// Helper: Hexカラーコード形式（#RRGGBB）
const hexColorSchema = z
	.string()
	.trim()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Hexカラーコード形式（#RRGGBB）で入力してください");

// Helper: 英小文字とハイフンのみ（Lucideアイコン名）
const iconNameSchema = z
	.string()
	.trim()
	.min(1, "必須項目です")
	.regex(/^[a-z][a-z0-9-]*$/, "英小文字で始まり、英小文字・数字・ハイフンのみ使用可能です");

// Helper: 名前フィールド（1-100文字）
const nameSchema = nonEmptyString.max(100, "100文字以内で入力してください");

// Helper: 説明フィールド（最大500文字）
const descriptionSchema = z
	.string()
	.trim()
	.max(500, "500文字以内で入力してください")
	.optional()
	.nullable();

// Genres
export const insertGenreSchema = createInsertSchema(genres, {
	code: genreCodeSchema,
	nameJa: nameSchema,
	nameEn: nameSchema,
	color: hexColorSchema,
	icon: iconNameSchema,
	description: descriptionSchema,
	sortOrder: z.number().int().optional(),
}).omit({ createdAt: true, updatedAt: true });

export const updateGenreSchema = createInsertSchema(genres, {
	code: genreCodeSchema.optional(),
	nameJa: nameSchema.optional(),
	nameEn: nameSchema.optional(),
	color: hexColorSchema.optional(),
	icon: iconNameSchema.optional(),
	description: descriptionSchema,
	sortOrder: z.number().int().optional(),
})
	.omit({ createdAt: true, updatedAt: true, code: true })
	.partial();

export const selectGenreSchema = createSelectSchema(genres);

// TrackGenres
export const insertTrackGenreSchema = createInsertSchema(trackGenres, {
	trackId: nonEmptyString,
	genreCode: nonEmptyString,
	position: z.number().int().min(1).max(5).optional(),
}).omit({ createdAt: true });

export const selectTrackGenreSchema = createSelectSchema(trackGenres);

// ジャンルコード配列（最大5件）
export const genreCodesSchema = z
	.array(z.string().trim().min(1))
	.max(5, "ジャンルは最大5件まで設定できます");

// Type exports
export type InsertGenre = z.infer<typeof insertGenreSchema>;
export type UpdateGenre = z.infer<typeof updateGenreSchema>;
export type SelectGenre = z.infer<typeof selectGenreSchema>;

export type InsertTrackGenre = z.infer<typeof insertTrackGenreSchema>;
export type SelectTrackGenre = z.infer<typeof selectTrackGenreSchema>;
