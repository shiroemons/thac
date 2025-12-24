import {
	and,
	artistAliases,
	artists,
	count,
	db,
	eq,
	insertArtistAliasSchema,
	like,
	sql,
	updateArtistAliasSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { aliasTracksRouter } from "./tracks";

const artistAliasesRouter = new Hono<AdminContext>();

// サブルーターをマウント
artistAliasesRouter.route("/", aliasTracksRouter);

// 一覧取得（ページネーション、検索、アーティストIDフィルタ対応）
artistAliasesRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const artistId = c.req.query("artistId");
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const conditions = [];

	if (artistId) {
		conditions.push(eq(artistAliases.artistId, artistId));
	}

	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(like(artistAliases.name, searchPattern));
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// データ取得（親アーティスト名を結合）
	const [data, totalResult] = await Promise.all([
		db
			.select({
				id: artistAliases.id,
				artistId: artistAliases.artistId,
				name: artistAliases.name,
				aliasTypeCode: artistAliases.aliasTypeCode,
				nameInitial: artistAliases.nameInitial,
				initialScript: artistAliases.initialScript,
				periodFrom: artistAliases.periodFrom,
				periodTo: artistAliases.periodTo,
				createdAt: artistAliases.createdAt,
				updatedAt: artistAliases.updatedAt,
				artistName: artists.name,
			})
			.from(artistAliases)
			.leftJoin(artists, eq(artistAliases.artistId, artists.id))
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(artistAliases.name),
		db.select({ count: count() }).from(artistAliases).where(whereCondition),
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
artistAliasesRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	const result = await db
		.select({
			id: artistAliases.id,
			artistId: artistAliases.artistId,
			name: artistAliases.name,
			aliasTypeCode: artistAliases.aliasTypeCode,
			nameInitial: artistAliases.nameInitial,
			initialScript: artistAliases.initialScript,
			periodFrom: artistAliases.periodFrom,
			periodTo: artistAliases.periodTo,
			createdAt: artistAliases.createdAt,
			updatedAt: artistAliases.updatedAt,
			artistName: artists.name,
		})
		.from(artistAliases)
		.leftJoin(artists, eq(artistAliases.artistId, artists.id))
		.where(eq(artistAliases.id, id))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
artistAliasesRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertArtistAliasSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// 親アーティスト存在チェック
	const existingArtist = await db
		.select()
		.from(artists)
		.where(eq(artists.id, parsed.data.artistId))
		.limit(1);

	if (existingArtist.length === 0) {
		return c.json({ error: "Artist not found" }, 404);
	}

	// ID重複チェック
	const existingId = await db
		.select()
		.from(artistAliases)
		.where(eq(artistAliases.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// 同一アーティスト内での名前重複チェック（大文字小文字無視）
	const existingName = await db
		.select()
		.from(artistAliases)
		.where(
			and(
				eq(artistAliases.artistId, parsed.data.artistId),
				sql`lower(${artistAliases.name}) = lower(${parsed.data.name})`,
			),
		)
		.limit(1);

	if (existingName.length > 0) {
		return c.json({ error: "Alias name already exists for this artist" }, 409);
	}

	// 作成
	const result = await db.insert(artistAliases).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
artistAliasesRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(artistAliases)
		.where(eq(artistAliases.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateArtistAliasSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	const currentArtistId = parsed.data.artistId || existing[0]?.artistId;

	// 名前重複チェック（同一アーティスト内、自身以外）
	if (parsed.data.name && currentArtistId) {
		const existingName = await db
			.select()
			.from(artistAliases)
			.where(
				and(
					eq(artistAliases.artistId, currentArtistId),
					sql`lower(${artistAliases.name}) = lower(${parsed.data.name})`,
				),
			)
			.limit(1);

		if (existingName.length > 0 && existingName[0]?.id !== id) {
			return c.json(
				{ error: "Alias name already exists for this artist" },
				409,
			);
		}
	}

	// 更新
	const result = await db
		.update(artistAliases)
		.set(parsed.data)
		.where(eq(artistAliases.id, id))
		.returning();

	return c.json(result[0]);
});

// 削除
artistAliasesRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(artistAliases)
		.where(eq(artistAliases.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(artistAliases).where(eq(artistAliases.id, id));

	return c.json({ success: true });
});

export { artistAliasesRouter };
