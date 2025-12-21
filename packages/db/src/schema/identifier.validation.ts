import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { releaseJanCodes, trackIsrcs } from "./identifier";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// JAN code validation (8 or 13 digits)
const janCodeRegex = /^[0-9]{8}$|^[0-9]{13}$/;
const janCodeSchema = z
	.string()
	.regex(janCodeRegex, "8桁または13桁の数字を入力してください");

// ISRC validation (12 characters: CC-XXX-YY-NNNNN without hyphens)
// Format: 2 letters (country) + 3 alphanumeric (registrant) + 2 digits (year) + 5 digits (designation)
const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{2}[0-9]{5}$/;
const isrcSchema = z
	.string()
	.regex(isrcRegex, "ISRC形式（例: JPXX01234567）で入力してください");

// Country code validation (ISO 3166-1 alpha-2)
const countryCodeSchema = z
	.string()
	.regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2形式で入力してください")
	.optional()
	.nullable();

// ReleaseJanCode
export const insertReleaseJanCodeSchema = createInsertSchema(releaseJanCodes, {
	id: nonEmptyString,
	releaseId: nonEmptyString,
	janCode: janCodeSchema,
	label: optionalString,
	countryCode: countryCodeSchema,
	isPrimary: z.boolean().default(false),
}).omit({ createdAt: true, updatedAt: true });

export const updateReleaseJanCodeSchema = z.object({
	label: optionalString,
	countryCode: countryCodeSchema,
	isPrimary: z.boolean().optional(),
});

export const selectReleaseJanCodeSchema = createSelectSchema(releaseJanCodes);

// TrackIsrc
export const insertTrackIsrcSchema = createInsertSchema(trackIsrcs, {
	id: nonEmptyString,
	trackId: nonEmptyString,
	isrc: isrcSchema,
	assignedAt: optionalString,
	isPrimary: z.boolean().default(true),
	source: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateTrackIsrcSchema = z.object({
	assignedAt: optionalString,
	isPrimary: z.boolean().optional(),
	source: optionalString,
});

export const selectTrackIsrcSchema = createSelectSchema(trackIsrcs);

// Type exports
export type InsertReleaseJanCode = z.infer<typeof insertReleaseJanCodeSchema>;
export type UpdateReleaseJanCode = z.infer<typeof updateReleaseJanCodeSchema>;
export type SelectReleaseJanCode = z.infer<typeof selectReleaseJanCodeSchema>;

export type InsertTrackIsrc = z.infer<typeof insertTrackIsrcSchema>;
export type UpdateTrackIsrc = z.infer<typeof updateTrackIsrcSchema>;
export type SelectTrackIsrc = z.infer<typeof selectTrackIsrcSchema>;
