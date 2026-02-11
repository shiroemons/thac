import type {
	TrackSearchDocument,
	TrackSearchHit,
	TrackSearchResponse,
} from "@thac/search";
import { getMeilisearchClient, TRACKS_INDEX_NAME } from "@thac/search";
import { Hono } from "hono";
import {
	type OptionalAuthContext,
	optionalAuthMiddleware,
} from "../../middleware/optional-auth";
import { sanitizeSearch } from "../../utils/query-params";
import {
	buildMeilisearchFilter,
	parseSearchQuery,
} from "../../utils/search-query-parser";

const searchRouter = new Hono<OptionalAuthContext>();

/** Highlight対象のattributes */
const HIGHLIGHT_ATTRIBUTES = [
	"name",
	"releaseName",
	"circleNames",
	"vocalistNames",
	"arrangerNames",
	"lyricistNames",
	"originalSongNames",
];

/** ページあたりの最大件数 */
const MAX_LIMIT = 100;
/** デフォルトのページあたり件数 */
const DEFAULT_LIMIT = 20;
/** デフォルトのページ番号 */
const DEFAULT_PAGE = 1;

/**
 * GET /tracks
 * Meilisearchを使用してトラックを検索
 *
 * 認証状態によって検索動作が異なる:
 * - 認証済み: 特殊構文（arranger:ARM, year:2023 など）でフィルター検索が可能
 * - 未認証: クエリをそのままプレーンテキスト検索（構文解析なし、フィルターなし）
 *
 * @param q - 検索クエリ（必須）
 * @param page - ページ番号（1始まり、デフォルト: 1）
 * @param limit - 1ページあたりの件数（デフォルト: 20、最大: 100）
 * @param sort - ソートフィールド（例: releaseDate:desc）
 */
searchRouter.get("/tracks", optionalAuthMiddleware, async (c) => {
	// オプショナル認証からユーザー情報を取得
	// 認証済みの場合はユーザーオブジェクト、未認証の場合はnull
	const user = c.get("user");

	const query = sanitizeSearch(c.req.query("q"));
	const pageParam = c.req.query("page");
	const limitParam = c.req.query("limit");
	const sortParam = c.req.query("sort");

	// クエリパラメータが必須（空文字列は許可 - フィルターのみ検索をサポート）
	if (query === undefined || query === null) {
		return c.json({ error: "Query parameter 'q' is required" }, 400);
	}

	// ページネーションパラメータを解析
	const page = pageParam
		? Math.max(1, Number.parseInt(pageParam, 10))
		: DEFAULT_PAGE;
	const limit = limitParam
		? Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limitParam, 10)))
		: DEFAULT_LIMIT;

	try {
		const client = getMeilisearchClient();
		const index = client.index<TrackSearchDocument>(TRACKS_INDEX_NAME);

		// ソートオプションを構築
		const sort: string[] = sortParam ? [sortParam] : [];

		// 認証状態に応じて検索クエリとフィルターを決定
		// - 認証済み: 特殊構文を解析してフィルター適用
		// - 未認証: クエリをそのまま全文検索（フィルターなし）
		const parsed = user ? parseSearchQuery(query) : null;
		const searchQuery = parsed ? parsed.fullTextQuery : query;
		const filterString = parsed ? buildMeilisearchFilter(parsed.filters) : null;

		const searchResult = await index.search(searchQuery, {
			filter: filterString || undefined,
			hitsPerPage: limit,
			page: page,
			sort: sort.length > 0 ? sort : undefined,
			attributesToHighlight: HIGHLIGHT_ATTRIBUTES,
			highlightPreTag: "<mark>",
			highlightPostTag: "</mark>",
		});

		// 結果をTrackSearchHit形式に変換
		const hits: TrackSearchHit[] = searchResult.hits.map((hit) => {
			const result: TrackSearchHit = {
				...hit,
			};
			// _formattedがある場合は含める
			if (hit._formatted) {
				result._formatted = hit._formatted as Partial<TrackSearchDocument>;
			}
			return result;
		});

		// レスポンスを構築
		// hitsPerPage/pageを使用しているので、FinitePaginationが適用される（totalHits, totalPages）
		const response: TrackSearchResponse = {
			hits,
			query: query,
			processingTimeMs: searchResult.processingTimeMs,
			estimatedTotalHits: searchResult.totalHits ?? 0,
			page: page,
			limit: limit,
			totalPages: searchResult.totalPages ?? 0,
		};

		return c.json(response);
	} catch (error) {
		console.error("Meilisearch search error:", error);
		const message = error instanceof Error ? error.message : "Search failed";
		return c.json({ error: message }, 500);
	}
});

export { searchRouter };
