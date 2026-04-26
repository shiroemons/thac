import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { albumRequests } from "./album-request";

// HTTP URLスキーマ
const httpUrlSchema = z
	.string()
	.trim()
	.url()
	.regex(/^https?:\/\//i, "URLはhttp(s)://から始めてください")
	.max(2048, "URLは2048文字以内で入力してください");

// 参考URLアイテムスキーマ
const referenceUrlItemSchema = z.object({
	url: httpUrlSchema,
	label: z
		.string()
		.trim()
		.max(100, "ラベルは100文字以内で入力してください")
		.optional(),
});

// 参考URLリストスキーマ
export const referenceUrlsSchema = z
	.array(referenceUrlItemSchema)
	.min(1, "参考URLを1件以上入力してください")
	.max(10, "参考URLは最大10件までです");

// 新規アルバム申請スキーマ
const newAlbumRequestSchema = z.object({
	requestType: z.literal("new"),
	existingReleaseId: z.undefined().optional(),
	albumName: z
		.string()
		.trim()
		.min(1, "アルバム名は必須です")
		.max(200, "アルバム名は200文字以内で入力してください"),
	circleName: z
		.string()
		.trim()
		.max(200, "サークル名は200文字以内で入力してください")
		.optional(),
	referenceUrls: referenceUrlsSchema,
	notes: z
		.string()
		.trim()
		.max(2000, "補足は2000文字以内で入力してください")
		.optional(),
});

// 既存アルバムへの追記申請スキーマ
const existingAlbumRequestSchema = z.object({
	requestType: z.literal("existing"),
	existingReleaseId: z.string().min(1, "既存アルバムを選択してください"),
	albumName: z
		.string()
		.trim()
		.max(200, "アルバム名は200文字以内で入力してください")
		.optional(),
	circleName: z
		.string()
		.trim()
		.max(200, "サークル名は200文字以内で入力してください")
		.optional(),
	referenceUrls: referenceUrlsSchema,
	notes: z
		.string()
		.trim()
		.max(2000, "補足は2000文字以内で入力してください")
		.optional(),
});

// アルバム申請作成スキーマ（requestTypeで分岐）
export const createAlbumRequestSchema = z.discriminatedUnion("requestType", [
	newAlbumRequestSchema,
	existingAlbumRequestSchema,
]);

// アルバム申請ステータス更新スキーマ（楽観的ロック用updatedAt必須）
export const updateAlbumRequestStatusSchema = z.object({
	status: z.enum(["approved", "rejected"]),
	reviewerNotes: z
		.string()
		.trim()
		.max(2000, "レビューメモは2000文字以内で入力してください")
		.optional()
		.nullable(),
	updatedAt: z.string(),
});

// selectスキーマ
export const selectAlbumRequestSchema = createSelectSchema(albumRequests);

// Type exports
export type CreateAlbumRequest = z.infer<typeof createAlbumRequestSchema>;
export type UpdateAlbumRequestStatus = z.infer<
	typeof updateAlbumRequestStatusSchema
>;
export type SelectAlbumRequest = z.infer<typeof selectAlbumRequestSchema>;
