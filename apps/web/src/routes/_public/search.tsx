import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Clock,
	Disc3,
	Music,
	Search,
	SlidersHorizontal,
	Sparkles,
	TrendingUp,
	UserRound,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createPageHead } from "@/lib/head";

type SearchCategory = "all" | "artist" | "circle" | "track";

interface SearchParams {
	q?: string;
	category?: SearchCategory;
}

export const Route = createFileRoute("/_public/search")({
	head: () => createPageHead("検索"),
	component: SearchPage,
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		return {
			q: typeof search.q === "string" ? search.q : undefined,
			category:
				typeof search.category === "string" &&
				["all", "artist", "circle", "track"].includes(search.category)
					? (search.category as SearchCategory)
					: "all",
		};
	},
});

const STORAGE_KEY_HISTORY = "search-history";
const MAX_HISTORY_ITEMS = 5;

interface SearchResult {
	id: string;
	type: "artist" | "circle" | "track";
	title: string;
	subtitle: string;
}

// モック検索結果データ
const mockSearchResults: SearchResult[] = [
	{
		id: "iosys",
		type: "circle",
		title: "IOSYS",
		subtitle: "156作品 · 1,234トラック",
	},
	{
		id: "sound-holic",
		type: "circle",
		title: "SOUND HOLIC",
		subtitle: "134作品 · 1,567トラック",
	},
	{
		id: "arm",
		type: "artist",
		title: "ARM",
		subtitle: "編曲 · 456曲参加",
	},
	{
		id: "miko",
		type: "artist",
		title: "miko",
		subtitle: "ボーカル · 234曲参加",
	},
	{
		id: "un-owen",
		type: "track",
		title: "U.N.オーエンは彼女なのか？ (Arrange)",
		subtitle: "東方紅魔郷 · IOSYS",
	},
	{
		id: "night-of-nights",
		type: "track",
		title: "ナイト・オブ・ナイツ",
		subtitle: "東方花映塚 · COOL&CREATE",
	},
	{
		id: "septette",
		type: "track",
		title: "亡き王女の為のセプテット (Piano)",
		subtitle: "東方紅魔郷 · TAMusic",
	},
	{
		id: "bad-apple",
		type: "track",
		title: "Bad Apple!! feat. nomico",
		subtitle: "東方幻想郷 · Alstroemeria Records",
	},
	{
		id: "zun",
		type: "artist",
		title: "ZUN",
		subtitle: "編曲 · 789曲参加",
	},
	{
		id: "alstroemeria",
		type: "circle",
		title: "Alstroemeria Records",
		subtitle: "89作品 · 892トラック",
	},
	{
		id: "kouki",
		type: "artist",
		title: "幽閉サテライト",
		subtitle: "編曲・作詞 · 567曲参加",
	},
	{
		id: "tamaonsen",
		type: "circle",
		title: "魂音泉",
		subtitle: "87作品 · 523トラック",
	},
];

// 人気の検索キーワード
const popularSearches = [
	"Bad Apple!!",
	"IOSYS",
	"ナイト・オブ・ナイツ",
	"ZUN",
	"幽閉サテライト",
];

const categoryConfig: Record<
	SearchCategory,
	{ label: string; icon: React.ReactNode; color: string }
> = {
	all: { label: "すべて", icon: null, color: "" },
	artist: {
		label: "アーティスト",
		icon: <UserRound className="size-4" aria-hidden="true" />,
		color: "text-accent",
	},
	circle: {
		label: "サークル",
		icon: <Disc3 className="size-4" aria-hidden="true" />,
		color: "text-primary",
	},
	track: {
		label: "曲",
		icon: <Music className="size-4" aria-hidden="true" />,
		color: "text-secondary",
	},
};

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

function highlightMatch(text: string, query: string): React.ReactNode {
	if (!query) return text;

	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const index = lowerText.indexOf(lowerQuery);

	if (index === -1) return text;

	return (
		<>
			{text.slice(0, index)}
			<mark className="rounded bg-primary/30 px-0.5 text-inherit">
				{text.slice(index, index + query.length)}
			</mark>
			{text.slice(index + query.length)}
		</>
	);
}

function getResultHref(result: SearchResult): string {
	switch (result.type) {
		case "artist":
			return `/artists/${result.id}`;
		case "circle":
			return `/circles/${result.id}`;
		case "track":
			return `/original-songs/${result.id}`;
	}
}

function getResultIcon(type: SearchResult["type"]): React.ReactNode {
	switch (type) {
		case "artist":
			return <UserRound className="size-5" aria-hidden="true" />;
		case "circle":
			return <Disc3 className="size-5" aria-hidden="true" />;
		case "track":
			return <Music className="size-5" aria-hidden="true" />;
	}
}

function getResultIconColor(type: SearchResult["type"]): string {
	switch (type) {
		case "artist":
			return "bg-accent text-accent-content";
		case "circle":
			return "bg-primary text-primary-content";
		case "track":
			return "bg-secondary text-secondary-content";
	}
}

function SearchPage() {
	const { q: query = "", category = "all" } = Route.useSearch();
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

	// モーダルを開く
	const openAdvancedSearch = () => {
		modalRef.current?.showModal();
	};

	// 検索実行（モーダルから呼ばれる）
	const handleAdvancedSearch = () => {
		// TODO: フィルターを適用して検索を実行
		// 現在はモックなので単純にモーダルを閉じるだけ
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
				search: { q: trimmedValue, category },
			});
		}
	};

	const handleClearInput = () => {
		setInputValue("");
		navigate({
			to: "/search",
			search: { category },
		});
	};

	const handleCategoryChange = (newCategory: SearchCategory) => {
		navigate({
			to: "/search",
			search: { q: query, category: newCategory },
		});
	};

	const handleHistoryClick = (historyQuery: string) => {
		navigate({
			to: "/search",
			search: { q: historyQuery, category },
		});
	};

	const searchResults = useMemo(() => {
		if (!query) return [];

		const lowerQuery = query.toLowerCase();
		let results = mockSearchResults.filter(
			(result) =>
				result.title.toLowerCase().includes(lowerQuery) ||
				result.subtitle.toLowerCase().includes(lowerQuery),
		);

		if (category !== "all") {
			results = results.filter((result) => result.type === category);
		}

		return results;
	}, [query, category]);

	const categoryCounts = useMemo(() => {
		if (!query) return { all: 0, artist: 0, circle: 0, track: 0 };

		const lowerQuery = query.toLowerCase();
		const allResults = mockSearchResults.filter(
			(result) =>
				result.title.toLowerCase().includes(lowerQuery) ||
				result.subtitle.toLowerCase().includes(lowerQuery),
		);

		return {
			all: allResults.length,
			artist: allResults.filter((r) => r.type === "artist").length,
			circle: allResults.filter((r) => r.type === "circle").length,
			track: allResults.filter((r) => r.type === "track").length,
		};
	}, [query]);

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

			{/* Category tabs - mobile optimized */}
			{query && (
				<div className="flex flex-wrap gap-2">
					{(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => {
						const config = categoryConfig[cat];
						const isActive = category === cat;
						return (
							<button
								key={cat}
								type="button"
								onClick={() => handleCategoryChange(cat)}
								className={`flex min-h-[44px] items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-300 ${
									isActive
										? "bg-primary text-primary-content shadow-md"
										: "bg-base-100 shadow-sm hover:bg-base-200/70 hover:shadow-md hover:ring-2 hover:ring-primary/10"
								}`}
								aria-pressed={isActive}
							>
								{config.icon}
								{config.label}
								<span
									className={`rounded-full px-1.5 py-0.5 text-xs transition-colors duration-300 ${
										isActive
											? "bg-primary-content/20 text-primary-content"
											: "bg-base-content/10 text-base-content/60"
									}`}
								>
									{categoryCounts[cat]}
								</span>
							</button>
						);
					})}
				</div>
			)}

			{/* Search results */}
			{query ? (
				<div className="space-y-4">
					<p className="text-base-content/60 text-sm">
						「<span className="font-medium text-base-content">{query}</span>
						」の検索結果
					</p>

					{searchResults.length > 0 ? (
						<div className="grid gap-3">
							{searchResults.map((result) => (
								<Link
									key={`${result.type}-${result.id}`}
									to={getResultHref(result)}
									preload="intent"
								>
									<Card className="group flex min-h-[72px] items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:bg-base-200/60 hover:shadow-lg hover:ring-2 hover:ring-primary/10">
										<div
											className={`flex size-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${getResultIconColor(result.type)}`}
										>
											{getResultIcon(result.type)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center gap-2">
												<span
													className={`rounded-full bg-base-content/5 px-2 py-0.5 text-xs ${categoryConfig[result.type].color}`}
												>
													{categoryConfig[result.type].label}
												</span>
											</div>
											<h3 className="font-semibold transition-colors duration-300 group-hover:text-primary">
												{highlightMatch(result.title, query)}
											</h3>
											<p className="mt-0.5 text-base-content/60 text-sm">
												{highlightMatch(result.subtitle, query)}
											</p>
										</div>
										<div className="hidden text-base-content/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary sm:block">
											→
										</div>
									</Card>
								</Link>
							))}
						</div>
					) : (
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
								「<span className="font-medium text-base-content">{query}</span>
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
									<Disc3 className="size-5" aria-hidden="true" />
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
