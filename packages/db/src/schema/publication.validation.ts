import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import {
	releasePublications,
	trackPublications,
	VISIBILITY_TYPES,
} from "./publication";

// Re-export for use in tests and other modules
export { VISIBILITY_TYPES };

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// Country code validation (ISO 3166-1 alpha-2)
const countryCodeSchema = z
	.string()
	.regex(/^[A-Z]{2}$/, "ISO 3166-1 alpha-2形式で入力してください")
	.optional()
	.nullable();

// URL validation
const urlSchema = z.string().url("有効なURLを入力してください");
const optionalUrlSchema = z
	.string()
	.url("有効なURLを入力してください")
	.optional();

// Visibility type validation
const visibilitySchema = z.enum(VISIBILITY_TYPES).optional().nullable();

// ReleasePublication
export const insertReleasePublicationSchema = createInsertSchema(
	releasePublications,
	{
		id: nonEmptyString,
		releaseId: nonEmptyString,
		platformCode: nonEmptyString,
		url: urlSchema,
		platformItemId: optionalString,
		countryCode: countryCodeSchema,
		visibility: visibilitySchema,
		publishedAt: z.date().optional().nullable(),
		removedAt: z.date().optional().nullable(),
		isOfficial: z.boolean().default(true),
	},
).omit({ createdAt: true, updatedAt: true });

export const updateReleasePublicationSchema = z.object({
	url: optionalUrlSchema,
	platformItemId: optionalString,
	countryCode: countryCodeSchema,
	visibility: visibilitySchema,
	publishedAt: z.date().optional().nullable(),
	removedAt: z.date().optional().nullable(),
	isOfficial: z.boolean().optional(),
});

export const selectReleasePublicationSchema =
	createSelectSchema(releasePublications);

// TrackPublication
export const insertTrackPublicationSchema = createInsertSchema(
	trackPublications,
	{
		id: nonEmptyString,
		trackId: nonEmptyString,
		platformCode: nonEmptyString,
		url: urlSchema,
		platformItemId: optionalString,
		countryCode: countryCodeSchema,
		visibility: visibilitySchema,
		publishedAt: z.date().optional().nullable(),
		removedAt: z.date().optional().nullable(),
		isOfficial: z.boolean().default(true),
	},
).omit({ createdAt: true, updatedAt: true });

export const updateTrackPublicationSchema = z.object({
	url: optionalUrlSchema,
	platformItemId: optionalString,
	countryCode: countryCodeSchema,
	visibility: visibilitySchema,
	publishedAt: z.date().optional().nullable(),
	removedAt: z.date().optional().nullable(),
	isOfficial: z.boolean().optional(),
});

export const selectTrackPublicationSchema =
	createSelectSchema(trackPublications);

// Type exports
export type InsertReleasePublication = z.infer<
	typeof insertReleasePublicationSchema
>;
export type UpdateReleasePublication = z.infer<
	typeof updateReleasePublicationSchema
>;
export type SelectReleasePublication = z.infer<
	typeof selectReleasePublicationSchema
>;

export type InsertTrackPublication = z.infer<
	typeof insertTrackPublicationSchema
>;
export type UpdateTrackPublication = z.infer<
	typeof updateTrackPublicationSchema
>;
export type SelectTrackPublication = z.infer<
	typeof selectTrackPublicationSchema
>;
