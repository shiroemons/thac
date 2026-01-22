import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import DOMPurify from "isomorphic-dompurify";
import {
	ChevronRight,
	Clock,
	Music,
	Search,
	SlidersHorizontal,
	Sparkles,
	TrendingUp,
	UserRound,
	Users,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicBreadcrumb } from "@/components/public";
import {
	type AdvancedSearchFilters,
	AdvancedSearchModal,
	type AdvancedSearchModalRef,
	DEFAULT_FILTERS,
	FilterChips,
	useFilterChips,
} from "@/components/search";
import {
	buildSearchQueryString,
	filtersToSearchParams,
	isFiltersEmpty,
	mergeFiltersWithDefaults,
	searchParamsToFilters,
} from "@/components/search/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageHead } from "@/lib/head";
import { searchTracksQueryOptions } from "@/lib/public-query-options";

interface SearchParams {
	q?: string;
	// フィルターパラメータ
	artistName?: string;
	circleName?: string;
	albumName?: string;
	trackName?: string;
	originalSongs?: string;
	artists?: string;
	circles?: string;
	vocalistCount?: string;
	lyricistCount?: string;
	composerCount?: string;
	arrangerCount?: string;
	songCount?: string;
	dateFrom?: string;
	dateTo?: string;
	event?: string;
}

export const Route = createFileRoute("/_public/search")({
	head: () => createPageHead("検索"),
	component: SearchPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			q: typeof search.q === "string" ? search.q : undefined,
			// テキスト検索フィルター
			artistName:
				typeof search.artistName === "string" ? search.artistName : undefined,
			circleName:
				typeof search.circleName === "string" ? search.circleName : undefined,
			albumName:
				typeof search.albumName === "string" ? search.albumName : undefined,
			trackName:
				typeof search.trackName === "string" ? search.trackName : undefined,
			// 選択フィルター
			originalSongs:
				typeof search.originalSongs === "string"
					? search.originalSongs
					: undefined,
			artists: typeof search.artists === "string" ? search.artists : undefined,
			circles: typeof search.circles === "string" ? search.circles : undefined,
			// 役割者数フィルター
			vocalistCount:
				typeof search.vocalistCount === "string"
					? search.vocalistCount
					: undefined,
			lyricistCount:
				typeof search.lyricistCount === "string"
					? search.lyricistCount
					: undefined,
			composerCount:
				typeof search.composerCount === "string"
					? search.composerCount
					: undefined,
			arrangerCount:
				typeof search.arrangerCount === "string"
					? search.arrangerCount
					: undefined,
			// その他
			songCount:
				typeof search.songCount === "string" ? search.songCount : undefined,
			dateFrom:
				typeof search.dateFrom === "string" ? search.dateFrom : undefined,
			dateTo: typeof search.dateTo === "string" ? search.dateTo : undefined,
			event: typeof search.event === "string" ? search.event : undefined,
		};
	},
});

const STORAGE_KEY_HISTORY = "search-history";
const MAX_HISTORY_ITEMS = 5;

// 検索履歴アイテムの型（フィルターも含む）
interface SearchHistoryItem {
	query: string;
	filters: AdvancedSearchFilters;
	timestamp: number;
}

// 人気の検索キーワード
const popularSearches = [
	"Bad Apple!!",
	"IOSYS",
	"ナイト・オブ・ナイツ",
	"ZUN",
	"幽閉サテライト",
];

/**
 * フィルターの適用数を計算する
 */
function getActiveFilterCount(filters: AdvancedSearchFilters): number {
	let count = 0;
	// テキスト検索
	count += Object.values(filters.textSearch).filter(Boolean).length;
	// 原曲
	count += filters.originalSongs.length;
	// アーティスト
	count += filters.artists.length;
	// サークル
	count += filters.circles.length;
	// 役割者数
	count += Object.values(filters.roleCounts).filter((v) => v !== "any").length;
	// 原曲数
	if (filters.songCount !== "any") count += 1;
	// 日付範囲
	if (filters.dateRange.from || filters.dateRange.to) count += 1;
	// イベント
	if (filters.event) count += 1;
	return count;
}

/**
 * 検索履歴を読み込む（旧形式との後方互換性あり）
 */
function getSearchHistory(): SearchHistoryItem[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");

		// 旧形式（文字列配列）との互換性処理
		if (Array.isArray(raw)) {
			return raw.map((item) => {
				if (typeof item === "string") {
					// 旧形式を新形式に変換
					return { query: item, filters: DEFAULT_FILTERS, timestamp: 0 };
				}
				return item as SearchHistoryItem;
			});
		}
		return [];
	} catch {
		return [];
	}
}

/**
 * 検索履歴を保存する
 */
function saveSearchHistory(
	query: string,
	filters: AdvancedSearchFilters,
	currentHistory: SearchHistoryItem[],
): SearchHistoryItem[] {
	const newItem: SearchHistoryItem = {
		query,
		filters,
		timestamp: Date.now(),
	};

	// 同じクエリ＆フィルターの履歴があれば削除（重複排除）
	const filtered = currentHistory.filter(
		(item) =>
			!(
				item.query === query &&
				JSON.stringify(item.filters) === JSON.stringify(filters)
			),
	);

	// 新しいアイテムを先頭に追加
	const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
	localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
	return updated;
}

/**
 * Meilisearchのハイライト付きテキストを表示
 * _formatted フィールドがある場合は <mark> タグ付きHTMLを使用
 */
function getFormattedText(
	original: string,
	formatted: string | null | undefined,
): React.ReactNode {
	if (formatted && typeof window !== "undefined") {
		// Meilisearch returns HTML with <mark> tags
		// Content is sanitized with DOMPurify (ALLOWED_TAGS: mark only)
		const sanitized = DOMPurify.sanitize(formatted, {
			ALLOWED_TAGS: ["mark"],
			ALLOWED_ATTR: [],
		});
		return (
			<span
				className="[&_mark]:rounded [&_mark]:bg-primary/30 [&_mark]:px-0.5 [&_mark]:text-inherit"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
				dangerouslySetInnerHTML={{ __html: sanitized }}
			/>
		);
	}
	return original;
}

/**
 * 配列の全要素をハイライト付きで表示（区切り文字で結合）
 */
function getFormattedArrayText(
	originals: string[],
	formattedArray: string[] | undefined,
	separator = ", ",
): React.ReactNode {
	if (originals.length === 0) return null;
	return originals.map((original, index) => (
		<span key={original}>
			{index > 0 && separator}
			{getFormattedText(original, formattedArray?.[index])}
		</span>
	));
}

/**
 * サークル配列をリンク付きで表示
 */
function renderCircleLinks(
	items: Array<{ id: string; name: string }>,
): React.ReactNode {
	if (items.length === 0) return "-";
	return items.map((item, index) => (
		<span key={`${item.name}-${index}`}>
			{index > 0 && ", "}
			<Link
				to="/circles/$id"
				params={{ id: item.id }}
				className="transition-colors hover:text-primary"
			>
				{item.name}
			</Link>
		</span>
	));
}

/**
 * アーティスト配列をリンク付きで表示
 */
function renderArtistLinks(
	items: Array<{ id: string | null; name: string }>,
): React.ReactNode {
	if (items.length === 0) return "-";
	return items.map((item, index) => (
		<span key={`${item.name}-${index}`}>
			{index > 0 && ", "}
			{item.id ? (
				<Link
					to="/artists/$id"
					params={{ id: item.id }}
					className="transition-colors hover:text-primary"
				>
					{item.name}
				</Link>
			) : (
				item.name
			)}
		</span>
	));
}

/**
 * URLSearchParamsからフィルターを復元するヘルパー
 */
function restoreFiltersFromUrlParams(
	params: SearchParams,
): AdvancedSearchFilters {
	const urlParams = new URLSearchParams();

	// SearchParams から URLSearchParams に変換
	if (params.artistName) urlParams.set("artistName", params.artistName);
	if (params.circleName) urlParams.set("circleName", params.circleName);
	if (params.albumName) urlParams.set("albumName", params.albumName);
	if (params.trackName) urlParams.set("trackName", params.trackName);
	if (params.originalSongs)
		urlParams.set("originalSongs", params.originalSongs);
	if (params.artists) urlParams.set("artists", params.artists);
	if (params.circles) urlParams.set("circles", params.circles);
	if (params.vocalistCount)
		urlParams.set("vocalistCount", params.vocalistCount);
	if (params.lyricistCount)
		urlParams.set("lyricistCount", params.lyricistCount);
	if (params.composerCount)
		urlParams.set("composerCount", params.composerCount);
	if (params.arrangerCount)
		urlParams.set("arrangerCount", params.arrangerCount);
	if (params.songCount) urlParams.set("songCount", params.songCount);
	if (params.dateFrom) urlParams.set("dateFrom", params.dateFrom);
	if (params.dateTo) urlParams.set("dateTo", params.dateTo);
	if (params.event) urlParams.set("event", params.event);

	const partialFilters = searchParamsToFilters(urlParams);
	return mergeFiltersWithDefaults(partialFilters);
}

/**
 * フィルターをURL search params オブジェクトに変換するヘルパー
 */
function filtersToUrlSearchObject(
	q: string | undefined,
	filters: AdvancedSearchFilters,
): Record<string, string | undefined> {
	const urlParams = filtersToSearchParams(filters);
	const result: Record<string, string | undefined> = {};

	// qパラメータを設定（空でも保持）
	if (q) {
		result.q = q;
	}

	// URLSearchParamsの内容をオブジェクトに変換
	urlParams.forEach((value, key) => {
		result[key] = value;
	});

	return result;
}

function SearchPage() {
	const searchParams = Route.useSearch();
	const query = searchParams.q ?? "";
	const navigate = useNavigate();
	const [inputValue, setInputValue] = useState(query);
	const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

	// URLパラメータからフィルターを復元（useState の初期値関数で初回のみ実行）
	const [filters, setFiltersInternal] = useState<AdvancedSearchFilters>(() =>
		restoreFiltersFromUrlParams(searchParams),
	);
	// モーダル内での一時的なフィルター状態（検索ボタンクリックまで適用されない）
	const [pendingFilters, setPendingFilters] = useState<AdvancedSearchFilters>(
		() => restoreFiltersFromUrlParams(searchParams),
	);
	const modalRef = useRef<AdvancedSearchModalRef>(null);

	// フィルター変更時にURLも更新するラッパー
	const setFiltersWithUrl = useCallback(
		(newFilters: AdvancedSearchFilters) => {
			setFiltersInternal(newFilters);
			// URLを更新（フィルターが空の場合はqのみ保持）
			navigate({
				to: "/search",
				search: filtersToUrlSearchObject(query || undefined, newFilters),
				replace: true, // ブラウザ履歴に積み上げない
			});
		},
		[navigate, query],
	);

	// フィルターチップのロジック（URLも更新されるsetterを使用）
	const { chips, handleRemoveChip, handleClearAll } = useFilterChips(
		filters,
		setFiltersWithUrl,
	);

	// 選択中のフィルター数
	const activeFilterCount = useMemo(() => {
		let count = 0;
		// テキスト検索
		count += Object.values(filters.textSearch).filter(Boolean).length;
		// 原曲
		count += filters.originalSongs.length;
		// アーティスト
		count += filters.artists.length;
		// サークル
		count += filters.circles.length;
		// 役割者数
		count += Object.values(filters.roleCounts).filter(
			(v) => v !== "any",
		).length;
		// 原曲数
		if (filters.songCount !== "any") count += 1;
		// 日付範囲
		if (filters.dateRange.from || filters.dateRange.to) count += 1;
		// イベント
		if (filters.event) count += 1;
		return count;
	}, [filters]);

	// 検索クエリ文字列を構築（フィルター込み）
	const searchQueryString = useMemo(() => {
		return buildSearchQueryString(query, filters);
	}, [query, filters]);

	const hasActiveSearch = useMemo(() => {
		return !!query || !isFiltersEmpty(filters);
	}, [query, filters]);

	// Meilisearch APIクエリ
	const {
		data: searchData,
		isLoading,
		error,
	} = useQuery(
		searchTracksQueryOptions({
			q: searchQueryString,
			page: 1,
			limit: 20,
		}),
	);

	// モーダルを開く（現在のfiltersでpendingFiltersを初期化）
	const openAdvancedSearch = () => {
		setPendingFilters(filters);
		modalRef.current?.showModal();
	};

	// 検索実行（モーダルから呼ばれる）
	const handleAdvancedSearch = () => {
		// pendingFiltersを正式なfiltersに適用して検索を実行
		setFiltersInternal(pendingFilters);

		// 検索履歴に保存（クエリまたはフィルターがある場合のみ）
		const trimmedQuery = inputValue.trim();
		if (trimmedQuery || !isFiltersEmpty(pendingFilters)) {
			setSearchHistory((prev) =>
				saveSearchHistory(trimmedQuery, pendingFilters, prev),
			);
		}

		// URLを更新
		navigate({
			to: "/search",
			search: filtersToUrlSearchObject(trimmedQuery || undefined, pendingFilters),
		});
		modalRef.current?.close();
	};

	// モーダルを閉じる（pendingFiltersは破棄される）
	const handleCloseModal = () => {
		modalRef.current?.close();
		// pendingFiltersはリセットせず、次回開く時に再初期化される
	};

	useEffect(() => {
		setSearchHistory(getSearchHistory());
	}, []);

	useEffect(() => {
		setInputValue(query);
	}, [query]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedValue = inputValue.trim();
		// キーワードまたはフィルターがある場合のみ検索実行
		if (trimmedValue || !isFiltersEmpty(filters)) {
			// 検索履歴に保存（イベントハンドラ内で処理）
			setSearchHistory((prev) =>
				saveSearchHistory(trimmedValue, filters, prev),
			);
			// 既存のフィルターを保持してキーワードのみ更新
			navigate({
				to: "/search",
				search: filtersToUrlSearchObject(trimmedValue || undefined, filters),
			});
		}
	};

	const handleClearInput = () => {
		setInputValue("");
		// フィルターは保持し、キーワードのみクリア
		navigate({
			to: "/search",
			search: filtersToUrlSearchObject(undefined, filters),
		});
	};

	const handleHistoryClick = (item: SearchHistoryItem) => {
		setInputValue(item.query);
		setFiltersInternal(item.filters);
		setPendingFilters(item.filters);

		// URLも更新
		navigate({
			to: "/search",
			search: filtersToUrlSearchObject(item.query || undefined, item.filters),
		});
	};

	// 全履歴をクリア
	const clearAllSearchHistory = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(STORAGE_KEY_HISTORY);
			setSearchHistory([]);
		}
	};

	// 個別の履歴を削除
	const removeSearchHistoryItem = (index: number) => {
		if (typeof window !== "undefined") {
			const updated = searchHistory.filter((_, i) => i !== index);
			localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
			setSearchHistory(updated);
		}
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "検索" }]} />

			{/* Hero search section */}
			<Card className="glass-card-light relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative">
					<div className="mb-6 text-center">
						<h1 className="mb-2 font-bold text-2xl md:text-3xl">楽曲を検索</h1>
						<p className="text-base-content/60 text-sm">
							アーティスト、曲名、サークル名で検索できます
						</p>
					</div>

					{/* Search form with enhanced visibility */}
					<form onSubmit={handleSearch} className="mx-auto max-w-2xl">
						<div className="flex items-center gap-2">
							{/* Search input - enhanced visibility with glass effect */}
							<div className="group relative flex-1">
								<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
									<Search
										className="size-6 text-base-content/40 transition-colors duration-300 group-focus-within:text-primary"
										aria-hidden="true"
									/>
								</div>
								<input
									type="text"
									value={inputValue}
									onChange={(e) => setInputValue(e.target.value)}
									placeholder="検索キーワードを入力..."
									className="input input-bordered input-lg w-full rounded-xl border-2 border-base-content/10 bg-base-100/70 pr-12 pl-14 shadow-lg backdrop-blur-sm transition-all duration-300 placeholder:text-base-content/40 hover:border-primary/30 hover:shadow-xl focus:border-primary focus:bg-base-100 focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/20"
									aria-label="検索キーワード"
								/>
								{inputValue && (
									<button
										type="button"
										onClick={handleClearInput}
										className="absolute inset-y-0 right-0 flex min-h-[44px] min-w-[44px] items-center justify-center pr-3 text-base-content/40 transition-colors duration-300 hover:text-base-content"
										aria-label="検索をクリア"
									>
										<X className="size-5" />
									</button>
								)}
							</div>

							{/* Advanced search button - mobile optimized */}
							<Button
								type="button"
								variant={activeFilterCount > 0 ? "primary" : "outline"}
								size="lg"
								onClick={openAdvancedSearch}
								className="min-w-12 gap-2 rounded-xl px-4 transition-all duration-300 hover:shadow-lg"
								aria-label="詳細検索を開く"
							>
								<SlidersHorizontal className="size-5" />
								<span className="hidden sm:inline">詳細検索</span>
								{activeFilterCount > 0 && (
									<Badge className="flex size-5 items-center justify-center rounded-full bg-primary-content text-primary">
										{activeFilterCount}
									</Badge>
								)}
							</Button>
						</div>
					</form>

					{/* 選択中のフィルターチップ */}
					{chips.length > 0 && (
						<div className="mx-auto mt-4 max-w-2xl">
							<FilterChips
								chips={chips}
								onRemove={handleRemoveChip}
								onClearAll={handleClearAll}
							/>
						</div>
					)}

					{/* Popular searches */}
					{!hasActiveSearch && (
						<div className="mx-auto mt-6 max-w-2xl">
							<div className="flex flex-wrap items-center justify-center gap-2">
								<span className="flex items-center gap-1 text-base-content/60 text-xs">
									<TrendingUp className="size-3" aria-hidden="true" />
									人気:
								</span>
								{popularSearches.map((term) => (
									<button
										key={term}
										type="button"
										onClick={() =>
											handleHistoryClick({
												query: term,
												filters: DEFAULT_FILTERS,
												timestamp: 0,
											})
										}
										className="min-h-[32px] rounded-full bg-base-content/5 px-3 py-1.5 text-base-content/70 text-xs transition-all duration-300 hover:bg-primary hover:text-primary-content hover:shadow-sm"
									>
										{term}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</Card>

			{/* Advanced search modal */}
			<AdvancedSearchModal
				ref={modalRef}
				filters={pendingFilters}
				onFiltersChange={setPendingFilters}
				onSearch={handleAdvancedSearch}
				onClose={handleCloseModal}
			/>

			{/* Search results */}
			{hasActiveSearch ? (
				<div className="space-y-4">
					<p className="text-base-content/60 text-sm">
						{query ? (
							<>
								「<span className="font-medium text-base-content">{query}</span>
								」の検索結果
							</>
						) : (
							<>フィルター検索の結果</>
						)}
						{searchData && (
							<span className="ml-1">
								({searchData.estimatedTotalHits.toLocaleString()}件)
							</span>
						)}
					</p>

					{/* Loading state */}
					{isLoading && (
						<div className="flex justify-center py-12">
							<span className="loading loading-spinner loading-lg text-primary" />
						</div>
					)}

					{/* Error state */}
					{error && (
						<Card className="glass-card-light rounded-2xl p-12 text-center">
							<p className="text-error">検索中にエラーが発生しました</p>
							<p className="mt-2 text-base-content/60 text-sm">
								しばらく経ってから再度お試しください
							</p>
						</Card>
					)}

					{/* Results */}
					{!isLoading && !error && searchData && searchData.hits.length > 0 ? (
						<>
							{/* デスクトップ: テーブル表示 */}
							<div className="hidden overflow-x-auto lg:block">
								<table className="table-sm table w-full">
									<thead>
										<tr className="text-base-content/70">
											<th className="font-medium">曲名</th>
											<th className="font-medium">作品名</th>
											<th className="font-medium">イベント</th>
											<th className="font-medium">サークル</th>
											<th className="font-medium">原曲</th>
											<th className="font-medium">ボーカリスト</th>
											<th className="font-medium">編曲者</th>
											<th className="font-medium">作詞者</th>
											<th className="font-medium">その他</th>
										</tr>
									</thead>
									<tbody>
										{searchData.hits.map((hit) => (
											<tr
												key={hit.id}
												className="transition-colors hover:bg-base-200/60"
											>
												<td className="max-w-[200px]">
													<Link
														to="/tracks/$id"
														params={{ id: hit.id }}
														className="line-clamp-2 block font-medium transition-colors hover:text-primary"
													>
														{getFormattedText(hit.name, hit._formatted?.name)}
													</Link>
												</td>
												<td className="max-w-[150px] text-base-content/70 text-sm">
													{hit.releaseId ? (
														<Link
															to="/releases/$id"
															params={{ id: hit.releaseId }}
															className="line-clamp-2 block transition-colors hover:text-primary"
														>
															{getFormattedText(
																hit.releaseName ?? "",
																hit._formatted?.releaseName,
															)}
														</Link>
													) : (
														<span className="line-clamp-2 block">-</span>
													)}
												</td>
												<td className="max-w-[120px] text-base-content/70 text-sm">
													{hit.eventId ? (
														<Link
															to="/events/$id"
															params={{ id: hit.eventId }}
															className="line-clamp-2 block transition-colors hover:text-primary"
														>
															{hit.eventName}
														</Link>
													) : (
														<span className="line-clamp-2 block">
															{hit.eventName ?? "-"}
														</span>
													)}
												</td>
												<td className="max-w-[120px] text-sm">
													<div className="line-clamp-2">
														{renderCircleLinks(hit.circles)}
													</div>
												</td>
												<td className="max-w-[150px] text-base-content/70 text-sm">
													<div className="line-clamp-2">
														{hit.originalSongs.length > 0
															? hit.originalSongs.map((song, index) => (
																	<span key={`${song.name}-${index}`}>
																		{index > 0 && ", "}
																		{song.officialSongId ? (
																			<Link
																				to="/original-songs/$id"
																				params={{ id: song.officialSongId }}
																				className="transition-colors hover:text-primary"
																			>
																				{song.name}
																			</Link>
																		) : (
																			song.name
																		)}
																	</span>
																))
															: "-"}
													</div>
												</td>
												<td className="max-w-[120px] text-sm">
													<div className="line-clamp-2">
														{renderArtistLinks(hit.vocalists)}
													</div>
												</td>
												<td className="max-w-[120px] text-sm">
													<div className="line-clamp-2">
														{renderArtistLinks(hit.arrangers)}
													</div>
												</td>
												<td className="max-w-[120px] text-sm">
													<div className="line-clamp-2">
														{renderArtistLinks(hit.lyricists)}
													</div>
												</td>
												<td className="max-w-[120px] text-base-content/50 text-xs">
													<div className="line-clamp-2">
														{hit.composers.length > 0 || hit.remixers.length > 0
															? [...hit.composers, ...hit.remixers].map(
																	(artist, index) => (
																		<span key={`${artist.name}-${index}`}>
																			{index > 0 && ", "}
																			{artist.id ? (
																				<Link
																					to="/artists/$id"
																					params={{ id: artist.id }}
																					className="transition-colors hover:text-primary"
																				>
																					{artist.name}
																				</Link>
																			) : (
																				artist.name
																			)}
																		</span>
																	),
																)
															: "-"}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* モバイル: カード表示 */}
							<div className="grid gap-3 lg:hidden">
								{searchData.hits.map((hit) => (
									<Link
										key={hit.id}
										to="/tracks/$id"
										params={{ id: hit.id }}
										preload="intent"
									>
										<Card className="group flex items-center gap-4 rounded-xl p-4 transition-all duration-300 hover:bg-base-200/60 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
											<div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
												<Music className="size-5" aria-hidden="true" />
											</div>
											<div className="min-w-0 flex-1">
												{(hit.releaseName || hit.eventName) && (
													<p className="truncate text-base-content/50 text-xs">
														{hit.releaseName &&
															getFormattedText(
																hit.releaseName,
																hit._formatted?.releaseName,
															)}
														{hit.releaseName && hit.eventName && " / "}
														{hit.eventName}
													</p>
												)}
												<h3 className="line-clamp-1 font-semibold transition-colors duration-300 group-hover:text-primary">
													{getFormattedText(hit.name, hit._formatted?.name)}
												</h3>
												{/* サークル名 */}
												{hit.circleNames.length > 0 && (
													<p className="line-clamp-1 text-base-content/60 text-sm">
														{getFormattedArrayText(
															hit.circleNames,
															hit._formatted?.circleNames,
														)}
													</p>
												)}
												{/* 原曲名 */}
												{hit.originalSongNames.length > 0 && (
													<p className="line-clamp-1 text-base-content/50 text-xs">
														♪{" "}
														{getFormattedArrayText(
															hit.originalSongNames,
															hit._formatted?.originalSongNames,
															" / ",
														)}
													</p>
												)}
												{/* アーティスト情報 */}
												{(hit.vocalistNames.length > 0 ||
													hit.arrangerNames.length > 0 ||
													hit.lyricistNames.length > 0) && (
													<p className="line-clamp-1 text-base-content/50 text-xs">
														{hit.vocalistNames.length > 0 && (
															<span>Vo: {hit.vocalistNames.join(", ")}</span>
														)}
														{hit.vocalistNames.length > 0 &&
															hit.arrangerNames.length > 0 &&
															" / "}
														{hit.arrangerNames.length > 0 && (
															<span>Arr: {hit.arrangerNames.join(", ")}</span>
														)}
														{(hit.vocalistNames.length > 0 ||
															hit.arrangerNames.length > 0) &&
															hit.lyricistNames.length > 0 &&
															" / "}
														{hit.lyricistNames.length > 0 && (
															<span>Ly: {hit.lyricistNames.join(", ")}</span>
														)}
													</p>
												)}
											</div>
											<ChevronRight className="hidden size-5 flex-shrink-0 text-base-content/30 transition-colors duration-200 group-hover:text-primary sm:block" />
										</Card>
									</Link>
								))}
							</div>
						</>
					) : (
						!isLoading &&
						!error && (
							<Card className="glass-card-light rounded-2xl p-12 text-center">
								<div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-base-content/5 to-base-content/10">
									<Search
										className="size-10 text-base-content/30"
										aria-hidden="true"
									/>
								</div>
								<h3 className="mb-2 font-semibold text-base-content/70 text-lg">
									結果が見つかりませんでした
								</h3>
								<p className="text-base-content/60">
									{query ? (
										<>
											「
											<span className="font-medium text-base-content">
												{query}
											</span>
											」に一致する結果はありません
										</>
									) : (
										<>指定された条件に一致する結果はありません</>
									)}
								</p>
								<p className="mt-4 text-base-content/50 text-sm">
									別のキーワードで検索するか、詳細検索をお試しください
								</p>
								<Button
									type="button"
									variant="ghost"
									onClick={openAdvancedSearch}
									className="mt-4 gap-2 transition-all duration-300 hover:bg-primary hover:text-primary-content"
								>
									<SlidersHorizontal className="size-4" />
									詳細検索を開く
								</Button>
							</Card>
						)
					)}
				</div>
			) : (
				/* Search history */
				<div className="space-y-6">
					{searchHistory.length > 0 && (
						<Card className="glass-card-light rounded-2xl p-6">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="flex items-center gap-2 font-semibold">
									<Clock className="size-4 text-primary" aria-hidden="true" />
									最近の検索
								</h2>
								<button
									type="button"
									className="text-primary text-xs hover:underline"
									onClick={clearAllSearchHistory}
								>
									すべてクリア
								</button>
							</div>
							<div className="flex flex-wrap gap-2">
								{searchHistory.map((historyItem, index) => {
									const filterCount = getActiveFilterCount(historyItem.filters);
									const displayLabel =
										historyItem.query || "(フィルターのみ)";
									return (
										<div
											key={`${historyItem.timestamp}-${index}`}
											className="group flex min-h-[44px] items-center gap-1 rounded-full bg-base-content/5 py-2 pr-2 pl-4 text-sm transition-all duration-300 hover:bg-primary hover:text-primary-content hover:shadow-md"
										>
											<button
												type="button"
												onClick={() => handleHistoryClick(historyItem)}
												className="flex items-center gap-2"
											>
												<Clock
													className="size-3 text-base-content/40 group-hover:text-primary-content/60"
													aria-hidden="true"
												/>
												{displayLabel}
												{filterCount > 0 && (
													<span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-content text-xs group-hover:bg-primary-content group-hover:text-primary">
														+{filterCount}
													</span>
												)}
											</button>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													removeSearchHistoryItem(index);
												}}
												className="ml-1 flex size-5 items-center justify-center rounded-full text-base-content/40 transition-colors hover:bg-base-content/10 hover:text-base-content group-hover:text-primary-content/60 group-hover:hover:bg-primary-content/20 group-hover:hover:text-primary-content"
												aria-label={`「${displayLabel}」を削除`}
											>
												<X className="size-3" />
											</button>
										</div>
									);
								})}
							</div>
						</Card>
					)}

					{/* Browse categories */}
					<Card className="glass-card-light rounded-2xl p-6">
						<h2 className="mb-4 flex items-center gap-2 font-semibold">
							<Sparkles className="size-4 text-primary" aria-hidden="true" />
							カテゴリから探す
						</h2>
						<div className="grid gap-3 sm:grid-cols-3">
							<Link
								to="/circles"
								preload="intent"
								className="group flex min-h-[72px] items-center gap-3 rounded-xl bg-base-200 p-4 transition-all duration-300 hover:bg-primary hover:text-primary-content hover:shadow-lg hover:ring-2 hover:ring-primary/10"
							>
								<div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-content transition-transform duration-300 group-hover:scale-110">
									<Users className="size-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium transition-colors duration-300 group-hover:text-primary">
										サークル
									</div>
									<div className="text-base-content/60 text-xs">456件</div>
								</div>
							</Link>
							<Link
								to="/artists"
								preload="intent"
								className="group flex min-h-[72px] items-center gap-3 rounded-xl bg-base-200 p-4 transition-all duration-300 hover:bg-accent hover:text-accent-content hover:shadow-lg hover:ring-2 hover:ring-accent/10"
							>
								<div className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-content transition-transform duration-300 group-hover:scale-110">
									<UserRound className="size-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium transition-colors duration-300 group-hover:text-accent">
										アーティスト
									</div>
									<div className="text-base-content/60 text-xs">890件</div>
								</div>
							</Link>
							<Link
								to="/original-songs"
								preload="intent"
								className="group flex min-h-[72px] items-center gap-3 rounded-xl bg-base-200 p-4 transition-all duration-300 hover:bg-secondary hover:text-secondary-content hover:shadow-lg hover:ring-2 hover:ring-secondary/10"
							>
								<div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-content transition-transform duration-300 group-hover:scale-110">
									<Music className="size-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium transition-colors duration-300 group-hover:text-secondary">
										原曲
									</div>
									<div className="text-base-content/60 text-xs">1,234件</div>
								</div>
							</Link>
						</div>
					</Card>
				</div>
			)}
		</div>
	);
}
