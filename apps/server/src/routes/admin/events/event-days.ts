import {
	and,
	db,
	eq,
	eventDays,
	events,
	insertEventDaySchema,
	updateEventDaySchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";
import { checkOptimisticLockConflict } from "../../../utils/conflict-check";

const eventDaysRouter = new Hono<AdminContext>();

// イベントの開催日一覧取得（日番号順）
eventDaysRouter.get("/:eventId/days", async (c) => {
	try {
		const eventId = c.req.param("eventId");

		// イベント存在チェック
		const existingEvent = await db
			.select()
			.from(events)
			.where(eq(events.id, eventId))
			.limit(1);

		if (existingEvent.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		const days = await db
			.select()
			.from(eventDays)
			.where(eq(eventDays.eventId, eventId))
			.orderBy(eventDays.dayNumber);

		return c.json(days);
	} catch (error) {
		return handleDbError(c, error, "GET /admin/events/:eventId/days");
	}
});

// 開催日追加
eventDaysRouter.post("/:eventId/days", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const body = await c.req.json();

		// イベント存在チェック
		const existingEvent = await db
			.select()
			.from(events)
			.where(eq(events.id, eventId))
			.limit(1);

		if (existingEvent.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = insertEventDaySchema.safeParse({
			...body,
			eventId,
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
			.from(eventDays)
			.where(eq(eventDays.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// 日番号重複チェック（同一イベント内）
		const existingDayNumber = await db
			.select()
			.from(eventDays)
			.where(
				and(
					eq(eventDays.eventId, eventId),
					eq(eventDays.dayNumber, parsed.data.dayNumber),
				),
			)
			.limit(1);

		if (existingDayNumber.length > 0) {
			return c.json({ error: ERROR_MESSAGES.DAY_NUMBER_ALREADY_EXISTS }, 409);
		}

		// 日付重複チェック（同一イベント内）
		const existingDate = await db
			.select()
			.from(eventDays)
			.where(
				and(
					eq(eventDays.eventId, eventId),
					eq(eventDays.date, parsed.data.date),
				),
			)
			.limit(1);

		if (existingDate.length > 0) {
			return c.json({ error: ERROR_MESSAGES.DATE_ALREADY_EXISTS }, 409);
		}

		// 作成
		const result = await db.insert(eventDays).values(parsed.data).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/events/:eventId/days");
	}
});

// 開催日更新
eventDaysRouter.put("/:eventId/days/:dayId", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const dayId = c.req.param("dayId");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(eventDays)
			.where(and(eq(eventDays.id, dayId), eq(eventDays.eventId, eventId)))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_DAY_NOT_FOUND }, 404);
		}

		const existingDay = existing[0];

		// 楽観的ロック: updatedAtの競合チェック
		const conflict = checkOptimisticLockConflict({
			requestUpdatedAt: body.updatedAt,
			currentEntity: existingDay,
		});
		if (conflict) {
			return c.json(conflict, 409);
		}

		// バリデーション（updatedAtを除外）
		const { updatedAt: _, ...updateData } = body;
		const parsed = updateEventDaySchema.safeParse(updateData);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// 日番号重複チェック（同一イベント内、自身以外）
		if (parsed.data.dayNumber !== undefined) {
			const existingDayNumber = await db
				.select()
				.from(eventDays)
				.where(
					and(
						eq(eventDays.eventId, eventId),
						eq(eventDays.dayNumber, parsed.data.dayNumber),
					),
				)
				.limit(1);

			if (existingDayNumber.length > 0 && existingDayNumber[0]?.id !== dayId) {
				return c.json({ error: ERROR_MESSAGES.DAY_NUMBER_ALREADY_EXISTS }, 409);
			}
		}

		// 日付重複チェック（同一イベント内、自身以外）
		if (parsed.data.date !== undefined) {
			const existingDate = await db
				.select()
				.from(eventDays)
				.where(
					and(
						eq(eventDays.eventId, eventId),
						eq(eventDays.date, parsed.data.date),
					),
				)
				.limit(1);

			if (existingDate.length > 0 && existingDate[0]?.id !== dayId) {
				return c.json({ error: ERROR_MESSAGES.DATE_ALREADY_EXISTS }, 409);
			}
		}

		// 更新
		const result = await db
			.update(eventDays)
			.set(parsed.data)
			.where(eq(eventDays.id, dayId))
			.returning();

		return c.json(result[0]);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/events/:eventId/days/:dayId");
	}
});

// 開催日削除
eventDaysRouter.delete("/:eventId/days/:dayId", async (c) => {
	try {
		const eventId = c.req.param("eventId");
		const dayId = c.req.param("dayId");

		// 存在チェック
		const existing = await db
			.select()
			.from(eventDays)
			.where(and(eq(eventDays.id, dayId), eq(eventDays.eventId, eventId)))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.EVENT_DAY_NOT_FOUND }, 404);
		}

		// 削除
		await db.delete(eventDays).where(eq(eventDays.id, dayId));

		return c.json({ success: true, id: dayId });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/events/:eventId/days/:dayId");
	}
});

export { eventDaysRouter };
