import {
	count,
	db,
	eq,
	eventSeries,
	events,
	insertEventSeriesSchema,
	like,
	sql,
	updateEventSeriesSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const eventSeriesRouter = new Hono<AdminContext>();

// イベントシリーズ一覧取得（検索対応）
eventSeriesRouter.get("/", async (c) => {
	const search = c.req.query("search");

	// 条件を構築
	const whereCondition = search
		? like(eventSeries.name, `%${search}%`)
		: undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(eventSeries)
			.where(whereCondition)
			.orderBy(eventSeries.name),
		db.select({ count: count() }).from(eventSeries).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
	});
});

// イベントシリーズ新規作成
eventSeriesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertEventSeriesSchema.safeParse(body);
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
		.from(eventSeries)
		.where(eq(eventSeries.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// 名前重複チェック（大文字小文字無視）
	const existingName = await db
		.select()
		.from(eventSeries)
		.where(sql`lower(${eventSeries.name}) = lower(${parsed.data.name})`)
		.limit(1);

	if (existingName.length > 0) {
		return c.json({ error: "Name already exists" }, 409);
	}

	// 作成
	const result = await db.insert(eventSeries).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// イベントシリーズ更新
eventSeriesRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(eventSeries)
		.where(eq(eventSeries.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateEventSeriesSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 名前重複チェック（自身以外に同じ名前がある場合）
	if (parsed.data.name) {
		const existingName = await db
			.select()
			.from(eventSeries)
			.where(sql`lower(${eventSeries.name}) = lower(${parsed.data.name})`)
			.limit(1);

		if (existingName.length > 0 && existingName[0]?.id !== id) {
			return c.json({ error: "Name already exists" }, 409);
		}
	}

	// 更新
	const result = await db
		.update(eventSeries)
		.set(parsed.data)
		.where(eq(eventSeries.id, id))
		.returning();

	return c.json(result[0]);
});

// イベントシリーズ削除
eventSeriesRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(eventSeries)
		.where(eq(eventSeries.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// イベント紐付きチェック（RESTRICT制約）
	const linkedEvents = await db
		.select({ count: count() })
		.from(events)
		.where(eq(events.eventSeriesId, id));

	if ((linkedEvents[0]?.count ?? 0) > 0) {
		return c.json({ error: "Cannot delete series with linked events" }, 409);
	}

	// 削除
	await db.delete(eventSeries).where(eq(eventSeries.id, id));

	return c.json({ success: true });
});

export { eventSeriesRouter };
