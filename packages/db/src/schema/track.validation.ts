import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { trackCreditRoles, trackCredits, tracks } from "./track";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
// 空文字列をnullに変換するoptionalスキーマ
const optionalString = z
	.string()
	.trim()
	.transform((val) => (val === "" ? null : val))
	.nullable()
	.optional();

// 日付バリデーション（YYYY-MM-DD形式）
const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください")
	.optional()
	.nullable();

// Track
// Note: releaseDate, releaseYear/Month/Day, eventId, eventDayId are auto-set from parent release
export const insertTrackSchema = createInsertSchema(tracks, {
	id: nonEmptyString,
	releaseId: optionalString,
	discId: optionalString,
	trackNumber: z.number().int().positive("1以上の整数を入力してください"),
	name: nonEmptyString.max(200, "200文字以内で入力してください"),
	nameJa: optionalString,
	nameEn: optionalString,
	releaseDate: dateSchema,
	releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
	releaseMonth: z.number().int().min(1).max(12).optional().nullable(),
	releaseDay: z.number().int().min(1).max(31).optional().nullable(),
	eventId: optionalString,
	eventDayId: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateTrackSchema = z.object({
	discId: optionalString,
	trackNumber: z
		.number()
		.int()
		.positive("1以上の整数を入力してください")
		.optional(),
	name: nonEmptyString.max(200, "200文字以内で入力してください").optional(),
	nameJa: optionalString,
	nameEn: optionalString,
	// リリース日関連
	releaseDate: dateSchema,
	releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
	releaseMonth: z.number().int().min(1).max(12).optional().nullable(),
	releaseDay: z.number().int().min(1).max(31).optional().nullable(),
	// イベント関連
	eventId: optionalString,
	eventDayId: optionalString,
});

export const selectTrackSchema = createSelectSchema(tracks);

// TrackCredit
export const insertTrackCreditSchema = createInsertSchema(trackCredits, {
	id: nonEmptyString,
	trackId: nonEmptyString,
	artistId: nonEmptyString,
	creditName: nonEmptyString.max(200, "200文字以内で入力してください"),
	aliasTypeCode: optionalString,
	creditPosition: z
		.number()
		.int()
		.min(1, "1以上の整数を入力してください")
		.optional()
		.nullable(),
	artistAliasId: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateTrackCreditSchema = z.object({
	artistId: nonEmptyString.optional(),
	creditName: nonEmptyString
		.max(200, "200文字以内で入力してください")
		.optional(),
	aliasTypeCode: optionalString,
	creditPosition: z
		.number()
		.int()
		.min(1, "1以上の整数を入力してください")
		.optional()
		.nullable(),
	artistAliasId: optionalString,
});

export const selectTrackCreditSchema = createSelectSchema(trackCredits);

// TrackCreditRole
export const insertTrackCreditRoleSchema = z.object({
	trackCreditId: nonEmptyString,
	roleCode: nonEmptyString,
	rolePosition: z
		.number()
		.int()
		.min(1, "1以上の整数を入力してください")
		.default(1),
});

export const selectTrackCreditRoleSchema = createSelectSchema(trackCreditRoles);

// Type exports
export type InsertTrack = z.infer<typeof insertTrackSchema>;
export type UpdateTrack = z.infer<typeof updateTrackSchema>;
export type SelectTrack = z.infer<typeof selectTrackSchema>;

export type InsertTrackCredit = z.infer<typeof insertTrackCreditSchema>;
export type UpdateTrackCredit = z.infer<typeof updateTrackCreditSchema>;
export type SelectTrackCredit = z.infer<typeof selectTrackCreditSchema>;

export type InsertTrackCreditRole = z.infer<typeof insertTrackCreditRoleSchema>;
export type SelectTrackCreditRole = z.infer<typeof selectTrackCreditRoleSchema>;
