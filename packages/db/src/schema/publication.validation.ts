import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { releasePublications, trackPublications } from "./publication";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");

// URL validation
const urlSchema = z.string().url("有効なURLを入力してください");
const optionalUrlSchema = z
	.string()
	.url("有効なURLを入力してください")
	.optional();

// ReleasePublication
export const insertReleasePublicationSchema = createInsertSchema(
	releasePublications,
	{
		id: nonEmptyString,
		releaseId: nonEmptyString,
		platformCode: nonEmptyString,
		url: urlSchema,
	},
).omit({ createdAt: true, updatedAt: true });

export const updateReleasePublicationSchema = z.object({
	url: optionalUrlSchema,
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
	},
).omit({ createdAt: true, updatedAt: true });

export const updateTrackPublicationSchema = z.object({
	url: optionalUrlSchema,
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
