import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { tags, trackTags } from "./tag";

// Helper: 空文字列を拒否するスキーマ
const nonEmptyString = z.string().trim().min(1, "必須項目です");

/**
 * タグ名の文字数換算を計算
 * - 半角文字（ASCII、半角カナ）: 0.5
 * - 全角文字: 1
 */
function getTagNameWeight(name: string): number {
	return [...name].reduce((sum, char) => {
		const code = char.charCodeAt(0);
		// ASCII (0x0000-0x007F) または 半角カナ (0xFF61-0xFF9F)
		const isHalfWidth = code <= 0x007f || (code >= 0xff61 && code <= 0xff9f);
		return sum + (isHalfWidth ? 0.5 : 1);
	}, 0);
}

/**
 * 絵文字を含むかチェック
 * Unicode絵文字プロパティを使用
 */
function hasEmoji(text: string): boolean {
	return /\p{Emoji}/u.test(text);
}

// タグ名バリデーションスキーマ
export const tagNameSchema = z
	.string()
	.trim()
	.min(1, "タグ名は必須です")
	.refine((name) => !hasEmoji(name), "絵文字は使用できません")
	.refine(
		(name) => getTagNameWeight(name) <= 20,
		"タグ名が長すぎます（全角20文字、半角40文字以内）",
	);

// attributes フィールド（jsonbオブジェクトのオプショナル）
const attributesSchema = z
	.record(z.string(), z.unknown())
	.nullable()
	.optional();

// Tags
export const insertTagSchema = createInsertSchema(tags, {
	id: nonEmptyString,
	name: tagNameSchema,
	attributes: attributesSchema,
}).omit({ createdAt: true, updatedAt: true });

export const updateTagSchema = createInsertSchema(tags, {
	name: tagNameSchema.optional(),
	attributes: attributesSchema,
})
	.omit({ createdAt: true, updatedAt: true, id: true })
	.partial();

export const selectTagSchema = createSelectSchema(tags);

// TrackTags
export const insertTrackTagSchema = createInsertSchema(trackTags, {
	trackId: nonEmptyString,
	tagId: nonEmptyString,
	position: z.number().int().min(1).max(15),
	isLocked: z.boolean().optional(),
}).omit({ createdAt: true });

export const selectTrackTagSchema = createSelectSchema(trackTags);

// タグID配列（最大15件）
export const tagIdsSchema = z
	.array(z.string().trim().min(1))
	.max(15, "タグは最大15件まで設定できます");

// Type exports
export type InsertTag = z.infer<typeof insertTagSchema>;
export type UpdateTag = z.infer<typeof updateTagSchema>;
export type SelectTag = z.infer<typeof selectTagSchema>;

export type InsertTrackTag = z.infer<typeof insertTrackTagSchema>;
export type SelectTrackTag = z.infer<typeof selectTrackTagSchema>;

// Helper関数をエクスポート（アプリケーション側で使用可能）
export { getTagNameWeight, hasEmoji };
