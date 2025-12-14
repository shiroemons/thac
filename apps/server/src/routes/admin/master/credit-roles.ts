import {
	creditRoles,
	db,
	eq,
	insertCreditRoleSchema,
	updateCreditRoleSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const creditRolesRouter = new Hono<AdminContext>();

// 一覧取得
creditRolesRouter.get("/", async (c) => {
	const data = await db.select().from(creditRoles).orderBy(creditRoles.code);

	return c.json({
		data,
		total: data.length,
	});
});

// 個別取得
creditRolesRouter.get("/:code", async (c) => {
	const code = c.req.param("code");

	const result = await db
		.select()
		.from(creditRoles)
		.where(eq(creditRoles.code, code))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
creditRolesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertCreditRoleSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 重複チェック
	const existing = await db
		.select()
		.from(creditRoles)
		.where(eq(creditRoles.code, parsed.data.code))
		.limit(1);

	if (existing.length > 0) {
		return c.json({ error: "Code already exists" }, 409);
	}

	// 作成
	const result = await db.insert(creditRoles).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
creditRolesRouter.put("/:code", async (c) => {
	const code = c.req.param("code");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(creditRoles)
		.where(eq(creditRoles.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateCreditRoleSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 更新
	const result = await db
		.update(creditRoles)
		.set(parsed.data)
		.where(eq(creditRoles.code, code))
		.returning();

	return c.json(result[0]);
});

// 削除
creditRolesRouter.delete("/:code", async (c) => {
	const code = c.req.param("code");

	// 存在チェック
	const existing = await db
		.select()
		.from(creditRoles)
		.where(eq(creditRoles.code, code))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(creditRoles).where(eq(creditRoles.code, code));

	return c.json({ success: true });
});

export { creditRolesRouter };
