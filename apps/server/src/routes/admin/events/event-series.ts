import {
	asc,
	count,
	db,
	desc,
	eq,
	eventSeries,
	events,
	insertEventSeriesSchema,
	like,
	max,
	sql,
	updateEventSeriesSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const eventSeriesRouter = new Hono<AdminContext>();

// イベントシリーズ一覧取得（検索対応）
eventSeriesRouter.get("/", async (c) => {
	const search = c.req.query("search");
	const sortBy = c.req.query("sortBy") || "sortOrder";
	const sortOrderParam = c.req.query("sortOrder") || "asc";

	// 条件を構築
	const whereCondition = search
		? like(eventSeries.name, `%${search}%`)
		: undefined;

	// ソート列のマッピング
	const sortColumnMap: Record<
		string,
		typeof eventSeries.sortOrder | typeof eventSeries.name
	> = {
		sortOrder: eventSeries.sortOrder,
		name: eventSeries.name,
	};
	const sortColumn = sortColumnMap[sortBy] || eventSeries.sortOrder;
	const orderFn = sortOrderParam === "desc" ? desc : asc;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(eventSeries)
			.where(whereCondition)
			.orderBy(orderFn(sortColumn), asc(eventSeries.name)),
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

	// sortOrderが明示的に指定されていない場合は自動設定（最大値 + 1）
	let sortOrder: number;
	if (body.sortOrder === undefined || body.sortOrder === null) {
		const maxResult = await db
			.select({ maxOrder: max(eventSeries.sortOrder) })
			.from(eventSeries);
		sortOrder = (maxResult[0]?.maxOrder ?? -1) + 1;
	} else {
		sortOrder = parsed.data.sortOrder ?? 0;
	}

	// 作成
	const result = await db
		.insert(eventSeries)
		.values({ ...parsed.data, sortOrder })
		.returning();

	return c.json(result[0], 201);
});

// ソート順序の一括更新（/:id より先に定義する必要がある）
eventSeriesRouter.put("/reorder", async (c) => {
	const body = await c.req.json();

	// バリデーション: { items: [{ id: string, sortOrder: number }] }
	if (!body.items || !Array.isArray(body.items)) {
		return c.json({ error: "items array is required" }, 400);
	}

	// 各アイテムのソート順序を更新
	for (const item of body.items) {
		if (!item.id || typeof item.sortOrder !== "number") {
			return c.json({ error: "Each item must have id and sortOrder" }, 400);
		}
		await db
			.update(eventSeries)
			.set({ sortOrder: item.sortOrder })
			.where(eq(eventSeries.id, item.id));
	}

	return c.json({ success: true });
});

// イベントシリーズ詳細取得（所属イベント一覧を含む）
eventSeriesRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	// イベントシリーズ取得
	const series = await db
		.select()
		.from(eventSeries)
		.where(eq(eventSeries.id, id))
		.limit(1);

	if (series.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 所属イベント一覧取得（回次順）
	const seriesEvents = await db
		.select()
		.from(events)
		.where(eq(events.eventSeriesId, id))
		.orderBy(asc(events.edition));

	return c.json({
		...series[0],
		events: seriesEvents,
	});
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
