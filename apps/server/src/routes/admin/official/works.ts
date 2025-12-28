import {
	and,
	count,
	db,
	eq,
	insertOfficialWorkLinkSchema,
	insertOfficialWorkSchema,
	like,
	officialWorkLinks,
	officialWorks,
	or,
	platforms,
	updateOfficialWorkLinkSchema,
	updateOfficialWorkSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { parseAndValidate } from "../../../utils/import-parser";

const worksRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、カテゴリフィルタ、検索対応）
worksRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const category = c.req.query("category");
		const search = c.req.query("search");

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (category) {
			conditions.push(eq(officialWorks.categoryCode, category));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(officialWorks.name, searchPattern),
					like(officialWorks.nameJa, searchPattern),
					like(officialWorks.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(officialWorks)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(officialWorks.position, officialWorks.id),
			db.select({ count: count() }).from(officialWorks).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/official/works");
	}
});

// 個別取得
worksRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/official/works/:id");
	}
});

// 新規作成
worksRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertOfficialWorkSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db
			.insert(officialWorks)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/official/works");
	}
});

// 更新
worksRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateOfficialWorkSchema.safeParse(body);
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
			.update(officialWorks)
			.set(parsed.data)
			.where(eq(officialWorks.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/official/works/:id");
	}
});

// 削除
worksRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// 削除（関連楽曲はCASCADE削除）
		await db.delete(officialWorks).where(eq(officialWorks.id, id));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/official/works/:id");
	}
});

// インポート
worksRouter.post("/import", async (c) => {
	try {
		const body = await c.req.parseBody();
		const file = body.file;

		if (!(file instanceof File)) {
			return c.json({ error: ERROR_MESSAGES.FILE_NOT_SPECIFIED }, 400);
		}

		const content = await file.text();
		const result = parseAndValidate(
			content,
			file.name,
			insertOfficialWorkSchema,
		);

		if (!result.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					rows: result.errors,
				},
				400,
			);
		}

		const data = result.data;
		if (!data) {
			return c.json({ error: ERROR_MESSAGES.DATA_FETCH_FAILED }, 500);
		}

		let created = 0;
		const updated = 0;

		await db.transaction(async (tx) => {
			for (const item of data) {
				await tx
					.insert(officialWorks)
					.values(item)
					.onConflictDoUpdate({
						target: officialWorks.id,
						set: {
							categoryCode: item.categoryCode,
							name: item.name,
							nameJa: item.nameJa,
							nameEn: item.nameEn,
							shortNameJa: item.shortNameJa,
							shortNameEn: item.shortNameEn,
							numberInSeries: item.numberInSeries,
							releaseDate: item.releaseDate,
							officialOrganization: item.officialOrganization,
							position: item.position,
							notes: item.notes,
						},
					});
				created++;
			}
		});

		return c.json({
			success: true,
			created,
			updated,
			total: data.length,
		});
	} catch (error) {
		return handleDbError(c, error, "POST /admin/official/works/import");
	}
});

// ===== 作品リンク関連エンドポイント =====

// 作品のリンク一覧取得
worksRouter.get("/:workId/links", async (c) => {
	try {
		const workId = c.req.param("workId");

		// 作品存在チェック
		const existingWork = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, workId))
			.limit(1);

		if (existingWork.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		const links = await db
			.select({
				id: officialWorkLinks.id,
				officialWorkId: officialWorkLinks.officialWorkId,
				platformCode: officialWorkLinks.platformCode,
				url: officialWorkLinks.url,
				sortOrder: officialWorkLinks.sortOrder,
				createdAt: officialWorkLinks.createdAt,
				updatedAt: officialWorkLinks.updatedAt,
				platformName: platforms.name,
			})
			.from(officialWorkLinks)
			.leftJoin(platforms, eq(officialWorkLinks.platformCode, platforms.code))
			.where(eq(officialWorkLinks.officialWorkId, workId))
			.orderBy(officialWorkLinks.sortOrder);

		return c.json(links);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/official/works/:workId/links");
	}
});

// 作品リンク追加
worksRouter.post("/:workId/links", async (c) => {
	try {
		const workId = c.req.param("workId");
		const body = await c.req.json();

		// 作品存在チェック
		const existingWork = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.id, workId))
			.limit(1);

		if (existingWork.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = insertOfficialWorkLinkSchema.safeParse({
			...body,
			officialWorkId: workId,
		});
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(officialWorkLinks)
			.where(eq(officialWorkLinks.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// URL重複チェック（同一作品内）
		const existingUrl = await db
			.select()
			.from(officialWorkLinks)
			.where(
				and(
					eq(officialWorkLinks.officialWorkId, workId),
					eq(officialWorkLinks.url, parsed.data.url),
				),
			)
			.limit(1);

		if (existingUrl.length > 0) {
			return c.json({ error: ERROR_MESSAGES.URL_ALREADY_EXISTS_FOR_WORK }, 409);
		}

		// 作成
		const result = await db
			.insert(officialWorkLinks)
			.values(parsed.data)
			.returning();
		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/official/works/:workId/links");
	}
});

// 作品リンク更新
worksRouter.put("/:workId/links/:linkId", async (c) => {
	try {
		const workId = c.req.param("workId");
		const linkId = c.req.param("linkId");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorkLinks)
			.where(
				and(
					eq(officialWorkLinks.id, linkId),
					eq(officialWorkLinks.officialWorkId, workId),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateOfficialWorkLinkSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// URL重複チェック（同一作品内、自身以外）
		if (parsed.data.url) {
			const existingUrl = await db
				.select()
				.from(officialWorkLinks)
				.where(
					and(
						eq(officialWorkLinks.officialWorkId, workId),
						eq(officialWorkLinks.url, parsed.data.url),
					),
				)
				.limit(1);

			if (existingUrl.length > 0 && existingUrl[0]?.id !== linkId) {
				return c.json(
					{ error: ERROR_MESSAGES.URL_ALREADY_EXISTS_FOR_WORK },
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(officialWorkLinks)
			.set(parsed.data)
			.where(eq(officialWorkLinks.id, linkId))
			.returning();
		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/official/works/:workId/links/:linkId",
		);
	}
});

// 作品リンク削除
worksRouter.delete("/:workId/links/:linkId", async (c) => {
	try {
		const workId = c.req.param("workId");
		const linkId = c.req.param("linkId");

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorkLinks)
			.where(
				and(
					eq(officialWorkLinks.id, linkId),
					eq(officialWorkLinks.officialWorkId, workId),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(officialWorkLinks).where(eq(officialWorkLinks.id, linkId));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/official/works/:workId/links/:linkId",
		);
	}
});

// 作品リンク並べ替え
worksRouter.put("/:workId/links/:linkId/reorder", async (c) => {
	try {
		const workId = c.req.param("workId");
		const linkId = c.req.param("linkId");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(officialWorkLinks)
			.where(
				and(
					eq(officialWorkLinks.id, linkId),
					eq(officialWorkLinks.officialWorkId, workId),
				),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.WORK_NOT_FOUND }, 404);
		}

		// バリデーション
		const sortOrder = Number(body.sortOrder);
		if (Number.isNaN(sortOrder) || sortOrder < 0) {
			return c.json({ error: ERROR_MESSAGES.INVALID_SORT_ORDER }, 400);
		}

		// 更新
		const result = await db
			.update(officialWorkLinks)
			.set({ sortOrder })
			.where(eq(officialWorkLinks.id, linkId))
			.returning();
		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/official/works/:workId/links/:linkId/reorder",
		);
	}
});

export { worksRouter };
