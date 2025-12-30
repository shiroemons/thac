import {
	and,
	creditRoles,
	db,
	eq,
	insertTrackCreditRoleSchema,
	trackCreditRoles,
	trackCredits,
	tracks,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const trackCreditRolesRouter = new Hono<AdminContext>();

// 役割追加
trackCreditRolesRouter.post(
	"/:releaseId/tracks/:trackId/credits/:creditId/roles",
	async (c) => {
		try {
			const releaseId = c.req.param("releaseId");
			const trackId = c.req.param("trackId");
			const creditId = c.req.param("creditId");
			const body = await c.req.json();

			// クレジット存在チェック（トラック・リリースとの関連確認含む）
			const existingCredit = await db
				.select()
				.from(trackCredits)
				.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
				.where(
					and(
						eq(trackCredits.id, creditId),
						eq(trackCredits.trackId, trackId),
						eq(tracks.releaseId, releaseId),
					),
				)
				.limit(1);

			if (existingCredit.length === 0) {
				return c.json({ error: ERROR_MESSAGES.CREDIT_NOT_FOUND }, 404);
			}

			// 役割マスター存在チェック
			const existingRole = await db
				.select()
				.from(creditRoles)
				.where(eq(creditRoles.code, body.roleCode))
				.limit(1);

			if (existingRole.length === 0) {
				return c.json({ error: ERROR_MESSAGES.ROLE_NOT_FOUND_IN_MASTER }, 400);
			}

			// バリデーション
			const parsed = insertTrackCreditRoleSchema.safeParse({
				...body,
				trackCreditId: creditId,
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

			// 重複チェック（同一クレジット・同一役割・同一表示順）
			const existingRoleAssignment = await db
				.select()
				.from(trackCreditRoles)
				.where(
					and(
						eq(trackCreditRoles.trackCreditId, creditId),
						eq(trackCreditRoles.roleCode, parsed.data.roleCode),
						eq(trackCreditRoles.rolePosition, parsed.data.rolePosition),
					),
				)
				.limit(1);

			if (existingRoleAssignment.length > 0) {
				return c.json(
					{
						error: ERROR_MESSAGES.ROLE_ALREADY_EXISTS_FOR_CREDIT,
					},
					409,
				);
			}

			// 作成
			await db.insert(trackCreditRoles).values(parsed.data);

			// 役割情報を含めて返却
			const roleWithInfo = await db
				.select({
					trackCreditId: trackCreditRoles.trackCreditId,
					roleCode: trackCreditRoles.roleCode,
					rolePosition: trackCreditRoles.rolePosition,
					role: creditRoles,
				})
				.from(trackCreditRoles)
				.leftJoin(creditRoles, eq(trackCreditRoles.roleCode, creditRoles.code))
				.where(
					and(
						eq(trackCreditRoles.trackCreditId, creditId),
						eq(trackCreditRoles.roleCode, parsed.data.roleCode),
						eq(trackCreditRoles.rolePosition, parsed.data.rolePosition),
					),
				)
				.limit(1);

			return c.json(roleWithInfo[0], 201);
		} catch (error) {
			return handleDbError(
				c,
				error,
				"POST /admin/releases/:releaseId/tracks/:trackId/credits/:creditId/roles",
			);
		}
	},
);

// 役割削除
trackCreditRolesRouter.delete(
	"/:releaseId/tracks/:trackId/credits/:creditId/roles/:roleCode/:rolePosition",
	async (c) => {
		try {
			const releaseId = c.req.param("releaseId");
			const trackId = c.req.param("trackId");
			const creditId = c.req.param("creditId");
			const roleCode = c.req.param("roleCode");
			const rolePosition = Number.parseInt(c.req.param("rolePosition"), 10);

			if (Number.isNaN(rolePosition)) {
				return c.json({ error: ERROR_MESSAGES.INVALID_ROLE_POSITION }, 400);
			}

			// クレジット存在チェック（トラック・リリースとの関連確認含む）
			const existingCredit = await db
				.select()
				.from(trackCredits)
				.innerJoin(tracks, eq(trackCredits.trackId, tracks.id))
				.where(
					and(
						eq(trackCredits.id, creditId),
						eq(trackCredits.trackId, trackId),
						eq(tracks.releaseId, releaseId),
					),
				)
				.limit(1);

			if (existingCredit.length === 0) {
				return c.json({ error: ERROR_MESSAGES.CREDIT_NOT_FOUND }, 404);
			}

			// 役割存在チェック
			const existingRoleAssignment = await db
				.select()
				.from(trackCreditRoles)
				.where(
					and(
						eq(trackCreditRoles.trackCreditId, creditId),
						eq(trackCreditRoles.roleCode, roleCode),
						eq(trackCreditRoles.rolePosition, rolePosition),
					),
				)
				.limit(1);

			if (existingRoleAssignment.length === 0) {
				return c.json({ error: ERROR_MESSAGES.ROLE_NOT_FOUND }, 404);
			}

			// 削除
			await db
				.delete(trackCreditRoles)
				.where(
					and(
						eq(trackCreditRoles.trackCreditId, creditId),
						eq(trackCreditRoles.roleCode, roleCode),
						eq(trackCreditRoles.rolePosition, rolePosition),
					),
				);

			return c.json({ success: true, id: roleCode });
		} catch (error) {
			return handleDbError(
				c,
				error,
				"DELETE /admin/releases/:releaseId/tracks/:trackId/credits/:creditId/roles/:roleCode/:rolePosition",
			);
		}
	},
);

export { trackCreditRolesRouter };
