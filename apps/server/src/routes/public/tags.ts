import {
	asc,
	count,
	db,
	desc,
	eq,
	ilike,
	sql,
	tags,
	trackTags,
} from "@thac/db";
import { Hono } from "hono";
import { handleDbError } from "../../utils/api-error";
import {
	cacheKeys,
	getCache,
	setCache,
	setCacheHeaders,
} from "../../utils/cache";
import { sanitizeSearch } from "../../utils/query-params";

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
 * マスターテーブルから全タグを取得（使用されていないタグも含む）
 */
tagsRouter.get("/", async (c) => {
	try {
		const search = sanitizeSearch(c.req.query("search"));
		const limit = Math.min(Number(c.req.query("limit")) || 100, 100);

		const cacheKey = cacheKeys.tagsList({ search, limit });

		// キャッシュチェック
		const cached = getCache<{
			data: { id: string; name: string; trackCount: number }[];
			total: number;
			page: number;
			limit: number;
		}>(cacheKey);
		if (cached) {
			setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });
			return c.json(cached);
		}

		// タグマスターから全件取得するクエリを構築
		// leftJoinでtrackTagsと結合し、使用数を取得（0件のタグも含む）
		let query = db
			.select({
				id: tags.id,
				name: tags.name,
				usageCount:
					sql<number>`coalesce(count(${trackTags.trackId}), 0)::int`.as(
						"usageCount",
					),
			})
			.from(tags)
			.leftJoin(trackTags, eq(tags.id, trackTags.tagId))
			.groupBy(tags.id, tags.name)
			.$dynamic();

		// 検索条件を追加
		if (search) {
			query = query.where(ilike(tags.name, `%${search}%`));
		}

		const data = await query.orderBy(asc(tags.name)).limit(limit);

		// 合計件数を取得（検索条件付き）
		let totalQuery = db.select({ count: count() }).from(tags).$dynamic();
		if (search) {
			totalQuery = totalQuery.where(ilike(tags.name, `%${search}%`));
		}
		const totalResult = await totalQuery;
		const total = Number(totalResult[0]?.count ?? 0);

		const page = 1; // 現在ページ（TODO: ページネーションパラメータ対応時に修正）

		const response = {
			data: data.map((tag) => ({
				id: tag.id,
				name: tag.name,
				trackCount: Number(tag.usageCount),
			})),
			total,
			page,
			limit,
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
		const cached = getCache<{
			data: { id: string; name: string; count: number; weight: number }[];
		}>(cacheKey);
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

		// 重みを計算
		if (data.length === 0) {
			const response = {
				data: [],
			};

			setCache(cacheKey, response, TAGS_CACHE_TTL);
			setCacheHeaders(c, { maxAge: TAGS_CACHE_TTL });

			return c.json(response);
		}

		const firstTag = data[0];
		const lastTag = data[data.length - 1];
		const maxUsageCount = Number(firstTag?.usageCount ?? 0);
		const minUsageCount = Number(lastTag?.usageCount ?? 0);

		const tagsWithWeight = data.map((tag) => ({
			id: tag.id,
			name: tag.name,
			count: Number(tag.usageCount),
			weight: calculateWeight(
				Number(tag.usageCount),
				maxUsageCount,
				minUsageCount,
			),
		}));

		const response = {
			data: tagsWithWeight,
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
