import {
	and,
	db,
	eq,
	insertReleaseJanCodeSchema,
	releaseJanCodes,
	releases,
	updateReleaseJanCodeSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

/**
 * リリースのJANコード一覧を取得する関数
 * 統合エンドポイント用にロジックを分離
 */
export async function getReleaseJanCodes(releaseId: string) {
	// JANコード一覧取得
	const janCodes = await db
		.select()
		.from(releaseJanCodes)
		.where(eq(releaseJanCodes.releaseId, releaseId));

	return janCodes;
}

const releaseJanCodesRouter = new Hono<AdminContext>();

// リリースのJANコード一覧取得
releaseJanCodesRouter.get("/:releaseId/jan-codes", async (c) => {
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

		const result = await getReleaseJanCodes(releaseId);
		return c.json(result);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases/:releaseId/jan-codes");
	}
});

// JANコード追加
releaseJanCodesRouter.post("/:releaseId/jan-codes", async (c) => {
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

		// バリデーション
		const parsed = insertReleaseJanCodeSchema.safeParse({
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
			.from(releaseJanCodes)
			.where(eq(releaseJanCodes.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// JANコードのグローバル一意性チェック
		const janDuplicateCheck = await db
			.select()
			.from(releaseJanCodes)
			.where(eq(releaseJanCodes.janCode, parsed.data.janCode))
			.limit(1);

		if (janDuplicateCheck.length > 0) {
			return c.json({ error: ERROR_MESSAGES.JAN_CODE_ALREADY_EXISTS }, 409);
		}

		// isPrimary制約チェック（同一リリース内でisPrimaryは1件のみ）
		if (parsed.data.isPrimary) {
			const primaryCheck = await db
				.select()
				.from(releaseJanCodes)
				.where(
					and(
						eq(releaseJanCodes.releaseId, releaseId),
						eq(releaseJanCodes.isPrimary, true),
					),
				)
				.limit(1);

			if (primaryCheck.length > 0) {
				return c.json(
					{ error: ERROR_MESSAGES.PRIMARY_JAN_CODE_ALREADY_EXISTS },
					409,
				);
			}
		}

		// 作成
		const result = await db
			.insert(releaseJanCodes)
			.values(parsed.data)
			.returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/releases/:releaseId/jan-codes");
	}
});

// JANコード更新
releaseJanCodesRouter.put("/:releaseId/jan-codes/:id", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const id = c.req.param("id");
		const body = await c.req.json();

		// JANコード存在チェック
		const existingJanCode = await db
			.select()
			.from(releaseJanCodes)
			.where(
				and(
					eq(releaseJanCodes.id, id),
					eq(releaseJanCodes.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingJanCode.length === 0) {
			return c.json({ error: ERROR_MESSAGES.JAN_CODE_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateReleaseJanCodeSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// isPrimary変更時の制約チェック
		if (parsed.data.isPrimary) {
			const primaryCheck = await db
				.select()
				.from(releaseJanCodes)
				.where(
					and(
						eq(releaseJanCodes.releaseId, releaseId),
						eq(releaseJanCodes.isPrimary, true),
					),
				)
				.limit(1);

			if (primaryCheck.length > 0 && primaryCheck[0]?.id !== id) {
				return c.json(
					{ error: ERROR_MESSAGES.PRIMARY_JAN_CODE_ALREADY_EXISTS },
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(releaseJanCodes)
			.set(parsed.data)
			.where(eq(releaseJanCodes.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/releases/:releaseId/jan-codes/:id",
		);
	}
});

// JANコード削除
releaseJanCodesRouter.delete("/:releaseId/jan-codes/:id", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const id = c.req.param("id");

		// JANコード存在チェック
		const existingJanCode = await db
			.select()
			.from(releaseJanCodes)
			.where(
				and(
					eq(releaseJanCodes.id, id),
					eq(releaseJanCodes.releaseId, releaseId),
				),
			)
			.limit(1);

		if (existingJanCode.length === 0) {
			return c.json({ error: ERROR_MESSAGES.JAN_CODE_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(releaseJanCodes).where(eq(releaseJanCodes.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/releases/:releaseId/jan-codes/:id",
		);
	}
});

export { releaseJanCodesRouter };
