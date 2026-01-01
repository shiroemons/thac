import {
	and,
	artistAliases,
	artists,
	asc,
	count,
	db,
	desc,
	eq,
	insertArtistAliasSchema,
	like,
	sql,
	updateArtistAliasSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { checkOptimisticLockConflict } from "../../../utils/conflict-check";
import { aliasCirclesRouter } from "./circles";
import { aliasTracksRouter } from "./tracks";

const artistAliasesRouter = new Hono<AdminContext>();

// サブルーターをマウント
artistAliasesRouter.route("/", aliasTracksRouter);
artistAliasesRouter.route("/", aliasCirclesRouter);

// 一覧取得（ページネーション、検索、アーティストIDフィルタ対応）
artistAliasesRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const artistId = c.req.query("artistId");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "name";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (artistId) {
			conditions.push(eq(artistAliases.artistId, artistId));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(like(artistAliases.name, searchPattern));
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// ソートカラムを決定
		const sortColumnMap = {
			id: artistAliases.id,
			name: artistAliases.name,
			createdAt: artistAliases.createdAt,
			updatedAt: artistAliases.updatedAt,
		} as const;
		const sortColumn =
			sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? artistAliases.name;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得（親アーティスト名を結合）
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: artistAliases.id,
					artistId: artistAliases.artistId,
					name: artistAliases.name,
					aliasTypeCode: artistAliases.aliasTypeCode,
					nameInitial: artistAliases.nameInitial,
					initialScript: artistAliases.initialScript,
					periodFrom: artistAliases.periodFrom,
					periodTo: artistAliases.periodTo,
					createdAt: artistAliases.createdAt,
					updatedAt: artistAliases.updatedAt,
					artistName: artists.name,
				})
				.from(artistAliases)
				.leftJoin(artists, eq(artistAliases.artistId, artists.id))
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db.select({ count: count() }).from(artistAliases).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artist-aliases");
	}
});

// 個別取得
artistAliasesRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db
			.select({
				id: artistAliases.id,
				artistId: artistAliases.artistId,
				name: artistAliases.name,
				aliasTypeCode: artistAliases.aliasTypeCode,
				nameInitial: artistAliases.nameInitial,
				initialScript: artistAliases.initialScript,
				periodFrom: artistAliases.periodFrom,
				periodTo: artistAliases.periodTo,
				createdAt: artistAliases.createdAt,
				updatedAt: artistAliases.updatedAt,
				artistName: artists.name,
			})
			.from(artistAliases)
			.leftJoin(artists, eq(artistAliases.artistId, artists.id))
			.where(eq(artistAliases.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_ALIAS_NOT_FOUND }, 404);
		}

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artist-aliases/:id");
	}
});

// 新規作成
artistAliasesRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertArtistAliasSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 親アーティスト存在チェック
		const existingArtist = await db
			.select()
			.from(artists)
			.where(eq(artists.id, parsed.data.artistId))
			.limit(1);

		if (existingArtist.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(artistAliases)
			.where(eq(artistAliases.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 同一アーティスト内での名前重複チェック（大文字小文字無視）
		const existingName = await db
			.select()
			.from(artistAliases)
			.where(
				and(
					eq(artistAliases.artistId, parsed.data.artistId),
					sql`lower(${artistAliases.name}) = lower(${parsed.data.name})`,
				),
			)
			.limit(1);

		if (existingName.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ALIAS_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db
			.insert(artistAliases)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/artist-aliases");
	}
});

// 更新
artistAliasesRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(artistAliases)
			.where(eq(artistAliases.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_ALIAS_NOT_FOUND }, 404);
		}

		const existingAlias = existing[0];

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingAlias,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateArtistAliasSchema.safeParse(updateData);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		const currentArtistId = parsed.data.artistId || existingAlias?.artistId;

		// 名前重複チェック（同一アーティスト内、自身以外）
		if (parsed.data.name && currentArtistId) {
			const existingName = await db
				.select()
				.from(artistAliases)
				.where(
					and(
						eq(artistAliases.artistId, currentArtistId),
						sql`lower(${artistAliases.name}) = lower(${parsed.data.name})`,
					),
				)
				.limit(1);

			if (existingName.length > 0 && existingName[0]?.id !== id) {
				return c.json({ error: ERROR_MESSAGES.ALIAS_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(artistAliases)
			.set(parsed.data)
			.where(eq(artistAliases.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/artist-aliases/:id");
	}
});

// 削除
artistAliasesRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(artistAliases)
			.where(eq(artistAliases.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_ALIAS_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(artistAliases).where(eq(artistAliases.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/artist-aliases/:id");
	}
});

// 一括削除
artistAliasesRouter.delete("/batch", async (c) => {
	try {
		const body = await c.req.json();
		const { ids } = body as { ids: string[] };

		if (!Array.isArray(ids) || ids.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ITEMS_REQUIRED_NON_EMPTY }, 400);
		}

		// 上限チェック（一度に100件まで）
		if (ids.length > 100) {
			return c.json({ error: ERROR_MESSAGES.MAXIMUM_BATCH_ITEMS }, 400);
		}

		const deleted: string[] = [];
		const failed: Array<{ id: string; error: string }> = [];

		for (const id of ids) {
			try {
				// 存在チェック
				const existing = await db
					.select()
					.from(artistAliases)
					.where(eq(artistAliases.id, id))
					.limit(1);

				if (existing.length === 0) {
					failed.push({
						id,
						error: ERROR_MESSAGES.ARTIST_ALIAS_NOT_FOUND,
					});
					continue;
				}

				// 削除
				await db.delete(artistAliases).where(eq(artistAliases.id, id));
				deleted.push(id);
			} catch (e) {
				failed.push({
					id,
					error: e instanceof Error ? e.message : "Unknown error",
				});
			}
		}

		return c.json({
			success: failed.length === 0,
			deleted,
			failed,
		});
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/artist-aliases/batch");
	}
});

export { artistAliasesRouter };
