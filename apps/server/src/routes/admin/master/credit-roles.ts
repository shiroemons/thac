import {
	count,
	creditRoles,
	db,
	eq,
	insertCreditRoleSchema,
	like,
	or,
	updateCreditRoleSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const creditRolesRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、検索対応）
creditRolesRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const whereCondition = search
		? or(
				like(creditRoles.code, `%${search}%`),
				like(creditRoles.label, `%${search}%`),
			)
		: undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(creditRoles)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(creditRoles.code),
		db.select({ count: count() }).from(creditRoles).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
		page,
		limit,
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
