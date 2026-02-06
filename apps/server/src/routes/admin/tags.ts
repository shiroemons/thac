import {
	and,
	asc,
	count,
	createId,
	db,
	desc,
	eq,
	inArray,
	like,
	releases,
	sql,
	tags,
	tracks,
	trackTags,
	updateTagSchema,
} from "@thac/db";
import type { SQL } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import type { AdminContext } from "../../middleware/admin-auth";
import { handleDbError } from "../../utils/api-error";

const tagsRouter = new Hono<AdminContext>();

// タグ名バリデーションスキーマ（@thac/dbから再定義、tag.validation.tsと同等）
const tagNameSchema = z
	.string()
	.trim()
	.min(1, "タグ名は必須です")
	.refine((name) => !/\p{Emoji}/u.test(name), "絵文字は使用できません")
	.refine((name) => {
		const weight = [...name].reduce((sum, char) => {
			const code = char.charCodeAt(0);
			const isHalfWidth = code <= 0x007f || (code >= 0xff61 && code <= 0xff9f);
			return sum + (isHalfWidth ? 0.5 : 1);
		}, 0);
		return weight <= 20;
	}, "タグ名が長すぎます（全角20文字、半角40文字以内）");

// タグ一覧取得（検索、使用数付き、ページネーション）
tagsRouter.get("/", async (c) => {
	try {
		const search = c.req.query("search");
		const page = Number.parseInt(c.req.query("page") ?? "1", 10);
		const limit = Math.min(
			Number.parseInt(c.req.query("limit") ?? "50", 10),
			100,
		);
		const sortBy = c.req.query("sortBy") || "name";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const offset = (page - 1) * limit;

		// 検索条件を構築
		let whereCondition: SQL<unknown> | undefined;
		if (search) {
			const searchPattern = `%${search}%`;
			whereCondition = like(tags.name, searchPattern);
		}

		// サブクエリで使用数を取得
		const usageCountSubquery = db
			.select({
				tagId: trackTags.tagId,
				usageCount: count(trackTags.trackId).as("usageCount"),
			})
			.from(trackTags)
			.groupBy(trackTags.tagId)
			.as("usage");

		// ソートカラムを決定
		const getSortColumn = () => {
			switch (sortBy) {
				case "trackCount":
				case "usageCount":
					return usageCountSubquery.usageCount;
				case "createdAt":
					return tags.createdAt;
				case "updatedAt":
					return tags.updatedAt;
				default:
					return tags.name;
			}
		};

		const sortColumn = getSortColumn();
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// タグ一覧取得
		const result = await db
			.select({
				id: tags.id,
				name: tags.name,
				attributes: tags.attributes,
				trackCount: sql<number>`COALESCE(${usageCountSubquery.usageCount}, 0)`,
				createdAt: tags.createdAt,
				updatedAt: tags.updatedAt,
			})
			.from(tags)
			.leftJoin(usageCountSubquery, eq(tags.id, usageCountSubquery.tagId))
			.where(whereCondition)
			.orderBy(orderByClause)
			.limit(limit)
			.offset(offset);

		// 総件数を取得
		const [totalResult] = await db
			.select({ count: count() })
			.from(tags)
			.where(whereCondition);

		const total = totalResult?.count ?? 0;

		return c.json({
			data: result.map((tag) => ({
				...tag,
				createdAt: tag.createdAt.toISOString(),
				updatedAt: tag.updatedAt.toISOString(),
			})),
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tags");
	}
});

// タグ作成（既存なら返却）
tagsRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const nameResult = tagNameSchema.safeParse(body.name);
		if (!nameResult.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: nameResult.error.flatten().fieldErrors,
				},
				400,
			);
		}

		const name = nameResult.data;

		// attributes のバリデーション
		let attributesVal: Record<string, unknown> | null = null;
		if (body.attributes) {
			if (
				typeof body.attributes !== "object" ||
				Array.isArray(body.attributes)
			) {
				return c.json(
					{
						error: ERROR_MESSAGES.VALIDATION_FAILED,
						details: {
							attributes: ["有効なオブジェクト形式で入力してください"],
						},
					},
					400,
				);
			}
			attributesVal = body.attributes;
		}

		// 既存タグ検索（大文字小文字無視）
		const existing = await db
			.select()
			.from(tags)
			.where(sql`LOWER(${tags.name}) = LOWER(${name})`)
			.limit(1);

		if (existing.length > 0) {
			const existingTag = existing[0];
			if (existingTag) {
				return c.json(
					{
						error: "このタグは既に存在します",
						existingTag: {
							id: existingTag.id,
							name: existingTag.name,
						},
					},
					409,
				);
			}
		}

		// 新規作成
		const newId = createId.tag();
		const result = await db
			.insert(tags)
			.values({
				id: newId,
				name,
				attributes: attributesVal,
			})
			.returning();

		const createdTag = result[0];
		if (!createdTag) {
			return c.json({ error: "タグの作成に失敗しました" }, 500);
		}
		return c.json(
			{
				id: createdTag.id,
				name: createdTag.name,
				attributes: createdTag.attributes ?? null,
				createdAt: createdTag.createdAt.toISOString(),
				updatedAt: createdTag.updatedAt.toISOString(),
			},
			201,
		);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/tags");
	}
});

// タグマージ
tagsRouter.post("/merge", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const mergeSchema = z.object({
			sourceTagIds: z.array(z.string().min(1)).min(1),
			targetTagId: z.string().min(1),
		});

		const parsed = mergeSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		const { sourceTagIds, targetTagId } = parsed.data;

		// sourceにtargetが含まれていないかチェック
		if (sourceTagIds.includes(targetTagId)) {
			return c.json(
				{ error: "マージ元とマージ先に同じタグIDを指定できません" },
				400,
			);
		}

		// ターゲットタグ存在チェック
		const targetTag = await db
			.select()
			.from(tags)
			.where(eq(tags.id, targetTagId))
			.limit(1);

		if (targetTag.length === 0) {
			return c.json({ error: "マージ先のタグが見つかりません" }, 404);
		}

		// ソースタグ存在チェック
		const sourceTags = await db
			.select()
			.from(tags)
			.where(inArray(tags.id, sourceTagIds));

		const foundIds = new Set(sourceTags.map((t) => t.id));
		const notFoundIds = sourceTagIds.filter((id) => !foundIds.has(id));

		if (notFoundIds.length > 0) {
			return c.json(
				{
					error: "マージ元のタグが見つかりません",
					notFoundIds,
				},
				404,
			);
		}

		// トランザクションでマージ実行
		const result = await db.transaction(async (tx) => {
			// ソースタグの紐付けを取得
			const sourceTrackTags = await tx
				.select()
				.from(trackTags)
				.where(inArray(trackTags.tagId, sourceTagIds));

			// ターゲットタグの既存紐付けを取得
			const targetTrackTags = await tx
				.select()
				.from(trackTags)
				.where(eq(trackTags.tagId, targetTagId));

			const targetTrackIds = new Set(targetTrackTags.map((t) => t.trackId));

			let mergedCount = 0;

			// 各ソース紐付けを処理
			for (const sourceTrackTag of sourceTrackTags) {
				if (!targetTrackIds.has(sourceTrackTag.trackId)) {
					// ターゲットにない場合は移行
					await tx
						.update(trackTags)
						.set({ tagId: targetTagId })
						.where(
							and(
								eq(trackTags.trackId, sourceTrackTag.trackId),
								eq(trackTags.tagId, sourceTrackTag.tagId),
							),
						);
					targetTrackIds.add(sourceTrackTag.trackId);
					mergedCount++;
				} else {
					// 重複の場合は削除
					await tx
						.delete(trackTags)
						.where(
							and(
								eq(trackTags.trackId, sourceTrackTag.trackId),
								eq(trackTags.tagId, sourceTrackTag.tagId),
							),
						);
				}
			}

			// ソースタグを削除
			await tx.delete(tags).where(inArray(tags.id, sourceTagIds));

			// マージ後の使用数を取得
			const [usageResult] = await tx
				.select({ count: count() })
				.from(trackTags)
				.where(eq(trackTags.tagId, targetTagId));

			return {
				mergedCount,
				usageCount: usageResult?.count ?? 0,
			};
		});

		const targetTagData = targetTag[0];
		if (!targetTagData) {
			return c.json({ error: "マージ先のタグが見つかりません" }, 404);
		}
		return c.json({
			targetTag: {
				id: targetTagData.id,
				name: targetTagData.name,
				usageCount: result.usageCount,
			},
			mergedCount: result.mergedCount,
			deletedTags: sourceTagIds,
		});
	} catch (error) {
		return handleDbError(c, error, "POST /admin/tags/merge");
	}
});

// タグ詳細取得
tagsRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		const tag = result[0];
		if (!tag) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 使用トラック数を取得
		const [usageResult] = await db
			.select({ count: count() })
			.from(trackTags)
			.where(eq(trackTags.tagId, id));

		// ロック中の紐付け数を取得
		const [lockedResult] = await db
			.select({ count: count() })
			.from(trackTags)
			.where(and(eq(trackTags.tagId, id), eq(trackTags.isLocked, true)));

		return c.json({
			id: tag.id,
			name: tag.name,
			attributes: tag.attributes ?? null,
			usageCount: usageResult?.count ?? 0,
			lockedCount: lockedResult?.count ?? 0,
			createdAt: tag.createdAt.toISOString(),
			updatedAt: tag.updatedAt.toISOString(),
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tags/:id");
	}
});

// タグに紐づくトラック一覧
tagsRouter.get("/:id/tracks", async (c) => {
	try {
		const id = c.req.param("id");
		const page = Number.parseInt(c.req.query("page") ?? "1", 10);
		const limit = Math.min(
			Number.parseInt(c.req.query("limit") ?? "20", 10),
			100,
		);

		const offset = (page - 1) * limit;

		// タグ存在チェック
		const tag = await db
			.select({ id: tags.id, name: tags.name })
			.from(tags)
			.where(eq(tags.id, id))
			.limit(1);

		if (tag.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// トラック一覧を取得
		const tracksResult = await db
			.select({
				id: tracks.id,
				name: tracks.name,
				releaseId: tracks.releaseId,
				releaseName: releases.name,
				position: trackTags.position,
				isLocked: trackTags.isLocked,
				createdAt: trackTags.createdAt,
			})
			.from(trackTags)
			.innerJoin(tracks, eq(trackTags.trackId, tracks.id))
			.leftJoin(releases, eq(tracks.releaseId, releases.id))
			.where(eq(trackTags.tagId, id))
			.orderBy(trackTags.position)
			.limit(limit)
			.offset(offset);

		// 総件数を取得
		const [totalResult] = await db
			.select({ count: count() })
			.from(trackTags)
			.where(eq(trackTags.tagId, id));

		const total = totalResult?.count ?? 0;
		const totalPages = Math.ceil(total / limit);

		return c.json({
			tag: tag[0],
			tracks: tracksResult.map((t) => ({
				...t,
				createdAt: t.createdAt.toISOString(),
			})),
			pagination: {
				page,
				limit,
				totalCount: total,
				totalPages,
			},
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/tags/:id/tracks");
	}
});

// タグリネーム（更新）
tagsRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(tags)
			.where(eq(tags.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateTagSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 名前が指定されている場合は追加バリデーション
		if (body.name) {
			const nameResult = tagNameSchema.safeParse(body.name);
			if (!nameResult.success) {
				return c.json(
					{
						error: ERROR_MESSAGES.VALIDATION_FAILED,
						details: nameResult.error.flatten().fieldErrors,
					},
					400,
				);
			}

			// 同名タグ（自分以外）の存在チェック
			const duplicate = await db
				.select()
				.from(tags)
				.where(
					and(
						sql`LOWER(${tags.name}) = LOWER(${body.name})`,
						sql`${tags.id} != ${id}`,
					),
				)
				.limit(1);

			if (duplicate.length > 0) {
				const dupTag = duplicate[0];
				if (dupTag) {
					return c.json(
						{
							error: "このタグ名は既に使用されています",
							existingTag: {
								id: dupTag.id,
								name: dupTag.name,
							},
						},
						409,
					);
				}
			}
		}

		// attributes の処理
		let attributesVal: Record<string, unknown> | null | undefined;
		if (body.attributes !== undefined) {
			if (body.attributes === null) {
				attributesVal = null;
			} else {
				if (
					typeof body.attributes !== "object" ||
					Array.isArray(body.attributes)
				) {
					return c.json(
						{
							error: ERROR_MESSAGES.VALIDATION_FAILED,
							details: {
								attributes: ["有効なオブジェクト形式で入力してください"],
							},
						},
						400,
					);
				}
				attributesVal = body.attributes;
			}
		}

		// 更新データを構築
		const updateData: {
			name?: string;
			attributes?: Record<string, unknown> | null;
		} = {};
		if (body.name) {
			updateData.name = body.name;
		}
		if (attributesVal !== undefined) {
			updateData.attributes = attributesVal;
		}

		// 更新
		const result = await db
			.update(tags)
			.set(updateData)
			.where(eq(tags.id, id))
			.returning();

		const updatedTag = result[0];
		if (!updatedTag) {
			return c.json({ error: "タグの更新に失敗しました" }, 500);
		}
		return c.json({
			id: updatedTag.id,
			name: updatedTag.name,
			attributes: updatedTag.attributes ?? null,
			createdAt: updatedTag.createdAt.toISOString(),
			updatedAt: updatedTag.updatedAt.toISOString(),
		});
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/tags/:id");
	}
});

// タグ削除
tagsRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const force = c.req.query("force") === "true";

		// 存在チェック
		const existing = await db
			.select()
			.from(tags)
			.where(eq(tags.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 使用中チェック
		const [usageResult] = await db
			.select({ count: count() })
			.from(trackTags)
			.where(eq(trackTags.tagId, id));

		const usageCount = usageResult?.count ?? 0;

		if (usageCount > 0 && !force) {
			return c.json(
				{
					error: "このタグは使用中のため削除できません",
					usageCount,
					message: `このタグは ${usageCount} 件のトラックで使用中です`,
				},
				409,
			);
		}

		// forceの場合は紐付けも削除
		if (force && usageCount > 0) {
			await db.delete(trackTags).where(eq(trackTags.tagId, id));
		}

		// タグ削除
		await db.delete(tags).where(eq(tags.id, id));

		return c.body(null, 204);
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/tags/:id");
	}
});

export { tagsRouter };
