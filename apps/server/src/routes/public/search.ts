import type {
	TrackSearchDocument,
	TrackSearchHit,
	TrackSearchResponse,
} from "@thac/search";
import { getMeilisearchClient, TRACKS_INDEX_NAME } from "@thac/search";
import { Hono } from "hono";
import {
	optionalAuthMiddleware,
	type OptionalAuthContext,
} from "../../middleware/optional-auth";
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

	const query = c.req.query("q");
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

		let searchResult;

		if (user) {
			// 認証済みユーザー: 特殊構文によるフィルター検索を有効化
			// parseSearchQuery で "arranger:ARM" 等の構文を解析
			const parsed = parseSearchQuery(query);
			const filterString = buildMeilisearchFilter(parsed.filters);

			searchResult = await index.search(parsed.fullTextQuery, {
				filter: filterString || undefined,
				hitsPerPage: limit,
				page: page,
				sort: sort.length > 0 ? sort : undefined,
				attributesToHighlight: HIGHLIGHT_ATTRIBUTES,
				highlightPreTag: "<mark>",
				highlightPostTag: "</mark>",
			});
		} else {
			// 未認証ユーザー: クエリをそのまま全文検索
			// 特殊構文の解析やフィルターは適用しない
			searchResult = await index.search(query, {
				// filter なし - 未認証ユーザーはフィルター機能を使用できない
				hitsPerPage: limit,
				page: page,
				sort: sort.length > 0 ? sort : undefined,
				attributesToHighlight: HIGHLIGHT_ATTRIBUTES,
				highlightPreTag: "<mark>",
				highlightPostTag: "</mark>",
			});
		}

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
