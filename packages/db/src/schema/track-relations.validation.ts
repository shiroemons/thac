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
		officialSongId: z.string().trim().optional().nullable(),
		customSongName: z.string().trim().optional().nullable(),
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
		notes: optionalString,
	},
)
	.omit({ createdAt: true, updatedAt: true })
	.refine(
		(data) => {
			// officialSongId または customSongName のいずれかが必須
			const hasOfficialSong =
				data.officialSongId !== null &&
				data.officialSongId !== undefined &&
				data.officialSongId.trim() !== "";
			const hasCustomSong =
				data.customSongName !== null &&
				data.customSongName !== undefined &&
				data.customSongName.trim() !== "";
			return hasOfficialSong || hasCustomSong;
		},
		{
			message: "公式楽曲またはカスタム楽曲名のいずれかを指定してください",
			path: ["officialSongId"],
		},
	)
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
		officialSongId: z.string().trim().optional().nullable(),
		customSongName: z.string().trim().optional().nullable(),
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
		notes: optionalString,
	})
	.refine(
		(data) => {
			// officialSongId または customSongName のいずれかが必須（両方指定されている場合）
			if (
				data.officialSongId !== undefined ||
				data.customSongName !== undefined
			) {
				const hasOfficialSong =
					data.officialSongId !== null &&
					data.officialSongId !== undefined &&
					data.officialSongId.trim() !== "";
				const hasCustomSong =
					data.customSongName !== null &&
					data.customSongName !== undefined &&
					data.customSongName.trim() !== "";
				return hasOfficialSong || hasCustomSong;
			}
			return true;
		},
		{
			message: "公式楽曲またはカスタム楽曲名のいずれかを指定してください",
			path: ["officialSongId"],
		},
	)
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
