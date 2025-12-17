import {
	and,
	count,
	db,
	eq,
	insertOfficialWorkSchema,
	like,
	officialWorks,
	or,
	updateOfficialWorkSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { parseAndValidate } from "../../../utils/import-parser";

const worksRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、カテゴリフィルタ、検索対応）
worksRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const category = c.req.query("category");
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const conditions = [];

	if (category) {
		conditions.push(eq(officialWorks.categoryCode, category));
	}

	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(
			or(
				like(officialWorks.name, searchPattern),
				like(officialWorks.nameJa, searchPattern),
				like(officialWorks.nameEn, searchPattern),
			),
		);
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(officialWorks)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(officialWorks.position, officialWorks.id),
		db.select({ count: count() }).from(officialWorks).where(whereCondition),
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
worksRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	const result = await db
		.select()
		.from(officialWorks)
		.where(eq(officialWorks.id, id))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
worksRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertOfficialWorkSchema.safeParse(body);
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
		.from(officialWorks)
		.where(eq(officialWorks.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// シリーズコード重複チェック（値がある場合のみ）
	if (parsed.data.seriesCode) {
		const existingSeriesCode = await db
			.select()
			.from(officialWorks)
			.where(eq(officialWorks.seriesCode, parsed.data.seriesCode))
			.limit(1);

		if (existingSeriesCode.length > 0) {
			return c.json({ error: "Series code already exists" }, 409);
		}
	}

	// 作成
	const result = await db.insert(officialWorks).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
worksRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(officialWorks)
		.where(eq(officialWorks.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateOfficialWorkSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// シリーズコード重複チェック（値があり、かつ自身以外に同じ値がある場合）
	if (parsed.data.seriesCode) {
		const existingSeriesCode = await db
			.select()
			.from(officialWorks)
			.where(
				and(
					eq(officialWorks.seriesCode, parsed.data.seriesCode),
					eq(officialWorks.id, id) ? undefined : undefined,
				),
			)
			.limit(1);

		if (existingSeriesCode.length > 0 && existingSeriesCode[0]?.id !== id) {
			return c.json({ error: "Series code already exists" }, 409);
		}
	}

	// 更新
	const result = await db
		.update(officialWorks)
		.set(parsed.data)
		.where(eq(officialWorks.id, id))
		.returning();

	return c.json(result[0]);
});

// 削除
worksRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(officialWorks)
		.where(eq(officialWorks.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除（関連楽曲はCASCADE削除）
	await db.delete(officialWorks).where(eq(officialWorks.id, id));

	return c.json({ success: true });
});

// インポート
worksRouter.post("/import", async (c) => {
	const body = await c.req.parseBody();
	const file = body.file;

	if (!(file instanceof File)) {
		return c.json({ error: "ファイルが指定されていません" }, 400);
	}

	const content = await file.text();
	const result = parseAndValidate(content, file.name, insertOfficialWorkSchema);

	if (!result.success) {
		return c.json(
			{
				error: "Validation failed",
				rows: result.errors,
			},
			400,
		);
	}

	const data = result.data;
	if (!data) {
		return c.json({ error: "データの取得に失敗しました" }, 500);
	}

	let created = 0;
	const updated = 0;

	await db.transaction(async (tx) => {
		for (const item of data) {
			await tx
				.insert(officialWorks)
				.values(item)
				.onConflictDoUpdate({
					target: officialWorks.id,
					set: {
						categoryCode: item.categoryCode,
						name: item.name,
						nameJa: item.nameJa,
						nameEn: item.nameEn,
						shortNameJa: item.shortNameJa,
						shortNameEn: item.shortNameEn,
						seriesCode: item.seriesCode,
						numberInSeries: item.numberInSeries,
						releaseDate: item.releaseDate,
						officialOrganization: item.officialOrganization,
						position: item.position,
						notes: item.notes,
					},
				});
			created++;
		}
	});

	return c.json({
		success: true,
		created,
		updated,
		total: data.length,
	});
});

export { worksRouter };
