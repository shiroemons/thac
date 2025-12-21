import {
	and,
	artistAliases,
	artists,
	asc,
	count,
	db,
	eq,
	insertArtistSchema,
	like,
	or,
	sql,
	updateArtistSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";

const artistsRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、検索、頭文字フィルタ対応）
artistsRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const initialScript = c.req.query("initialScript");
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const conditions = [];

	if (initialScript) {
		conditions.push(eq(artists.initialScript, initialScript));
	}

	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(
			or(
				like(artists.name, searchPattern),
				like(artists.nameJa, searchPattern),
				like(artists.nameEn, searchPattern),
				like(artists.sortName, searchPattern),
			),
		);
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// データ取得
	const [data, totalResult] = await Promise.all([
		db
			.select()
			.from(artists)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(artists.name),
		db.select({ count: count() }).from(artists).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
		page,
		limit,
	});
});

// 個別取得（別名義一覧を含む）
artistsRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	// アーティスト取得
	const result = await db
		.select()
		.from(artists)
		.where(eq(artists.id, id))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 別名義一覧取得
	const aliases = await db
		.select()
		.from(artistAliases)
		.where(eq(artistAliases.artistId, id))
		.orderBy(asc(artistAliases.name));

	return c.json({
		...result[0],
		aliases,
	});
});

// 新規作成
artistsRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertArtistSchema.safeParse(body);
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
		.from(artists)
		.where(eq(artists.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// 名前重複チェック（大文字小文字無視）
	const existingName = await db
		.select()
		.from(artists)
		.where(sql`lower(${artists.name}) = lower(${parsed.data.name})`)
		.limit(1);

	if (existingName.length > 0) {
		return c.json({ error: "Name already exists" }, 409);
	}

	// 作成
	const result = await db.insert(artists).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
artistsRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(artists)
		.where(eq(artists.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateArtistSchema.safeParse(body);
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
			.from(artists)
			.where(sql`lower(${artists.name}) = lower(${parsed.data.name})`)
			.limit(1);

		if (existingName.length > 0 && existingName[0]?.id !== id) {
			return c.json({ error: "Name already exists" }, 409);
		}
	}

	// 更新
	const result = await db
		.update(artists)
		.set(parsed.data)
		.where(eq(artists.id, id))
		.returning();

	return c.json(result[0]);
});

// 削除
artistsRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(artists)
		.where(eq(artists.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除（関連別名義はCASCADE削除）
	await db.delete(artists).where(eq(artists.id, id));

	return c.json({ success: true });
});

export { artistsRouter };
