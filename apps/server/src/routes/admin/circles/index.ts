import {
	and,
	asc,
	circleLinks,
	circles,
	count,
	db,
	desc,
	eq,
	insertCircleLinkSchema,
	insertCircleSchema,
	like,
	or,
	platforms,
	sql,
	updateCircleLinkSchema,
	updateCircleSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { checkOptimisticLockConflict } from "../../../utils/conflict-check";
import { circleArtistsRouter, getCircleArtists } from "./artists";
import { circleReleasesRouter, getCircleReleases } from "./releases";

const circlesRouter = new Hono<AdminContext>();

// サブルーターをマウント
circlesRouter.route("/", circleReleasesRouter);
circlesRouter.route("/", circleArtistsRouter);

// サークル一覧取得（ページネーション、検索、頭文字フィルタ、ソート対応）
circlesRouter.get("/", async (c) => {
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
			conditions.push(eq(circles.initialScript, initialScript));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(
					like(circles.name, searchPattern),
					like(circles.nameJa, searchPattern),
					like(circles.nameEn, searchPattern),
				),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// ソートカラムを決定
		const sortColumnMap = {
			id: circles.id,
			name: circles.name,
			nameJa: circles.nameJa,
			createdAt: circles.createdAt,
			updatedAt: circles.updatedAt,
		} as const;
		const sortColumn =
			sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? circles.name;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select()
				.from(circles)
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db.select({ count: count() }).from(circles).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles");
	}
});

// 統合取得（基本情報 + リンク + 参加アーティスト + リリース）
circlesRouter.get("/:id/full", async (c) => {
	try {
		const id = c.req.param("id");

		// 並列実行でパフォーマンス最適化
		const [circleResult, links, artistsData, releasesData] = await Promise.all([
			db.select().from(circles).where(eq(circles.id, id)).limit(1),
			db
				.select({
					id: circleLinks.id,
					circleId: circleLinks.circleId,
					platformCode: circleLinks.platformCode,
					url: circleLinks.url,
					platformId: circleLinks.platformId,
					handle: circleLinks.handle,
					isOfficial: circleLinks.isOfficial,
					isPrimary: circleLinks.isPrimary,
					createdAt: circleLinks.createdAt,
					updatedAt: circleLinks.updatedAt,
					platformName: platforms.name,
				})
				.from(circleLinks)
				.leftJoin(platforms, eq(circleLinks.platformCode, platforms.code))
				.where(eq(circleLinks.circleId, id))
				.orderBy(circleLinks.isPrimary, circleLinks.createdAt),
			getCircleArtists(id),
			getCircleReleases(id),
		]);

		if (circleResult.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// リリース数を計算（参加形態別データからフラット化）
		const totalReleaseCount = releasesData.reduce(
			(sum, group) => sum + group.releases.length,
			0,
		);

		return c.json({
			circle: { ...circleResult[0], links },
			artists: artistsData,
			releases: releasesData,
			stats: {
				artistCount: artistsData.statistics.totalArtistCount,
				releaseCount: totalReleaseCount,
				trackCount: artistsData.statistics.totalTrackCount,
				earliestReleaseDate: artistsData.statistics.earliestReleaseDate,
				latestReleaseDate: artistsData.statistics.latestReleaseDate,
			},
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles/:id/full");
	}
});

// サークル個別取得（リンク情報を含む）
circlesRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db
			.select()
			.from(circles)
			.where(eq(circles.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// 関連リンクを取得
		const links = await db
			.select({
				id: circleLinks.id,
				circleId: circleLinks.circleId,
				platformCode: circleLinks.platformCode,
				url: circleLinks.url,
				platformId: circleLinks.platformId,
				handle: circleLinks.handle,
				isOfficial: circleLinks.isOfficial,
				isPrimary: circleLinks.isPrimary,
				createdAt: circleLinks.createdAt,
				updatedAt: circleLinks.updatedAt,
				platformName: platforms.name,
			})
			.from(circleLinks)
			.leftJoin(platforms, eq(circleLinks.platformCode, platforms.code))
			.where(eq(circleLinks.circleId, id))
			.orderBy(circleLinks.isPrimary, circleLinks.createdAt);

		return c.json({
			...result[0],
			links,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles/:id");
	}
});

// サークル新規作成
circlesRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertCircleSchema.safeParse(body);
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
			.from(circles)
			.where(eq(circles.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 名前重複チェック（大文字小文字無視）
		const existingName = await db
			.select()
			.from(circles)
			.where(sql`lower(${circles.name}) = lower(${parsed.data.name})`)
			.limit(1);

		if (existingName.length > 0) {
			return c.json({ error: ERROR_MESSAGES.NAME_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db.insert(circles).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/circles");
	}
});

// サークル更新
circlesRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(circles)
			.where(eq(circles.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		const existingCircle = existing[0];

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingCircle,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateCircleSchema.safeParse(updateData);
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
				.from(circles)
				.where(sql`lower(${circles.name}) = lower(${parsed.data.name})`)
				.limit(1);

			if (existingName.length > 0 && existingName[0]?.id !== id) {
				return c.json({ error: ERROR_MESSAGES.NAME_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(circles)
			.set(parsed.data)
			.where(eq(circles.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/circles/:id");
	}
});

// サークル削除
circlesRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(circles)
			.where(eq(circles.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// 削除（関連リンクはCASCADE削除）
		await db.delete(circles).where(eq(circles.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/circles/:id");
	}
});

// ===== サークルリンク関連エンドポイント =====

// サークルのリンク一覧取得
circlesRouter.get("/:circleId/links", async (c) => {
	try {
		const circleId = c.req.param("circleId");

		// サークル存在チェック
		const existingCircle = await db
			.select()
			.from(circles)
			.where(eq(circles.id, circleId))
			.limit(1);

		if (existingCircle.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		const links = await db
			.select({
				id: circleLinks.id,
				circleId: circleLinks.circleId,
				platformCode: circleLinks.platformCode,
				url: circleLinks.url,
				platformId: circleLinks.platformId,
				handle: circleLinks.handle,
				isOfficial: circleLinks.isOfficial,
				isPrimary: circleLinks.isPrimary,
				createdAt: circleLinks.createdAt,
				updatedAt: circleLinks.updatedAt,
				platformName: platforms.name,
			})
			.from(circleLinks)
			.leftJoin(platforms, eq(circleLinks.platformCode, platforms.code))
			.where(eq(circleLinks.circleId, circleId))
			.orderBy(circleLinks.isPrimary, circleLinks.createdAt);

		return c.json(links);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/circles/:circleId/links");
	}
});

// サークルリンク追加
circlesRouter.post("/:circleId/links", async (c) => {
	try {
		const circleId = c.req.param("circleId");
		const body = await c.req.json();

		// サークル存在チェック
		const existingCircle = await db
			.select()
			.from(circles)
			.where(eq(circles.id, circleId))
			.limit(1);

		if (existingCircle.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = insertCircleLinkSchema.safeParse({
			...body,
			circleId,
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
			.from(circleLinks)
			.where(eq(circleLinks.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// URL重複チェック（同一サークル内）
		const existingUrl = await db
			.select()
			.from(circleLinks)
			.where(
				and(
					eq(circleLinks.circleId, circleId),
					eq(circleLinks.url, parsed.data.url),
				),
			)
			.limit(1);

		if (existingUrl.length > 0) {
			return c.json(
				{ error: ERROR_MESSAGES.URL_ALREADY_EXISTS_FOR_CIRCLE },
				409,
			);
		}

		// プラットフォームのURLパターンを取得してバリデーション
		const platform = await db
			.select({ urlPattern: platforms.urlPattern })
			.from(platforms)
			.where(eq(platforms.code, parsed.data.platformCode))
			.limit(1);

		if (platform[0]?.urlPattern) {
			try {
				const regex = new RegExp(platform[0].urlPattern);
				if (!regex.test(parsed.data.url)) {
					return c.json({ error: ERROR_MESSAGES.URL_PATTERN_MISMATCH }, 400);
				}
			} catch (e) {
				// 無効な正規表現パターンの場合はスキップ
				console.error("Invalid URL pattern:", platform[0].urlPattern, e);
			}
		}

		// 作成
		const result = await db.insert(circleLinks).values(parsed.data).returning();
		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/circles/:circleId/links");
	}
});

// サークルリンク更新
circlesRouter.put("/:circleId/links/:linkId", async (c) => {
	try {
		const circleId = c.req.param("circleId");
		const linkId = c.req.param("linkId");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(circleLinks)
			.where(
				and(eq(circleLinks.id, linkId), eq(circleLinks.circleId, circleId)),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// biome-ignore lint/style/noNonNullAssertion: existing.length > 0 is guaranteed by the check above
		const existingLink = existing[0]!;

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingLink,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateCircleLinkSchema.safeParse(updateData);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// URL重複チェック（同一サークル内、自身以外）
		if (parsed.data.url) {
			const existingUrl = await db
				.select()
				.from(circleLinks)
				.where(
					and(
						eq(circleLinks.circleId, circleId),
						eq(circleLinks.url, parsed.data.url),
					),
				)
				.limit(1);

			if (existingUrl.length > 0 && existingUrl[0]?.id !== linkId) {
				return c.json(
					{ error: ERROR_MESSAGES.URL_ALREADY_EXISTS_FOR_CIRCLE },
					409,
				);
			}
		}

		// URLまたはplatformCodeが更新される場合、URLパターンバリデーション
		if (parsed.data.url || parsed.data.platformCode) {
			const platformCode =
				parsed.data.platformCode || existingLink.platformCode;
			const url = parsed.data.url || existingLink.url;

			const platform = await db
				.select({ urlPattern: platforms.urlPattern })
				.from(platforms)
				.where(eq(platforms.code, platformCode))
				.limit(1);

			if (platform[0]?.urlPattern) {
				try {
					const regex = new RegExp(platform[0].urlPattern);
					if (!regex.test(url)) {
						return c.json({ error: ERROR_MESSAGES.URL_PATTERN_MISMATCH }, 400);
					}
				} catch (e) {
					// 無効な正規表現パターンの場合はスキップ
					console.error("Invalid URL pattern:", platform[0].urlPattern, e);
				}
			}
		}

		// 更新
		const result = await db
			.update(circleLinks)
			.set(parsed.data)
			.where(eq(circleLinks.id, linkId))
			.returning();
		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/circles/:circleId/links/:linkId",
		);
	}
});

// サークルリンク削除
circlesRouter.delete("/:circleId/links/:linkId", async (c) => {
	try {
		const circleId = c.req.param("circleId");
		const linkId = c.req.param("linkId");

		// 存在チェック
		const existing = await db
			.select()
			.from(circleLinks)
			.where(
				and(eq(circleLinks.id, linkId), eq(circleLinks.circleId, circleId)),
			)
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.CIRCLE_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(circleLinks).where(eq(circleLinks.id, linkId));

		return c.json({ success: true, id: linkId });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/circles/:circleId/links/:linkId",
		);
	}
});

// サークル一括削除
circlesRouter.delete("/batch", async (c) => {
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
					.from(circles)
					.where(eq(circles.id, id))
					.limit(1);

				if (existing.length === 0) {
					failed.push({
						id,
						error: ERROR_MESSAGES.CIRCLE_NOT_FOUND,
					});
					continue;
				}

				// 削除（関連リンクはCASCADE削除）
				await db.delete(circles).where(eq(circles.id, id));
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
		return handleDbError(c, error, "DELETE /admin/circles/batch");
	}
});

export { circlesRouter };
