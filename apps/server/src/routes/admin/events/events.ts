import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	eventDays,
	eventSeries,
	events,
	insertEventSchema,
	like,
	or,
	updateEventSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

const eventsRouter = new Hono<AdminContext>();

// イベント一覧取得（ページネーション、シリーズフィルタ、検索対応）
eventsRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const seriesId = c.req.query("seriesId");
		const search = c.req.query("search");
		const sortBy = c.req.query("sortBy") || "startDate";
		const sortOrder = c.req.query("sortOrder") || "asc";

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (seriesId) {
			conditions.push(eq(events.eventSeriesId, seriesId));
		}

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(
				or(like(events.name, searchPattern), like(events.venue, searchPattern)),
			);
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// ソートカラムを決定
		const sortColumnMap = {
			id: events.id,
			name: events.name,
			startDate: events.startDate,
			createdAt: events.createdAt,
			updatedAt: events.updatedAt,
		} as const;
		const sortColumn =
			sortColumnMap[sortBy as keyof typeof sortColumnMap] ?? events.startDate;
		const orderByClause =
			sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

		// データ取得（シリーズ名を含む）
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: events.id,
					eventSeriesId: events.eventSeriesId,
					name: events.name,
					edition: events.edition,
					totalDays: events.totalDays,
					venue: events.venue,
					startDate: events.startDate,
					endDate: events.endDate,
					createdAt: events.createdAt,
					updatedAt: events.updatedAt,
					seriesName: eventSeries.name,
				})
				.from(events)
				.leftJoin(eventSeries, eq(events.eventSeriesId, eventSeries.id))
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(orderByClause),
			db.select({ count: count() }).from(events).where(whereCondition),
		]);

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/events");
	}
});

// イベント個別取得（開催日情報を含む）
eventsRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db
			.select({
				id: events.id,
				eventSeriesId: events.eventSeriesId,
				name: events.name,
				edition: events.edition,
				totalDays: events.totalDays,
				venue: events.venue,
				startDate: events.startDate,
				endDate: events.endDate,
				createdAt: events.createdAt,
				updatedAt: events.updatedAt,
				seriesName: eventSeries.name,
			})
			.from(events)
			.leftJoin(eventSeries, eq(events.eventSeriesId, eventSeries.id))
			.where(eq(events.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		// 関連開催日を取得（日番号順）
		const days = await db
			.select()
			.from(eventDays)
			.where(eq(eventDays.eventId, id))
			.orderBy(eventDays.dayNumber);

		return c.json({
			...result[0],
			days,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/events/:id");
	}
});

// イベント新規作成
eventsRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertEventSchema.safeParse(body);
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
			.from(events)
			.where(eq(events.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// シリーズ存在チェック（eventSeriesIdが指定されている場合のみ）
		if (parsed.data.eventSeriesId) {
			const existingSeries = await db
				.select()
				.from(eventSeries)
				.where(eq(eventSeries.id, parsed.data.eventSeriesId))
				.limit(1);

			if (existingSeries.length === 0) {
				return c.json({ error: ERROR_MESSAGES.EVENT_SERIES_NOT_FOUND }, 404);
			}

			// 回次重複チェック（同一シリーズ内）
			if (parsed.data.edition !== null && parsed.data.edition !== undefined) {
				const existingEdition = await db
					.select()
					.from(events)
					.where(
						and(
							eq(events.eventSeriesId, parsed.data.eventSeriesId),
							eq(events.edition, parsed.data.edition),
						),
					)
					.limit(1);

				if (existingEdition.length > 0) {
					return c.json({ error: ERROR_MESSAGES.EDITION_ALREADY_EXISTS }, 409);
				}
			}
		}

		// 作成
		const result = await db.insert(events).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/events");
	}
});

// イベント更新
eventsRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(events)
			.where(eq(events.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		// biome-ignore lint/style/noNonNullAssertion: existing.length > 0 is guaranteed by the check above
		const existingEvent = existing[0]!;

		// バリデーション
		const parsed = updateEventSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// シリーズ存在チェック（変更がある場合）
		if (parsed.data.eventSeriesId) {
			const existingSeries = await db
				.select()
				.from(eventSeries)
				.where(eq(eventSeries.id, parsed.data.eventSeriesId))
				.limit(1);

			if (existingSeries.length === 0) {
				return c.json({ error: ERROR_MESSAGES.EVENT_SERIES_NOT_FOUND }, 404);
			}
		}

		// 回次重複チェック（同一シリーズ内、自身以外）
		const targetEdition = parsed.data.edition ?? existingEvent.edition;
		const targetSeriesId =
			parsed.data.eventSeriesId ?? existingEvent.eventSeriesId;

		// シリーズが指定されていて、回次がある場合のみ重複チェック
		if (
			targetSeriesId &&
			targetEdition !== null &&
			targetEdition !== undefined
		) {
			const existingEdition = await db
				.select()
				.from(events)
				.where(
					and(
						eq(events.eventSeriesId, targetSeriesId),
						eq(events.edition, targetEdition),
					),
				)
				.limit(1);

			if (existingEdition.length > 0 && existingEdition[0]?.id !== id) {
				return c.json({ error: ERROR_MESSAGES.EDITION_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(events)
			.set(parsed.data)
			.where(eq(events.id, id))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/events/:id");
	}
});

// イベント削除（開催日はCASCADE削除）
eventsRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(events)
			.where(eq(events.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		// 削除（開催日はCASCADE削除）
		await db.delete(events).where(eq(events.id, id));

		return c.json({ success: true, id });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/events/:id");
	}
});

export { eventsRouter };
