import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
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
import { useEffect, useMemo, useRef, useState } from "react";
import { PublicBreadcrumb } from "@/components/public";
import {
	type AdvancedSearchFilters,
	AdvancedSearchModal,
	type AdvancedSearchModalRef,
	DEFAULT_FILTERS,
	FilterChips,
	useFilterChips,
} from "@/components/search";
import { buildSearchQueryString } from "@/components/search/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageHead } from "@/lib/head";
import { searchTracksQueryOptions } from "@/lib/public-query-options";

interface SearchParams {
	q?: string;
}

export const Route = createFileRoute("/_public/search")({
	head: () => createPageHead("検索"),
	component: SearchPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			q: typeof search.q === "string" ? search.q : undefined,
		};
	},
});

const STORAGE_KEY_HISTORY = "search-history";
const MAX_HISTORY_ITEMS = 5;

// 人気の検索キーワード
const popularSearches = [
	"Bad Apple!!",
	"IOSYS",
	"ナイト・オブ・ナイツ",
	"ZUN",
	"幽閉サテライト",
];

function getSearchHistory(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const history = localStorage.getItem(STORAGE_KEY_HISTORY);
		return history ? JSON.parse(history) : [];
	} catch {
		return [];
	}
}

function saveSearchHistory(query: string, history: string[]): string[] {
	const newHistory = [query, ...history.filter((h) => h !== query)].slice(
		0,
		MAX_HISTORY_ITEMS,
	);
	localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory));
	return newHistory;
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
		// DOMPurify is loaded asynchronously to sanitize the HTML
		const DOMPurify = require("isomorphic-dompurify").default;
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
 * 配列の最初の要素のハイライト付きテキストを表示
 */
function getFormattedArrayText(
	originals: string[],
	formattedArray: string[] | undefined,
): React.ReactNode {
	if (originals.length === 0) return null;
	const formatted = formattedArray?.[0];
	return getFormattedText(originals[0], formatted);
}

function SearchPage() {
	const { q: query = "" } = Route.useSearch();
	const navigate = useNavigate();
	const [inputValue, setInputValue] = useState(query);
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [filters, setFilters] =
		useState<AdvancedSearchFilters>(DEFAULT_FILTERS);
	const modalRef = useRef<AdvancedSearchModalRef>(null);

	// フィルターチップのロジック
	const { chips, handleRemoveChip, handleClearAll } = useFilterChips(
		filters,
		setFilters,
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
		if (!query) return "";
		return buildSearchQueryString(query, filters);
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

	// モーダルを開く
	const openAdvancedSearch = () => {
		modalRef.current?.showModal();
	};

	// 検索実行（モーダルから呼ばれる）
	const handleAdvancedSearch = () => {
		// フィルターが変更されると自動的にクエリが再実行される
		modalRef.current?.close();
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
		if (trimmedValue) {
			// 検索履歴に保存（イベントハンドラ内で処理）
			setSearchHistory((prev) => saveSearchHistory(trimmedValue, prev));
			navigate({
				to: "/search",
				search: { q: trimmedValue },
			});
		}
	};

	const handleClearInput = () => {
		setInputValue("");
		navigate({
			to: "/search",
			search: {},
		});
	};

	const handleHistoryClick = (historyQuery: string) => {
		navigate({
			to: "/search",
			search: { q: historyQuery },
		});
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
					{!query && chips.length === 0 && (
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
										onClick={() => handleHistoryClick(term)}
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
				filters={filters}
				onFiltersChange={setFilters}
				onSearch={handleAdvancedSearch}
			/>

			{/* Search results */}
			{query ? (
				<div className="space-y-4">
					<p className="text-base-content/60 text-sm">
						「<span className="font-medium text-base-content">{query}</span>
						」の検索結果
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
						<div className="grid gap-3">
							{searchData.hits.map((hit) => {
								// サブタイトル: サークル名 / 原曲名
								const circleText =
									hit.circleNames.length > 0 ? hit.circleNames.join(", ") : "";
								const originalSongText =
									hit.originalSongNames.length > 0
										? hit.originalSongNames.slice(0, 2).join(", ") +
											(hit.originalSongNames.length > 2
												? ` 他${hit.originalSongNames.length - 2}曲`
												: "")
										: "";
								const subtitle = [circleText, originalSongText]
									.filter(Boolean)
									.join(" / ");

								return (
									<Link
										key={hit.id}
										to="/tracks/$id"
										params={{ id: hit.id }}
										preload="intent"
									>
										<Card className="group flex min-h-[72px] items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:bg-base-200/60 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
											<div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-content transition-transform duration-300 group-hover:scale-110">
												<Music className="size-5" aria-hidden="true" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="mb-1 flex flex-wrap items-center gap-2">
													<span className="rounded-full bg-base-content/5 px-2 py-0.5 text-secondary text-xs">
														トラック
													</span>
													{hit.releaseName && (
														<span className="truncate text-base-content/50 text-xs">
															{getFormattedText(
																hit.releaseName,
																hit._formatted?.releaseName,
															)}
														</span>
													)}
												</div>
												<h3 className="font-semibold transition-colors duration-300 group-hover:text-primary">
													{getFormattedText(hit.name, hit._formatted?.name)}
												</h3>
												<p className="mt-0.5 line-clamp-1 text-base-content/60 text-sm">
													{hit._formatted?.circleNames?.[0] ||
													hit._formatted?.originalSongNames?.[0] ? (
														<>
															{getFormattedArrayText(
																hit.circleNames,
																hit._formatted?.circleNames,
															)}
															{circleText && originalSongText && " / "}
															{getFormattedArrayText(
																hit.originalSongNames,
																hit._formatted?.originalSongNames,
															)}
															{hit.originalSongNames.length > 1 && (
																<span className="text-base-content/40">
																	{" "}
																	他{hit.originalSongNames.length - 1}曲
																</span>
															)}
														</>
													) : (
														subtitle
													)}
												</p>
												{/* アーティスト情報 */}
												{(hit.vocalistNames.length > 0 ||
													hit.arrangerNames.length > 0) && (
													<p className="mt-1 text-base-content/50 text-xs">
														{hit.vocalistNames.length > 0 && (
															<span>
																Vo: {hit.vocalistNames.slice(0, 2).join(", ")}
																{hit.vocalistNames.length > 2 && " ..."}
															</span>
														)}
														{hit.vocalistNames.length > 0 &&
															hit.arrangerNames.length > 0 &&
															" / "}
														{hit.arrangerNames.length > 0 && (
															<span>
																Arr: {hit.arrangerNames.slice(0, 2).join(", ")}
																{hit.arrangerNames.length > 2 && " ..."}
															</span>
														)}
													</p>
												)}
											</div>
											<div className="hidden text-base-content/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary sm:block">
												→
											</div>
										</Card>
									</Link>
								);
							})}
						</div>
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
									「
									<span className="font-medium text-base-content">{query}</span>
									」に一致する結果はありません
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
							<h2 className="mb-4 flex items-center gap-2 font-semibold">
								<Clock className="size-4 text-primary" aria-hidden="true" />
								最近の検索
							</h2>
							<div className="flex flex-wrap gap-2">
								{searchHistory.map((historyItem) => (
									<button
										key={historyItem}
										type="button"
										onClick={() => handleHistoryClick(historyItem)}
										className="flex min-h-[44px] items-center gap-2 rounded-full bg-base-content/5 px-4 py-2 text-sm transition-all duration-300 hover:bg-primary hover:text-primary-content hover:shadow-md"
									>
										<Clock
											className="size-3 text-base-content/40"
											aria-hidden="true"
										/>
										{historyItem}
									</button>
								))}
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
