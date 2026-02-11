import {
	asc,
	count,
	db,
	eq,
	genres,
	ilike,
	insertGenreSchema,
	max,
	or,
	trackGenres,
	updateGenreSchema,
} from "@thac/db";
import type { SQL } from "drizzle-orm";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../constants/error-messages";
import type { AdminContext } from "../../middleware/admin-auth";
import { handleDbError } from "../../utils/api-error";
import { checkOptimisticLockConflict } from "../../utils/conflict-check";
import { sanitizeSearch } from "../../utils/query-params";

const genresRouter = new Hono<AdminContext>();

// 一覧取得（sortOrder順でソート）
genresRouter.get("/", async (c) => {
	try {
		const search = sanitizeSearch(c.req.query("search"));

		// 検索条件を構築
		let whereCondition: SQL<unknown> | undefined;
		if (search) {
			const searchPattern = `%${search}%`;
			whereCondition = or(
				ilike(genres.code, searchPattern),
				ilike(genres.nameJa, searchPattern),
				ilike(genres.nameEn, searchPattern),
			);
		}

		const data = await db
			.select()
			.from(genres)
			.where(whereCondition)
			.orderBy(asc(genres.sortOrder));

		return c.json({ data });
	} catch (error) {
		return handleDbError(c, error, "GET /admin/genres");
	}
});

// 順序一括更新（PATCH /reorder）
genresRouter.patch("/reorder", async (c) => {
	try {
		const body = await c.req.json();

		if (!body.items || !Array.isArray(body.items)) {
			return c.json({ error: ERROR_MESSAGES.ITEMS_ARRAY_REQUIRED }, 400);
		}

		for (const item of body.items) {
			if (!item.code || typeof item.sortOrder !== "number") {
				return c.json(
					{ error: ERROR_MESSAGES.ITEMS_MUST_HAVE_CODE_AND_SORT_ORDER },
					400,
				);
			}
			await db
				.update(genres)
				.set({ sortOrder: item.sortOrder })
				.where(eq(genres.code, item.code));
		}

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(c, error, "PATCH /admin/genres/reorder");
	}
});

// 詳細取得
genresRouter.get("/:code", async (c) => {
	try {
		const code = c.req.param("code");

		const result = await db
			.select()
			.from(genres)
			.where(eq(genres.code, code))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/genres/:code");
	}
});

// 新規作成
genresRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertGenreSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 重複チェック
		const existing = await db
			.select({ code: genres.code })
			.from(genres)
			.where(eq(genres.code, parsed.data.code))
			.limit(1);

		if (existing.length > 0) {
			return c.json({ error: ERROR_MESSAGES.CODE_ALREADY_EXISTS }, 409);
		}

		// sortOrder が未指定の場合は最大値 + 1 を設定
		let sortOrder = parsed.data.sortOrder;
		if (sortOrder === undefined || sortOrder === null) {
			const maxResult = await db
				.select({ maxOrder: max(genres.sortOrder) })
				.from(genres);
			sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
		}

		// 作成
		const result = await db
			.insert(genres)
			.values({ ...parsed.data, sortOrder })
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/genres");
	}
});

// 更新
genresRouter.put("/:code", async (c) => {
	try {
		const code = c.req.param("code");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(genres)
			.where(eq(genres.code, code))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		const existingGenre = existing[0];

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingGenre,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateGenreSchema.safeParse(updateData);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 更新
		const result = await db
			.update(genres)
			.set(parsed.data)
			.where(eq(genres.code, code))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/genres/:code");
	}
});

// 削除
genresRouter.delete("/:code", async (c) => {
	try {
		const code = c.req.param("code");

		// 存在チェック
		const existing = await db
			.select({ code: genres.code })
			.from(genres)
			.where(eq(genres.code, code))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.NOT_FOUND }, 404);
		}

		// 使用中チェック（track_genresにレコードがある場合は拒否）
		const trackUsage = await db
			.select({ count: count() })
			.from(trackGenres)
			.where(eq(trackGenres.genreCode, code));

		const trackCount = trackUsage[0]?.count ?? 0;

		if (trackCount > 0) {
			return c.json(
				{
					error:
						"このジャンルは使用中のため削除できません。先に紐付けを解除してください",
					usage: {
						tracks: trackCount,
					},
				},
				409,
			);
		}

		// 削除
		await db.delete(genres).where(eq(genres.code, code));

		return c.json({ success: true, code });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/genres/:code");
	}
});

export { genresRouter };
