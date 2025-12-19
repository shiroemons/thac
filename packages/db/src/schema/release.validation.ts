import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { discs, RELEASE_TYPES, releaseCircles, releases } from "./release";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// 日付バリデーション（YYYY-MM-DD形式）
const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
	.optional()
	.nullable();

// Release
export const insertReleaseSchema = createInsertSchema(releases, {
	id: nonEmptyString,
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	nameJa: optionalString,
	nameEn: optionalString,
	catalogNumber: optionalString,
	releaseDate: dateSchema,
	releaseType: z.enum(RELEASE_TYPES).optional().nullable(),
	eventDayId: optionalString,
	notes: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateReleaseSchema = z.object({
	name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
	nameJa: optionalString,
	nameEn: optionalString,
	catalogNumber: optionalString,
	releaseDate: dateSchema,
	releaseType: z.enum(RELEASE_TYPES).optional().nullable(),
	eventDayId: optionalString,
	notes: optionalString,
});

export const selectReleaseSchema = createSelectSchema(releases);

// Disc
export const insertDiscSchema = createInsertSchema(discs, {
	id: nonEmptyString,
	releaseId: nonEmptyString,
	discNumber: z.number().int().positive("正の整数を入力してください"),
	discName: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateDiscSchema = z.object({
	discNumber: z
		.number()
		.int()
		.positive("正の整数を入力してください")
		.optional(),
	discName: optionalString,
});

export const selectDiscSchema = createSelectSchema(discs);

// ReleaseCircle
export const insertReleaseCircleSchema = createInsertSchema(releaseCircles, {
	releaseId: nonEmptyString,
	circleId: nonEmptyString,
	role: nonEmptyString,
	position: z.number().int().min(1, "1以上の整数を入力してください").optional(),
});

export const selectReleaseCircleSchema = createSelectSchema(releaseCircles);

// Type exports
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type UpdateRelease = z.infer<typeof updateReleaseSchema>;
export type SelectRelease = z.infer<typeof selectReleaseSchema>;

export type InsertDisc = z.infer<typeof insertDiscSchema>;
export type UpdateDisc = z.infer<typeof updateDiscSchema>;
export type SelectDisc = z.infer<typeof selectDiscSchema>;

export type InsertReleaseCircle = z.infer<typeof insertReleaseCircleSchema>;
export type SelectReleaseCircle = z.infer<typeof selectReleaseCircleSchema>;
