import {
	albumRequests,
	count,
	db,
	desc,
	eq,
	releases,
	updateAlbumRequestStatusSchema,
	user,
} from "@thac/db";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { checkOptimisticLockConflict } from "../../../utils/conflict-check";

const albumRequestsAdminRouter = new Hono<AdminContext>();

// バッジ用 pending 件数取得（Cache-Control: private, max-age=30）
albumRequestsAdminRouter.get("/pending-count", async (c) => {
	try {
		const result = await db
			.select({ count: count() })
			.from(albumRequests)
			.where(eq(albumRequests.status, "pending"));

		c.header("Cache-Control", "private, max-age=30");

		return c.json({ count: Number(result[0]?.count ?? 0) });
	} catch (error) {
		return handleDbError(c, error, "GET /admin/album-requests/pending-count");
	}
});

// アルバム申請一覧取得（status フィルタ、ページネーション対応）
albumRequestsAdminRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const status = c.req.query("status");
		const offset = (page - 1) * limit;

		const submitter = alias(user, "submitter");

		const whereCondition = status
			? eq(albumRequests.status, status)
			: undefined;

		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: albumRequests.id,
					requestType: albumRequests.requestType,
					albumName: albumRequests.albumName,
					circleName: albumRequests.circleName,
					referenceUrls: albumRequests.referenceUrls,
					notes: albumRequests.notes,
					status: albumRequests.status,
					reviewerNotes: albumRequests.reviewerNotes,
					reviewedAt: albumRequests.reviewedAt,
					createdAt: albumRequests.createdAt,
					updatedAt: albumRequests.updatedAt,
					submittedBy: {
						id: submitter.id,
						name: submitter.name,
						email: submitter.email,
					},
					existingRelease: {
						id: releases.id,
						name: releases.name,
						nameJa: releases.nameJa,
						nameEn: releases.nameEn,
					},
				})
				.from(albumRequests)
				.leftJoin(submitter, eq(albumRequests.userId, submitter.id))
				.leftJoin(releases, eq(albumRequests.existingReleaseId, releases.id))
				.where(whereCondition)
				.orderBy(desc(albumRequests.createdAt))
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(albumRequests).where(whereCondition),
		]);

		const total = Number(totalResult[0]?.count ?? 0);

		return c.json({
			data,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/album-requests");
	}
});

// アルバム申請詳細取得（user / reviewer / existingRelease を JOIN）
albumRequestsAdminRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const submitter = alias(user, "submitter");
		const reviewer = alias(user, "reviewer");

		const result = await db
			.select({
				id: albumRequests.id,
				requestType: albumRequests.requestType,
				albumName: albumRequests.albumName,
				circleName: albumRequests.circleName,
				referenceUrls: albumRequests.referenceUrls,
				notes: albumRequests.notes,
				status: albumRequests.status,
				reviewerNotes: albumRequests.reviewerNotes,
				reviewedAt: albumRequests.reviewedAt,
				createdAt: albumRequests.createdAt,
				updatedAt: albumRequests.updatedAt,
				submittedBy: {
					id: submitter.id,
					name: submitter.name,
					email: submitter.email,
				},
				reviewer: {
					id: reviewer.id,
					name: reviewer.name,
					email: reviewer.email,
				},
				existingRelease: {
					id: releases.id,
					name: releases.name,
					nameJa: releases.nameJa,
					nameEn: releases.nameEn,
					releaseDate: releases.releaseDate,
				},
			})
			.from(albumRequests)
			.leftJoin(submitter, eq(albumRequests.userId, submitter.id))
			.leftJoin(reviewer, eq(albumRequests.reviewedByUserId, reviewer.id))
			.leftJoin(releases, eq(albumRequests.existingReleaseId, releases.id))
			.where(eq(albumRequests.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: "アルバム申請が見つかりません" }, 404);
		}

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/album-requests/:id");
	}
});

// アルバム申請ステータス更新（楽観的ロック付きトランザクション）
albumRequestsAdminRouter.patch("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// バリデーション
		const parsed = updateAlbumRequestStatusSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten(),
				},
				400,
			);
		}

		const updated = await db.transaction(async (tx) => {
			// 存在確認 + 楽観的ロック用の現在データ取得
			const existing = await tx
				.select({
					id: albumRequests.id,
					status: albumRequests.status,
					updatedAt: albumRequests.updatedAt,
				})
				.from(albumRequests)
				.where(eq(albumRequests.id, id))
				.limit(1);

			if (existing.length === 0) {
				return null;
			}

			const current = existing[0];

			// 楽観的ロックチェック
			const conflict = checkOptimisticLockConflict({
				requestUpdatedAt: parsed.data.updatedAt,
				currentEntity: current,
			});
			if (conflict) {
				return conflict;
			}

			// pending 以外は更新不可
			if (current?.status !== "pending") {
				return { __alreadyProcessed: true } as const;
			}

			// ステータス更新
			const result = await tx
				.update(albumRequests)
				.set({
					status: parsed.data.status,
					reviewerNotes: parsed.data.reviewerNotes ?? null,
					reviewedByUserId: c.get("user").id,
					reviewedAt: new Date(),
				})
				.where(eq(albumRequests.id, id))
				.returning();

			return result[0];
		});

		if (updated === null) {
			return c.json({ error: "アルバム申請が見つかりません" }, 404);
		}

		// 楽観的ロック競合
		if (updated && "error" in updated && "code" in updated) {
			return c.json(updated, 409);
		}

		// 既処理チェック
		if (updated && "__alreadyProcessed" in updated) {
			return c.json({ error: "このリクエストは既に処理済みです" }, 400);
		}

		return c.json(updated, 200);
	} catch (error) {
		return handleDbError(c, error, "PATCH /admin/album-requests/:id");
	}
});

export { albumRequestsAdminRouter };
