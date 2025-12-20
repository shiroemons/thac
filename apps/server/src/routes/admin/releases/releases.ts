import {
	and,
	count,
	db,
	discs,
	eq,
	insertReleaseSchema,
	like,
	releases,
	tracks,
	updateReleaseSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const releasesRouter = new Hono<AdminContext>();

// リリース一覧取得（ページネーション、検索、フィルタ対応）
releasesRouter.get("/", async (c) => {
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

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select({
				id: releases.id,
				name: releases.name,
				nameJa: releases.nameJa,
				nameEn: releases.nameEn,
				catalogNumber: releases.catalogNumber,
				releaseDate: releases.releaseDate,
				releaseType: releases.releaseType,
				eventDayId: releases.eventDayId,
				notes: releases.notes,
				createdAt: releases.createdAt,
				updatedAt: releases.updatedAt,
			})
			.from(releases)
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
});

// リリース個別取得（ディスク情報を含む）
releasesRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	const result = await db
		.select()
		.from(releases)
		.where(eq(releases.id, id))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
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
});

// リリース新規作成
releasesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertReleaseSchema.safeParse(body);
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
		.from(releases)
		.where(eq(releases.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// 作成
	const result = await db.insert(releases).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// リリース更新
releasesRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(releases)
		.where(eq(releases.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateReleaseSchema.safeParse(body);
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
		.update(releases)
		.set(parsed.data)
		.where(eq(releases.id, id))
		.returning();

	return c.json(result[0]);
});

// リリース削除（ディスクはCASCADE削除）
releasesRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(releases)
		.where(eq(releases.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除（ディスクはCASCADE削除）
	await db.delete(releases).where(eq(releases.id, id));

	return c.json({ success: true });
});

export { releasesRouter };
