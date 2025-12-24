import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	discs,
	PARTICIPATION_TYPES,
	RELEASE_TYPES,
	releaseCircles,
	releases,
} from "./release";

export { PARTICIPATION_TYPES };

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
	releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
	releaseMonth: z.number().int().min(1).max(12).optional().nullable(),
	releaseDay: z.number().int().min(1).max(31).optional().nullable(),
	releaseType: z.enum(RELEASE_TYPES).optional().nullable(),
	eventId: optionalString,
	eventDayId: optionalString,
	notes: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateReleaseSchema = z.object({
	name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
	nameJa: optionalString,
	nameEn: optionalString,
	catalogNumber: optionalString,
	releaseDate: dateSchema,
	releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
	releaseMonth: z.number().int().min(1).max(12).optional().nullable(),
	releaseDay: z.number().int().min(1).max(31).optional().nullable(),
	releaseType: z.enum(RELEASE_TYPES).optional().nullable(),
	eventId: optionalString,
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
	participationType: z.enum(PARTICIPATION_TYPES).default("host"),
	position: z.number().int().min(1, "1以上の整数を入力してください").optional(),
});

export const updateReleaseCircleSchema = z.object({
	participationType: z.enum(PARTICIPATION_TYPES).optional(),
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
export type UpdateReleaseCircle = z.infer<typeof updateReleaseCircleSchema>;
export type SelectReleaseCircle = z.infer<typeof selectReleaseCircleSchema>;
