import {
	and,
	artistAliases,
	artists,
	asc,
	count,
	db,
	desc,
	eq,
	insertArtistSchema,
	like,
	or,
	sql,
	updateArtistSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { checkOptimisticLockConflict } from "../../../utils/conflict-check";
import { artistCirclesRouter, getArtistCircles } from "./circles";
import { artistTracksRouter, getArtistTracks } from "./tracks";

const artistsRouter = new Hono<AdminContext>();

// サブルーターをマウント
artistsRouter.route("/", artistTracksRouter);
artistsRouter.route("/", artistCirclesRouter);

// 一覧取得（ページネーション、検索、頭文字フィルタ、ソート対応）
artistsRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const initialScript = c.req.query("initialScript");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "name";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (initialScript) {
			conditions.push(eq(artists.initialScript, initialScript));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(artists.name, searchPattern),
					like(artists.nameJa, searchPattern),
					like(artists.nameEn, searchPattern),
					like(artists.sortName, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// ソートカラムを決定
		const sortColumnMap = {
			id: artists.id,
			name: artists.name,
			nameJa: artists.nameJa,
			createdAt: artists.createdAt,
			updatedAt: artists.updatedAt,
		} as const;
		const sortColumn =
			sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? artists.name;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(artists)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db.select({ count: count() }).from(artists).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artists");
	}
});

// 統合取得（基本情報 + 別名義 + 関連楽曲 + 参加サークル）
artistsRouter.get("/:id/full", async (c) => {
	try {
		const id = c.req.param("id");

		// 並列実行でパフォーマンス最適化
		const [artistResult, aliases, tracksData, circlesData] = await Promise.all([
			db.select().from(artists).where(eq(artists.id, id)).limit(1),
			db
				.select()
				.from(artistAliases)
				.where(eq(artistAliases.artistId, id))
				.orderBy(asc(artistAliases.name)),
			getArtistTracks(id),
			getArtistCircles(id),
		]);

		if (artistResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
		}

		return c.json({
			artist: { ...artistResult[0], aliases },
			tracks: {
				data: tracksData.tracks,
				total: tracksData.totalUniqueTrackCount,
			},
			circles: circlesData,
			stats: {
				trackCount: tracksData.totalUniqueTrackCount,
				releaseCount: tracksData.statistics.releaseCount,
				circleCount: circlesData.length,
				byRole: tracksData.byRole,
				earliestReleaseDate: tracksData.statistics.earliestReleaseDate,
				latestReleaseDate: tracksData.statistics.latestReleaseDate,
			},
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artists/:id/full");
	}
});

// 個別取得（別名義一覧を含む）
artistsRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// アーティスト取得
		const result = await db
			.select()
			.from(artists)
			.where(eq(artists.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
		}

		// 別名義一覧取得
		const aliases = await db
			.select()
			.from(artistAliases)
			.where(eq(artistAliases.artistId, id))
			.orderBy(asc(artistAliases.name));

		return c.json({
			...result[0],
			aliases,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/artists/:id");
	}
});

// 新規作成
artistsRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertArtistSchema.safeParse(body);
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
			.from(artists)
			.where(eq(artists.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 名前重複チェック（大文字小文字無視）
		const existingName = await db
			.select()
			.from(artists)
			.where(sql`lower(${artists.name}) = lower(${parsed.data.name})`)
			.limit(1);

		if (existingName.length > 0) {
			return c.json({ error: ERROR_MESSAGES.NAME_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db.insert(artists).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/artists");
	}
});

// 更新
artistsRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(artists)
			.where(eq(artists.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
		}

		const existingArtist = existing[0];

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingArtist,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateArtistSchema.safeParse(updateData);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 名前重複チェック（自身以外に同じ名前がある場合）
		if (parsed.data.name) {
			const existingName = await db
				.select()
				.from(artists)
				.where(sql`lower(${artists.name}) = lower(${parsed.data.name})`)
				.limit(1);

			if (existingName.length > 0 && existingName[0]?.id !== id) {
				return c.json({ error: ERROR_MESSAGES.NAME_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(artists)
			.set(parsed.data)
			.where(eq(artists.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/artists/:id");
	}
});

// 削除
artistsRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(artists)
			.where(eq(artists.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ARTIST_NOT_FOUND }, 404);
		}

		// 削除（関連別名義はCASCADE削除）
		await db.delete(artists).where(eq(artists.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/artists/:id");
	}
});

// アーティスト一括削除
artistsRouter.delete("/batch", async (c) => {
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
					.from(artists)
					.where(eq(artists.id, id))
					.limit(1);

				if (existing.length === 0) {
					failed.push({
						id,
						error: ERROR_MESSAGES.ARTIST_NOT_FOUND,
					});
					continue;
				}

				// 削除（関連別名義はCASCADE削除）
				await db.delete(artists).where(eq(artists.id, id));
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
		return handleDbError(c, error, "DELETE /admin/artists/batch");
	}
});

export { artistsRouter };
