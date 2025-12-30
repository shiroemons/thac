import {
	and,
	db,
	eq,
	insertReleasePublicationSchema,
	platforms,
	releasePublications,
	releases,
	updateReleasePublicationSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

/**
 * リリースの公開リンク一覧を取得する関数
 * 統合エンドポイント用にロジックを分離
 */
export async function getReleasePublications(releaseId: string) {
	// 公開リンク一覧取得（プラットフォーム情報を結合）
	const publications = await db
		.select({
			publication: releasePublications,
			platform: platforms,
		})
		.from(releasePublications)
		.leftJoin(platforms, eq(releasePublications.platformCode, platforms.code))
		.where(eq(releasePublications.releaseId, releaseId));

	return publications.map((row) => ({
		...row.publication,
		platform: row.platform,
	}));
}

const releasePublicationsRouter = new Hono<AdminContext>();

// リリースの公開リンク一覧取得
releasePublicationsRouter.get("/:releaseId/publications", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");

		// リリース存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		const result = await getReleasePublications(releaseId);
		return c.json(result);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"GET /admin/releases/:releaseId/publications",
		);
	}
});

// 公開リンク追加
releasePublicationsRouter.post("/:releaseId/publications", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const body = await c.req.json();

		// リリース存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		// プラットフォーム存在チェック
		const existingPlatform = await db
			.select()
			.from(platforms)
			.where(eq(platforms.code, body.platformCode))
			.limit(1);

		if (existingPlatform.length === 0) {
			return c.json({ error: ERROR_MESSAGES.PLATFORM_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = insertReleasePublicationSchema.safeParse({
			...body,
			releaseId,
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
			.from(releasePublications)
			.where(eq(releasePublications.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// URL重複チェック
		const urlDuplicateCheck = await db
			.select()
			.from(releasePublications)
			.where(eq(releasePublications.url, parsed.data.url))
			.limit(1);

		if (urlDuplicateCheck.length > 0) {
			return c.json({ error: ERROR_MESSAGES.URL_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db
			.insert(releasePublications)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"POST /admin/releases/:releaseId/publications",
		);
	}
});

// 公開リンク更新
releasePublicationsRouter.put("/:releaseId/publications/:id", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const id = c.req.param("id");
		const body = await c.req.json();

		// 公開リンク存在チェック
		const existingPublication = await db
			.select()
			.from(releasePublications)
			.where(
				and(
					eq(releasePublications.id, id),
					eq(releasePublications.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingPublication.length === 0) {
			return c.json({ error: ERROR_MESSAGES.PUBLICATION_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateReleasePublicationSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// URL重複チェック（自分自身以外で）
		if (parsed.data.url) {
			const urlDuplicateCheck = await db
				.select()
				.from(releasePublications)
				.where(eq(releasePublications.url, parsed.data.url))
				.limit(1);

			if (urlDuplicateCheck.length > 0 && urlDuplicateCheck[0]?.id !== id) {
				return c.json({ error: ERROR_MESSAGES.URL_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(releasePublications)
			.set(parsed.data)
			.where(eq(releasePublications.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/releases/:releaseId/publications/:id",
		);
	}
});

// 公開リンク削除
releasePublicationsRouter.delete("/:releaseId/publications/:id", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const id = c.req.param("id");

		// 公開リンク存在チェック
		const existingPublication = await db
			.select()
			.from(releasePublications)
			.where(
				and(
					eq(releasePublications.id, id),
					eq(releasePublications.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingPublication.length === 0) {
			return c.json({ error: ERROR_MESSAGES.PUBLICATION_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(releasePublications).where(eq(releasePublications.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/releases/:releaseId/publications/:id",
		);
	}
});

export { releasePublicationsRouter };
