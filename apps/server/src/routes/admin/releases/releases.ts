import {
	and,
	count,
	db,
	discs,
	eq,
	eventDays,
	events,
	insertReleaseSchema,
	like,
	releases,
	tracks,
	updateReleaseSchema,
} from "@thac/db";
import { Hono } from "hono";
import { ERROR_MESSAGES } from "../../../constants/error-messages";
import type { AdminContext } from "../../../middleware/admin-auth";
import { handleDbError } from "../../../utils/api-error";

// リリース日を年月日に分解するヘルパー関数
function parseDateToComponents(
	dateStr: string | null | undefined,
): { year: number; month: number; day: number } | null {
	if (!dateStr) return null;
	const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match || !match[1] || !match[2] || !match[3]) return null;
	return {
		year: Number.parseInt(match[1], 10),
		month: Number.parseInt(match[2], 10),
		day: Number.parseInt(match[3], 10),
	};
}

// event_id と event_day_id の整合性チェック
async function validateEventConsistency(
	eventId: string | null | undefined,
	eventDayId: string | null | undefined,
): Promise<{ valid: boolean; error?: string; eventId?: string | null }> {
	// 両方nullの場合はOK
	if (!eventId && !eventDayId) {
		return { valid: true };
	}

	// event_day_id が指定されている場合
	if (eventDayId) {
		const eventDayResult = await db
			.select()
			.from(eventDays)
			.where(eq(eventDays.id, eventDayId))
			.limit(1);

		const eventDay = eventDayResult[0];
		if (!eventDay) {
			return { valid: false, error: "指定されたevent_day_idが存在しません" };
		}

		// event_id が指定されている場合、整合性チェック
		if (eventId && eventId !== eventDay.eventId) {
			return {
				valid: false,
				error: "event_idとevent_day_idが整合していません",
			};
		}

		// event_day_id から event_id を自動設定
		return { valid: true, eventId: eventDay.eventId };
	}

	// event_id のみ指定されている場合はOK
	return { valid: true };
}

const releasesRouter = new Hono<AdminContext>();

// リリース一覧取得（ページネーション、検索、フィルタ対応）
releasesRouter.get("/", async (c) => {
	try {
		const page = Number(c.req.query("page")) || 1;
		const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
		const search = c.req.query("search");
		const releaseType = c.req.query("releaseType");

		const offset = (page - 1) * limit;

		// 条件を構築
		const conditions = [];

		if (search) {
			const searchPattern = `%${search}%`;
			conditions.push(like(releases.name, searchPattern));
		}

		if (releaseType) {
			conditions.push(eq(releases.releaseType, releaseType));
		}

		const whereCondition =
			conditions.length > 0 ? and(...conditions) : undefined;

		// データ取得
		const [data, totalResult] = await Promise.all([
			db
				.select({
					id: releases.id,
					name: releases.name,
					nameJa: releases.nameJa,
					nameEn: releases.nameEn,
					releaseDate: releases.releaseDate,
					releaseYear: releases.releaseYear,
					releaseMonth: releases.releaseMonth,
					releaseDay: releases.releaseDay,
					releaseType: releases.releaseType,
					eventId: releases.eventId,
					eventDayId: releases.eventDayId,
					eventName: events.name,
					eventDayNumber: eventDays.dayNumber,
					eventDayDate: eventDays.date,
					notes: releases.notes,
					createdAt: releases.createdAt,
					updatedAt: releases.updatedAt,
				})
				.from(releases)
				.leftJoin(events, eq(releases.eventId, events.id))
				.leftJoin(eventDays, eq(releases.eventDayId, eventDays.id))
				.where(whereCondition)
				.limit(limit)
				.offset(offset)
				.orderBy(releases.releaseDate, releases.name),
			db.select({ count: count() }).from(releases).where(whereCondition),
		]);

		// ディスク数・トラック数を取得
		const releaseIds = data.map((r) => r.id);
		let discCounts: Record<string, number> = {};
		let trackCounts: Record<string, number> = {};

		if (releaseIds.length > 0) {
			const [discCountResults, trackCountResults] = await Promise.all([
				db
					.select({
						releaseId: discs.releaseId,
						count: count(),
					})
					.from(discs)
					.groupBy(discs.releaseId),
				db
					.select({
						releaseId: tracks.releaseId,
						count: count(),
					})
					.from(tracks)
					.groupBy(tracks.releaseId),
			]);

			discCounts = Object.fromEntries(
				discCountResults.map((r) => [r.releaseId, r.count]),
			);
			trackCounts = Object.fromEntries(
				trackCountResults.map((r) => [r.releaseId, r.count]),
			);
		}

		const dataWithCounts = data.map((release) => ({
			...release,
			discCount: discCounts[release.id] ?? 0,
			trackCount: trackCounts[release.id] ?? 0,
		}));

		const total = totalResult[0]?.count ?? 0;

		return c.json({
			data: dataWithCounts,
			total,
			page,
			limit,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases");
	}
});

// リリース個別取得（ディスク情報を含む）
releasesRouter.get("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		const result = await db
			.select()
			.from(releases)
			.where(eq(releases.id, id))
			.limit(1);

		if (result.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		// 関連ディスクを取得（ディスク番号順）
		const releaseDiscs = await db
			.select()
			.from(discs)
			.where(eq(discs.releaseId, id))
			.orderBy(discs.discNumber);

		return c.json({
			...result[0],
			discs: releaseDiscs,
		});
	} catch (error) {
		return handleDbError(c, error, "GET /admin/releases/:id");
	}
});

// リリース新規作成
releasesRouter.post("/", async (c) => {
	try {
		const body = await c.req.json();

		// バリデーション
		const parsed = insertReleaseSchema.safeParse(body);
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
			.from(releases)
			.where(eq(releases.id, parsed.data.id))
			.limit(1);

		if (existingId.length > 0) {
			return c.json({ error: ERROR_MESSAGES.ID_ALREADY_EXISTS }, 409);
		}

		// event_id と event_day_id の整合性チェック
		const eventValidation = await validateEventConsistency(
			parsed.data.eventId,
			parsed.data.eventDayId,
		);
		if (!eventValidation.valid) {
			return c.json({ error: eventValidation.error }, 400);
		}

		// release_date から年月日を自動設定
		const dateComponents = parseDateToComponents(parsed.data.releaseDate);

		// 作成データを構築
		const insertData = {
			...parsed.data,
			// event_day_id から event_id を自動設定
			eventId: eventValidation.eventId ?? parsed.data.eventId,
			// release_date から年月日を設定
			releaseYear: dateComponents?.year ?? parsed.data.releaseYear,
			releaseMonth: dateComponents?.month ?? parsed.data.releaseMonth,
			releaseDay: dateComponents?.day ?? parsed.data.releaseDay,
		};

		// 作成
		const result = await db.insert(releases).values(insertData).returning();

		return c.json(result[0], 201);
	} catch (error) {
		return handleDbError(c, error, "POST /admin/releases");
	}
});

// リリース更新
releasesRouter.put("/:id", async (c) => {
	try {
		const id = c.req.param("id");
		const body = await c.req.json();

		// 存在チェック
		const existing = await db
			.select()
			.from(releases)
			.where(eq(releases.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		// バリデーション
		const parsed = updateReleaseSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{
					error: ERROR_MESSAGES.VALIDATION_FAILED,
					details: parsed.error.flatten().fieldErrors,
				},
				400,
			);
		}

		// event_id と event_day_id の整合性チェック
		const existingRelease = existing[0];
		const newEventId = parsed.data.eventId ?? existingRelease?.eventId;
		const newEventDayId = parsed.data.eventDayId ?? existingRelease?.eventDayId;
		const eventValidation = await validateEventConsistency(
			newEventId,
			newEventDayId,
		);
		if (!eventValidation.valid) {
			return c.json({ error: eventValidation.error }, 400);
		}

		// release_date から年月日を自動設定
		const newReleaseDate =
			parsed.data.releaseDate ?? existingRelease?.releaseDate;
		const dateComponents = parseDateToComponents(newReleaseDate);

		// 更新データを構築
		const updateData = {
			...parsed.data,
			// event_day_id から event_id を自動設定
			eventId: eventValidation.eventId ?? newEventId,
			// release_date から年月日を設定
			releaseYear: dateComponents?.year ?? parsed.data.releaseYear,
			releaseMonth: dateComponents?.month ?? parsed.data.releaseMonth,
			releaseDay: dateComponents?.day ?? parsed.data.releaseDay,
		};

		// トランザクションでリリースと関連トラックを更新
		const updatedRelease = await db.transaction(async (tx) => {
			// リリース更新
			const result = await tx
				.update(releases)
				.set(updateData)
				.where(eq(releases.id, id))
				.returning();

			const release = result[0];
			if (!release) {
				throw new Error("Update failed");
			}

			// 関連トラックの日付・イベント情報も更新
			await tx
				.update(tracks)
				.set({
					releaseDate: release.releaseDate,
					releaseYear: release.releaseYear,
					releaseMonth: release.releaseMonth,
					releaseDay: release.releaseDay,
					eventId: release.eventId,
					eventDayId: release.eventDayId,
				})
				.where(eq(tracks.releaseId, id));

			return release;
		});

		return c.json(updatedRelease);
	} catch (error) {
		return handleDbError(c, error, "PUT /admin/releases/:id");
	}
});

// リリース削除（ディスクはCASCADE削除）
releasesRouter.delete("/:id", async (c) => {
	try {
		const id = c.req.param("id");

		// 存在チェック
		const existing = await db
			.select()
			.from(releases)
			.where(eq(releases.id, id))
			.limit(1);

		if (existing.length === 0) {
			return c.json({ error: ERROR_MESSAGES.RELEASE_NOT_FOUND }, 404);
		}

		// 削除（ディスクはCASCADE削除）
		await db.delete(releases).where(eq(releases.id, id));

		return c.json({ success: true });
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/releases/:id");
	}
});

// リリース一括削除
releasesRouter.delete("/batch", async (c) => {
	try {
		const body = await c.req.json();
		const { ids } = body as { ids: string[] };

		if (!Array.isArray(ids) || ids.length === 0) {
			return c.json({ error: ERROR_MESSAGES.ITEMS_REQUIRED_NON_EMPTY }, 400);
		}

		// 上限チェック（一度に100件まで）
		if (ids.length > 100) {
			return c.json({ error: ERROR_MESSAGES.MAXIMUM_BATCH_ITEMS }, 400);
		}

		const deleted: string[] = [];
		const failed: Array<{ id: string; error: string }> = [];

		for (const id of ids) {
			try {
				// 存在チェック
				const existing = await db
					.select()
					.from(releases)
					.where(eq(releases.id, id))
					.limit(1);

				if (existing.length === 0) {
					failed.push({
						id,
						error: ERROR_MESSAGES.RELEASE_NOT_FOUND,
					});
					continue;
				}

				// 削除（ディスク・トラックはCASCADE削除）
				await db.delete(releases).where(eq(releases.id, id));
				deleted.push(id);
			} catch (e) {
				failed.push({
					id,
					error: e instanceof Error ? e.message : "Unknown error",
				});
			}
		}

		return c.json({
			success: failed.length === 0,
			deleted: deleted.length,
			failed,
		});
	} catch (error) {
		return handleDbError(c, error, "DELETE /admin/releases/batch");
	}
});

export { releasesRouter };
