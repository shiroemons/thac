import {
	and,
	count,
	db,
	eq,
	insertOfficialSongSchema,
	like,
	officialSongs,
	officialWorks,
	or,
	updateOfficialSongSchema,
} from "@thac/db";
import { Hono } from "hono";
import type { AdminContext } from "../../../middleware/admin-auth";
import { parseAndValidate } from "../../../utils/import-parser";

const songsRouter = new Hono<AdminContext>();

// 一覧取得（ページネーション、作品フィルタ、検索対応）
songsRouter.get("/", async (c) => {
	const page = Number(c.req.query("page")) || 1;
	const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
	const workId = c.req.query("workId");
	const search = c.req.query("search");

	const offset = (page - 1) * limit;

	// 条件を構築
	const conditions = [];

	if (workId) {
		conditions.push(eq(officialSongs.officialWorkId, workId));
	}

	if (search) {
		const searchPattern = `%${search}%`;
		conditions.push(
			or(
				like(officialSongs.name, searchPattern),
				like(officialSongs.nameJa, searchPattern),
				like(officialSongs.nameEn, searchPattern),
			),
		);
	}

	const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

	// データ取得（作品情報を結合）
	const [data, totalResult] = await Promise.all([
		db
			.select({
				id: officialSongs.id,
				officialWorkId: officialSongs.officialWorkId,
				trackNumber: officialSongs.trackNumber,
				name: officialSongs.name,
				nameJa: officialSongs.nameJa,
				nameEn: officialSongs.nameEn,
				composerName: officialSongs.composerName,
				arrangerName: officialSongs.arrangerName,
				isOriginal: officialSongs.isOriginal,
				sourceSongId: officialSongs.sourceSongId,
				notes: officialSongs.notes,
				createdAt: officialSongs.createdAt,
				updatedAt: officialSongs.updatedAt,
				workName: officialWorks.nameJa,
			})
			.from(officialSongs)
			.leftJoin(
				officialWorks,
				eq(officialSongs.officialWorkId, officialWorks.id),
			)
			.where(whereCondition)
			.limit(limit)
			.offset(offset)
			.orderBy(officialSongs.id),
		db.select({ count: count() }).from(officialSongs).where(whereCondition),
	]);

	const total = totalResult[0]?.count ?? 0;

	return c.json({
		data,
		total,
		page,
		limit,
	});
});

// 個別取得（作品情報を含む）
songsRouter.get("/:id", async (c) => {
	const id = c.req.param("id");

	const result = await db
		.select({
			id: officialSongs.id,
			officialWorkId: officialSongs.officialWorkId,
			trackNumber: officialSongs.trackNumber,
			name: officialSongs.name,
			nameJa: officialSongs.nameJa,
			nameEn: officialSongs.nameEn,
			composerName: officialSongs.composerName,
			arrangerName: officialSongs.arrangerName,
			isOriginal: officialSongs.isOriginal,
			sourceSongId: officialSongs.sourceSongId,
			notes: officialSongs.notes,
			createdAt: officialSongs.createdAt,
			updatedAt: officialSongs.updatedAt,
			workName: officialWorks.nameJa,
		})
		.from(officialSongs)
		.leftJoin(officialWorks, eq(officialSongs.officialWorkId, officialWorks.id))
		.where(eq(officialSongs.id, id))
		.limit(1);

	if (result.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	return c.json(result[0]);
});

// 新規作成
songsRouter.post("/", async (c) => {
	const body = await c.req.json();

	// バリデーション
	const parsed = insertOfficialSongSchema.safeParse(body);
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
		.from(officialSongs)
		.where(eq(officialSongs.id, parsed.data.id))
		.limit(1);

	if (existingId.length > 0) {
		return c.json({ error: "ID already exists" }, 409);
	}

	// sourceSongIdの自己参照チェック
	if (parsed.data.sourceSongId === parsed.data.id) {
		return c.json({ error: "Source song cannot reference itself" }, 400);
	}

	// 作成
	const result = await db.insert(officialSongs).values(parsed.data).returning();

	return c.json(result[0], 201);
});

// 更新
songsRouter.put("/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();

	// 存在チェック
	const existing = await db
		.select()
		.from(officialSongs)
		.where(eq(officialSongs.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// バリデーション
	const parsed = updateOfficialSongSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "Validation failed",
				details: parsed.error.flatten().fieldErrors,
			},
			400,
		);
	}

	// sourceSongIdの自己参照チェック
	if (parsed.data.sourceSongId === id) {
		return c.json({ error: "Source song cannot reference itself" }, 400);
	}

	// 更新
	const result = await db
		.update(officialSongs)
		.set(parsed.data)
		.where(eq(officialSongs.id, id))
		.returning();

	return c.json(result[0]);
});

// 削除
songsRouter.delete("/:id", async (c) => {
	const id = c.req.param("id");

	// 存在チェック
	const existing = await db
		.select()
		.from(officialSongs)
		.where(eq(officialSongs.id, id))
		.limit(1);

	if (existing.length === 0) {
		return c.json({ error: "Not found" }, 404);
	}

	// 削除
	await db.delete(officialSongs).where(eq(officialSongs.id, id));

	return c.json({ success: true });
});

// インポート
songsRouter.post("/import", async (c) => {
	const body = await c.req.parseBody();
	const file = body.file;

	if (!(file instanceof File)) {
		return c.json({ error: "ファイルが指定されていません" }, 400);
	}

	const content = await file.text();
	const result = parseAndValidate(content, file.name, insertOfficialSongSchema);

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

	// 自己参照チェック
	const selfRefErrors = [];
	for (let i = 0; i < data.length; i++) {
		const item = data[i];
		if (item && item.sourceSongId === item.id) {
			selfRefErrors.push({
				row: i + 1,
				errors: ["Source song cannot reference itself"],
			});
		}
	}

	if (selfRefErrors.length > 0) {
		return c.json(
			{
				error: "Validation failed",
				rows: selfRefErrors,
			},
			400,
		);
	}

	let created = 0;
	const updated = 0;

	await db.transaction(async (tx) => {
		for (const item of data) {
			await tx
				.insert(officialSongs)
				.values(item)
				.onConflictDoUpdate({
					target: officialSongs.id,
					set: {
						officialWorkId: item.officialWorkId,
						trackNumber: item.trackNumber,
						name: item.name,
						nameJa: item.nameJa,
						nameEn: item.nameEn,
						composerName: item.composerName,
						arrangerName: item.arrangerName,
						isOriginal: item.isOriginal,
						sourceSongId: item.sourceSongId,
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

export { songsRouter };
