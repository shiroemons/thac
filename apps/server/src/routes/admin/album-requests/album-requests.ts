import {
	albumRequests,
	and,
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

		const [rows, totalResult] = await Promise.all([
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
					existingReleaseId: releases.id,
					existingReleaseName: releases.name,
					existingReleaseNameJa: releases.nameJa,
					existingReleaseNameEn: releases.nameEn,
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

		const data = rows.map((row) => ({
			id: row.id,
			requestType: row.requestType,
			albumName: row.albumName,
			circleName: row.circleName,
			referenceUrls: row.referenceUrls,
			notes: row.notes,
			status: row.status,
			reviewerNotes: row.reviewerNotes,
			reviewedAt: row.reviewedAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			submittedBy: row.submittedBy,
			existingRelease:
				row.existingReleaseId !== null
					? {
							id: row.existingReleaseId,
							name: row.existingReleaseName,
							nameJa: row.existingReleaseNameJa,
							nameEn: row.existingReleaseNameEn,
						}
					: null,
		}));

		const total = Number(totalResult[0]?.count ?? 0);

		return c.json({
			data,
			total,
			page,
			limit,
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

		const rows = await db
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
				existingReleaseId: releases.id,
				existingReleaseName: releases.name,
				existingReleaseNameJa: releases.nameJa,
				existingReleaseNameEn: releases.nameEn,
				existingReleaseDate: releases.releaseDate,
			})
			.from(albumRequests)
			.leftJoin(submitter, eq(albumRequests.userId, submitter.id))
			.leftJoin(reviewer, eq(albumRequests.reviewedByUserId, reviewer.id))
			.leftJoin(releases, eq(albumRequests.existingReleaseId, releases.id))
			.where(eq(albumRequests.id, id))
			.limit(1);

		const row = rows[0];
		if (!row) {
			return c.json({ error: "アルバム申請が見つかりません" }, 404);
		}

		const result = {
			id: row.id,
			requestType: row.requestType,
			albumName: row.albumName,
			circleName: row.circleName,
			referenceUrls: row.referenceUrls,
			notes: row.notes,
			status: row.status,
			reviewerNotes: row.reviewerNotes,
			reviewedAt: row.reviewedAt,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			submittedBy: row.submittedBy,
			reviewer: row.reviewer,
			existingRelease:
				row.existingReleaseId !== null
					? {
							id: row.existingReleaseId,
							name: row.existingReleaseName,
							nameJa: row.existingReleaseNameJa,
							nameEn: row.existingReleaseNameEn,
							releaseDate: row.existingReleaseDate,
						}
					: null,
		};

		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/album-requests/:id");
	}
});

// 内部処理結果の型（discriminated union）
type PatchResult =
	| { kind: "notFound" }
	| { kind: "conflict"; id: string; status: string; updatedAt: Date | null }
	| { kind: "alreadyProcessed" }
	| { kind: "success"; data: Record<string, unknown> };

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

		const result = await db.transaction(async (tx): Promise<PatchResult> => {
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

			const current = existing[0];

			if (!current) {
				return { kind: "notFound" };
			}

			// 楽観的ロックチェック
			const conflict = checkOptimisticLockConflict({
				requestUpdatedAt: parsed.data.updatedAt,
				currentEntity: current,
			});
			if (conflict) {
				// 公開可能なフィールドのみ返す
				return {
					kind: "conflict",
					id: current.id,
					status: current.status,
					updatedAt: current.updatedAt,
				};
			}

			// pending 以外は更新不可
			// WHERE に status='pending' を AND することで DB レベルでも競合を防ぐ
			const updated = await tx
				.update(albumRequests)
				.set({
					status: parsed.data.status,
					reviewerNotes: parsed.data.reviewerNotes ?? null,
					reviewedByUserId: c.get("user").id,
					reviewedAt: new Date(),
				})
				.where(
					and(eq(albumRequests.id, id), eq(albumRequests.status, "pending")),
				)
				.returning();

			if (updated.length === 0) {
				// UPDATE が 0 件 = すでに pending 以外に遷移済み
				return { kind: "alreadyProcessed" };
			}

			return { kind: "success", data: updated[0] as Record<string, unknown> };
		});

		if (result.kind === "notFound") {
			return c.json({ error: "アルバム申請が見つかりません" }, 404);
		}

		if (result.kind === "conflict") {
			return c.json(
				{
					error: "他のユーザーによってデータが更新されました",
					code: "CONFLICT",
					current: {
						id: result.id,
						status: result.status,
						updatedAt: result.updatedAt,
					},
				},
				409,
			);
		}

		if (result.kind === "alreadyProcessed") {
			return c.json({ error: "このリクエストは既に処理済みです" }, 400);
		}

		return c.json(result.data, 200);
	} catch (error) {
		return handleDbError(c, error, "PATCH /admin/album-requests/:id");
	}
});

export { albumRequestsAdminRouter };
