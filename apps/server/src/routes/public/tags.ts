import { asc, count, db, desc, eq, like, sql, tags, trackTags } from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";

const tagsRouter = new Hono();

// TTL定数を追加（cache.tsに追加されるまでローカルで定義）
const TAGS_CACHE_TTL = 5 * 60; // 5分

/**
 * 重み計算（対数スケールで1-5）
 */
function calculateWeight(
	usageCount: number,
	maxCount: number,
	minCount: number,
): number {
	if (maxCount === minCount) return 3;
	const logMin = Math.log(minCount || 1);
	const logMax = Math.log(maxCount);
	const logCount = Math.log(usageCount);
	const normalized = (logCount - logMin) / (logMax - logMin);
	return Math.round(normalized * 4) + 1; // 1-5
}

/**
 * GET /api/public/tags
 * 全タグ一覧を取得（使用数付き）
 */
tagsRouter.get("/", async (c) => {
	try {
		const search = c.req.query("search");
		const limit = Math.min(Number(c.req.query("limit")) || 100, 100);

		const cacheKey = cacheKeys.tagsList({ search, limit });

		// キャッシュチェック
		const cached = getCache<{ tags: unknown[] }>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });
			return c.json(cached);
		}

		// クエリ構築
		let query = db
			.select({
				id: tags.id,
				name: tags.name,
				usageCount: count(trackTags.trackId),
			})
			.from(tags)
			.leftJoin(trackTags, eq(tags.id, trackTags.tagId))
			.groupBy(tags.id)
			.orderBy(asc(tags.name))
			.limit(limit)
			.$dynamic();

		// 検索条件を追加
		if (search) {
			query = query.where(like(tags.name, `%${search}%`));
		}

		const data = await query;

		const response = {
			tags: data.map((tag) => ({
				id: tag.id,
				name: tag.name,
				usageCount: tag.usageCount,
			})),
		};

		// キャッシュに保存
		setCache(cacheKey, response, TAGS_CACHE_TTL);
		setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/tags");
	}
});

/**
 * GET /api/public/tags/cloud
 * タグクラウド用データを取得（使用頻度に基づく重み付け）
 */
tagsRouter.get("/cloud", async (c) => {
	try {
		const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
		const minCount = Math.max(Number(c.req.query("minCount")) || 1, 1);

		const cacheKey = cacheKeys.tagsCloud({ limit, minCount });

		// キャッシュチェック
		const cached = getCache<{ tags: unknown[]; meta: unknown }>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });
			return c.json(cached);
		}

		// 使用数でソートした上位N件を取得（minCount以上のみ）
		const data = await db
			.select({
				id: tags.id,
				name: tags.name,
				usageCount: count(trackTags.trackId),
			})
			.from(tags)
			.innerJoin(trackTags, eq(tags.id, trackTags.tagId))
			.groupBy(tags.id)
			.having(sql`count(${trackTags.trackId}) >= ${minCount}`)
			.orderBy(desc(count(trackTags.trackId)))
			.limit(limit);

		// 全タグ数を取得
		const totalResult = await db.select({ count: count() }).from(tags);
		const totalTags = totalResult[0]?.count ?? 0;

		// 重みを計算
		if (data.length === 0) {
			const response = {
				tags: [],
				meta: {
					totalTags,
					maxCount: 0,
					minCount: 0,
				},
			};

			setCache(cacheKey, response, TAGS_CACHE_TTL);
			setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });

			return c.json(response);
		}

		const firstTag = data[0];
		const lastTag = data[data.length - 1];
		const maxUsageCount = firstTag?.usageCount ?? 0;
		const minUsageCount = lastTag?.usageCount ?? 0;

		const tagsWithWeight = data.map((tag) => ({
			id: tag.id,
			name: tag.name,
			count: tag.usageCount,
			weight: calculateWeight(tag.usageCount, maxUsageCount, minUsageCount),
		}));

		const response = {
			tags: tagsWithWeight,
			meta: {
				totalTags,
				maxCount: maxUsageCount,
				minCount: minUsageCount,
			},
		};

		// キャッシュに保存
		setCache(cacheKey, response, TAGS_CACHE_TTL);
		setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });

		return c.json(response);
	} catch (error) {
		return handleDbError(c, error, "GET /api/public/tags/cloud");
	}
});

export { tagsRouter };
