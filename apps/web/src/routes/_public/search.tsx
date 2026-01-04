import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Clock,
	Disc3,
	Music,
	Search,
	Sparkles,
	TrendingUp,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicBreadcrumb } from "@/components/public";
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
		subtitle: "156リリース · 1,234トラック",
	},
	{
		id: "sound-holic",
		type: "circle",
		title: "SOUND HOLIC",
		subtitle: "134リリース · 1,567トラック",
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
		subtitle: "89リリース · 892トラック",
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
		subtitle: "87リリース · 523トラック",
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
		icon: <Users className="h-4 w-4" aria-hidden="true" />,
		color: "text-accent",
	},
	circle: {
		label: "サークル",
		icon: <Disc3 className="h-4 w-4" aria-hidden="true" />,
		color: "text-primary",
	},
	track: {
		label: "曲",
		icon: <Music className="h-4 w-4" aria-hidden="true" />,
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
			<mark className="rounded bg-primary/20 px-0.5 text-inherit">
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
			return <Users className="h-5 w-5" aria-hidden="true" />;
		case "circle":
			return <Disc3 className="h-5 w-5" aria-hidden="true" />;
		case "track":
			return <Music className="h-5 w-5" aria-hidden="true" />;
	}
}

function getResultIconColor(type: SearchResult["type"]): string {
	switch (type) {
		case "artist":
			return "bg-accent/10 text-accent";
		case "circle":
			return "bg-primary/10 text-primary";
		case "track":
			return "bg-secondary/10 text-secondary";
	}
}

function SearchPage() {
	const { q: query = "", category = "all" } = Route.useSearch();
	const navigate = useNavigate();
	const [inputValue, setInputValue] = useState(query);
	const [searchHistory, setSearchHistory] = useState<string[]>([]);

	useEffect(() => {
		setSearchHistory(getSearchHistory());
	}, []);

	useEffect(() => {
		setInputValue(query);
	}, [query]);

	useEffect(() => {
		if (query) {
			setSearchHistory((prev) => saveSearchHistory(query, prev));
		}
	}, [query]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (inputValue.trim()) {
			navigate({
				to: "/search",
				search: { q: inputValue.trim(), category },
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
			<div className="glass-card relative overflow-hidden rounded-2xl p-6 md:p-8">
				<div className="gradient-mesh absolute inset-0" />
				<div className="relative">
					<div className="mb-6 text-center">
						<h1 className="mb-2 font-bold text-2xl md:text-3xl">楽曲を検索</h1>
						<p className="text-base-content/60 text-sm">
							アーティスト、曲名、サークル名で検索できます
						</p>
					</div>

					{/* Search form */}
					<form onSubmit={handleSearch} className="mx-auto max-w-2xl">
						<div className="relative">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
								<Search
									className="h-5 w-5 text-base-content/40"
									aria-hidden="true"
								/>
							</div>
							<input
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder="検索キーワードを入力..."
								className="glass-card-strong w-full rounded-xl py-4 pr-12 pl-14 text-base shadow-lg transition-all duration-300 placeholder:text-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
								aria-label="検索キーワード"
							/>
							{inputValue && (
								<button
									type="button"
									onClick={handleClearInput}
									className="absolute inset-y-0 right-0 flex items-center pr-5 text-base-content/40 transition-colors hover:text-base-content"
									aria-label="検索をクリア"
								>
									<X className="h-5 w-5" />
								</button>
							)}
						</div>
					</form>

					{/* Popular searches */}
					{!query && (
						<div className="mx-auto mt-6 max-w-2xl">
							<div className="flex flex-wrap items-center justify-center gap-2">
								<span className="flex items-center gap-1 text-base-content/50 text-xs">
									<TrendingUp className="h-3 w-3" aria-hidden="true" />
									人気:
								</span>
								{popularSearches.map((term) => (
									<button
										key={term}
										type="button"
										onClick={() => handleHistoryClick(term)}
										className="rounded-full bg-base-content/5 px-3 py-1 text-base-content/70 text-xs transition-all hover:bg-primary/10 hover:text-primary"
									>
										{term}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Category tabs */}
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
								className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all ${
									isActive
										? "bg-primary text-primary-content shadow-md"
										: "glass-card hover:ring-2 hover:ring-primary/20"
								}`}
								aria-pressed={isActive}
							>
								{config.icon}
								{config.label}
								<span
									className={`rounded-full px-1.5 py-0.5 text-xs ${
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
									className="glass-card group flex items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
								>
									<div
										className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${getResultIconColor(result.type)}`}
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
										<h3 className="font-semibold transition-colors group-hover:text-primary">
											{highlightMatch(result.title, query)}
										</h3>
										<p className="mt-0.5 text-base-content/60 text-sm">
											{highlightMatch(result.subtitle, query)}
										</p>
									</div>
									<div className="hidden text-base-content/30 transition-all group-hover:translate-x-1 group-hover:text-primary sm:block">
										→
									</div>
								</Link>
							))}
						</div>
					) : (
						<div className="glass-card rounded-2xl p-12 text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-base-content/5">
								<Search
									className="h-8 w-8 text-base-content/30"
									aria-hidden="true"
								/>
							</div>
							<p className="font-medium text-base-content/70">
								「{query}」に一致する結果が見つかりませんでした
							</p>
							<p className="mt-2 text-base-content/50 text-sm">
								別のキーワードで検索してみてください
							</p>
						</div>
					)}
				</div>
			) : (
				/* Search history */
				<div className="space-y-6">
					{searchHistory.length > 0 && (
						<div className="glass-card rounded-2xl p-6">
							<h2 className="mb-4 flex items-center gap-2 font-semibold">
								<Clock className="h-4 w-4 text-primary" aria-hidden="true" />
								最近の検索
							</h2>
							<div className="flex flex-wrap gap-2">
								{searchHistory.map((historyItem) => (
									<button
										key={historyItem}
										type="button"
										onClick={() => handleHistoryClick(historyItem)}
										className="flex items-center gap-2 rounded-full bg-base-content/5 px-4 py-2 text-sm transition-all hover:bg-primary/10 hover:text-primary"
									>
										<Clock
											className="h-3 w-3 text-base-content/40"
											aria-hidden="true"
										/>
										{historyItem}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Browse categories */}
					<div className="glass-card rounded-2xl p-6">
						<h2 className="mb-4 flex items-center gap-2 font-semibold">
							<Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
							カテゴリから探す
						</h2>
						<div className="grid gap-3 sm:grid-cols-3">
							<Link
								to="/circles"
								className="group flex items-center gap-3 rounded-xl bg-primary/5 p-4 transition-all hover:bg-primary/10 hover:shadow-md"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Disc3 className="h-5 w-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium">サークル</div>
									<div className="text-base-content/50 text-xs">456件</div>
								</div>
							</Link>
							<Link
								to="/artists"
								className="group flex items-center gap-3 rounded-xl bg-accent/5 p-4 transition-all hover:bg-accent/10 hover:shadow-md"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
									<Users className="h-5 w-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium">アーティスト</div>
									<div className="text-base-content/50 text-xs">890件</div>
								</div>
							</Link>
							<Link
								to="/original-songs"
								className="group flex items-center gap-3 rounded-xl bg-secondary/5 p-4 transition-all hover:bg-secondary/10 hover:shadow-md"
							>
								<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
									<Music className="h-5 w-5" aria-hidden="true" />
								</div>
								<div>
									<div className="font-medium">原曲</div>
									<div className="text-base-content/50 text-xs">1,234件</div>
								</div>
							</Link>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
