import {
	and,
	db,
	discs,
	eq,
	insertDiscSchema,
	releases,
	updateDiscSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const discsRouter = new Hono<AdminContext>();

// リリースのディスク一覧取得（ディスク番号順）
discsRouter.get("/:releaseId/discs", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");

		// リリース存在チェック
		const existingRelease = await db
			.select()
			.from(releases)
			.where(eq(releases.id, releaseId))
			.limit(1);

		if (existingRelease.length === 0) {
			return c.json({ error: "Release not found" }, 404);
		}

		const releaseDiscs = await db
			.select()
			.from(discs)
			.where(eq(discs.releaseId, releaseId))
			.orderBy(discs.discNumber);

		return c.json(releaseDiscs);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases/:releaseId/discs");
	}
});

// ディスク追加
discsRouter.post("/:releaseId/discs", async (c) => {
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
			return c.json({ error: "Release not found" }, 404);
		}

		// バリデーション
		const parsed = insertDiscSchema.safeParse({
			...body,
			releaseId,
		});
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// ID重複チェック
		const existingId = await db
			.select()
			.from(discs)
			.where(eq(discs.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: "ID already exists" }, 409);
		}

		// ディスク番号重複チェック（同一リリース内）
		const existingDiscNumber = await db
			.select()
			.from(discs)
			.where(
				and(
					eq(discs.releaseId, releaseId),
					eq(discs.discNumber, parsed.data.discNumber),
				),
			)
			.limit(1);

		if (existingDiscNumber.length > 0) {
			return c.json(
				{ error: "Disc number already exists for this release" },
				409,
			);
		}

		// 作成
		const result = await db.insert(discs).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/releases/:releaseId/discs");
	}
});

// ディスク更新
discsRouter.put("/:releaseId/discs/:discId", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const discId = c.req.param("discId");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(discs)
			.where(and(eq(discs.id, discId), eq(discs.releaseId, releaseId)))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// バリデーション
		const parsed = updateDiscSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: "Validation failed",
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// ディスク番号重複チェック（同一リリース内、自身以外）
		if (parsed.data.discNumber !== undefined) {
			const existingDiscNumber = await db
				.select()
				.from(discs)
				.where(
					and(
						eq(discs.releaseId, releaseId),
						eq(discs.discNumber, parsed.data.discNumber),
					),
				)
				.limit(1);

			if (
				existingDiscNumber.length > 0 &&
				existingDiscNumber[0]?.id !== discId
			) {
				return c.json(
					{ error: "Disc number already exists for this release" },
					409,
				);
			}
		}

		// 更新
		const result = await db
			.update(discs)
			.set(parsed.data)
			.where(eq(discs.id, discId))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(
			c,
			error,
			"PUT /admin/releases/:releaseId/discs/:discId",
		);
	}
});

// ディスク削除
discsRouter.delete("/:releaseId/discs/:discId", async (c) => {
	try {
		const releaseId = c.req.param("releaseId");
		const discId = c.req.param("discId");

		// 存在チェック
		const existing = await db
			.select()
			.from(discs)
			.where(and(eq(discs.id, discId), eq(discs.releaseId, releaseId)))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: "Not found" }, 404);
		}

		// 削除
		await db.delete(discs).where(eq(discs.id, discId));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(
			c,
			error,
			"DELETE /admin/releases/:releaseId/discs/:discId",
		);
	}
});

export { discsRouter };
