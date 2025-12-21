import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { officialSongs, officialWorks } from "./official";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// OfficialWorks
export const insertOfficialWorkSchema = createInsertSchema(officialWorks, {
	id: nonEmptyString,
	categoryCode: nonEmptyString,
	name: nonEmptyString,
	nameJa: nonEmptyString,
	nameEn: optionalString,
	shortNameJa: optionalString,
	shortNameEn: optionalString,
	seriesCode: optionalString,
	numberInSeries: z.number().optional().nullable(),
	releaseDate: optionalString,
	officialOrganization: optionalString,
	position: z.number().int().optional().nullable(),
	notes: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateOfficialWorkSchema = insertOfficialWorkSchema
	.omit({ id: true })
	.partial();

export const selectOfficialWorkSchema = createSelectSchema(officialWorks);

// OfficialSongs
export const insertOfficialSongSchema = createInsertSchema(officialSongs, {
	id: nonEmptyString,
	officialWorkId: optionalString,
	trackNumber: z.number().int().optional().nullable(),
	name: nonEmptyString,
	nameJa: nonEmptyString,
	nameEn: optionalString,
	themeType: optionalString,
	composerName: optionalString,
	arrangerName: optionalString,
	isOriginal: z.boolean().default(true),
	sourceSongId: optionalString,
	notes: optionalString,
}).omit({ createdAt: true, updatedAt: true });

export const updateOfficialSongSchema = insertOfficialSongSchema
	.omit({ id: true })
	.partial();

export const selectOfficialSongSchema = createSelectSchema(officialSongs);

// Type exports
export type InsertOfficialWork = z.infer<typeof insertOfficialWorkSchema>;
export type UpdateOfficialWork = z.infer<typeof updateOfficialWorkSchema>;
export type SelectOfficialWork = z.infer<typeof selectOfficialWorkSchema>;

export type InsertOfficialSong = z.infer<typeof insertOfficialSongSchema>;
export type UpdateOfficialSong = z.infer<typeof updateOfficialSongSchema>;
export type SelectOfficialSong = z.infer<typeof selectOfficialSongSchema>;
