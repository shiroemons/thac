import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { trackDerivations, trackOfficialSongs } from "./track-relations";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");
const optionalString = z.string().trim().optional().nullable();

// TrackOfficialSong
export const insertTrackOfficialSongSchema = createInsertSchema(
	trackOfficialSongs,
	{
		id: nonEmptyString,
		trackId: nonEmptyString,
		officialSongId: nonEmptyString,
		partPosition: z
			.number()
			.int("整数を入力してください")
			.optional()
			.nullable(),
		startSecond: z
			.number()
			.min(0, "0以上の値を入力してください")
			.optional()
			.nullable(),
		endSecond: z
			.number()
			.min(0, "0以上の値を入力してください")
			.optional()
			.nullable(),
		confidence: z
			.number()
			.int("整数を入力してください")
			.min(0, "0以上の値を入力してください")
			.max(100, "100以下の値を入力してください")
			.optional()
			.nullable(),
		notes: optionalString,
	},
)
	.omit({ createdAt: true, updatedAt: true })
	.refine(
		(data) => {
			// startSecond と endSecond の両方が指定された場合のみチェック
			if (
				data.startSecond !== null &&
				data.startSecond !== undefined &&
				data.endSecond !== null &&
				data.endSecond !== undefined
			) {
				return data.endSecond >= data.startSecond;
			}
			return true;
		},
		{
			message: "終了秒は開始秒以上の値を入力してください",
			path: ["endSecond"],
		},
	);

export const updateTrackOfficialSongSchema = z
	.object({
		partPosition: z
			.number()
			.int("整数を入力してください")
			.optional()
			.nullable(),
		startSecond: z
			.number()
			.min(0, "0以上の値を入力してください")
			.optional()
			.nullable(),
		endSecond: z
			.number()
			.min(0, "0以上の値を入力してください")
			.optional()
			.nullable(),
		confidence: z
			.number()
			.int("整数を入力してください")
			.min(0, "0以上の値を入力してください")
			.max(100, "100以下の値を入力してください")
			.optional()
			.nullable(),
		notes: optionalString,
	})
	.refine(
		(data) => {
			if (
				data.startSecond !== null &&
				data.startSecond !== undefined &&
				data.endSecond !== null &&
				data.endSecond !== undefined
			) {
				return data.endSecond >= data.startSecond;
			}
			return true;
		},
		{
			message: "終了秒は開始秒以上の値を入力してください",
			path: ["endSecond"],
		},
	);

export const selectTrackOfficialSongSchema =
	createSelectSchema(trackOfficialSongs);

// TrackDerivation
export const insertTrackDerivationSchema = createInsertSchema(
	trackDerivations,
	{
		id: nonEmptyString,
		childTrackId: nonEmptyString,
		parentTrackId: nonEmptyString,
		notes: optionalString,
	},
)
	.omit({ createdAt: true, updatedAt: true })
	.refine((data) => data.childTrackId !== data.parentTrackId, {
		message: "自身を派生元に指定することはできません",
		path: ["parentTrackId"],
	});

export const selectTrackDerivationSchema = createSelectSchema(trackDerivations);

// Type exports
export type InsertTrackOfficialSong = z.infer<
	typeof insertTrackOfficialSongSchema
>;
export type UpdateTrackOfficialSong = z.infer<
	typeof updateTrackOfficialSongSchema
>;
export type SelectTrackOfficialSong = z.infer<
	typeof selectTrackOfficialSongSchema
>;

export type InsertTrackDerivation = z.infer<typeof insertTrackDerivationSchema>;
export type SelectTrackDerivation = z.infer<typeof selectTrackDerivationSchema>;
