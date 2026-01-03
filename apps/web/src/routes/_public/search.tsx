import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Disc, Music, Search, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PublicBreadcrumb } from "@/components/public";

type SearchCategory = "all" | "artist" | "circle" | "track";

interface SearchParams {
	q?: string;
	category?: SearchCategory;
}

export const Route = createFileRoute("/_public/search")({
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

const categoryConfig: Record<
	SearchCategory,
	{ label: string; icon: React.ReactNode }
> = {
	all: { label: "すべて", icon: null },
	artist: {
		label: "アーティスト",
		icon: <Users className="size-4" aria-hidden="true" />,
	},
	circle: {
		label: "サークル",
		icon: <Disc className="size-4" aria-hidden="true" />,
	},
	track: {
		label: "曲",
		icon: <Music className="size-4" aria-hidden="true" />,
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
			<mark className="bg-primary/30 text-inherit">
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
			return <Users className="size-5 text-accent" aria-hidden="true" />;
		case "circle":
			return <Disc className="size-5 text-primary" aria-hidden="true" />;
		case "track":
			return <Music className="size-5 text-secondary" aria-hidden="true" />;
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

	// 検索実行時に履歴を保存
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

	// 検索結果のフィルタリングとモック検索
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

	// カテゴリ別の件数
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
			<PublicBreadcrumb items={[{ label: "検索結果" }]} />

			{/* 検索フォーム */}
			<form onSubmit={handleSearch}>
				<div className="relative">
					<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
						<Search
							className="size-5 text-base-content/50"
							aria-hidden="true"
						/>
					</div>
					<input
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						placeholder="アーティスト、曲名、サークル名で検索..."
						className="input input-bordered w-full pr-12 pl-12"
						aria-label="検索キーワード"
					/>
					{inputValue && (
						<button
							type="button"
							onClick={handleClearInput}
							className="absolute inset-y-0 right-0 flex items-center pr-4"
							aria-label="検索をクリア"
						>
							<X className="size-5 text-base-content/50 hover:text-base-content" />
						</button>
					)}
				</div>
			</form>

			{/* カテゴリタブ */}
			{query && (
				<div role="tablist" className="tabs tabs-box" aria-label="検索カテゴリ">
					{(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => (
						<button
							key={cat}
							type="button"
							role="tab"
							onClick={() => handleCategoryChange(cat)}
							className={`tab gap-2 ${category === cat ? "tab-active" : ""}`}
							aria-selected={category === cat}
						>
							{categoryConfig[cat].icon}
							{categoryConfig[cat].label}
							<span className="text-base-content/50">
								({categoryCounts[cat]})
							</span>
						</button>
					))}
				</div>
			)}

			{/* 検索結果 */}
			{query ? (
				<div className="space-y-4">
					<p className="text-base-content/70">
						「<span className="font-medium text-base-content">{query}</span>
						」の検索結果: {searchResults.length}件
					</p>

					{searchResults.length > 0 ? (
						<div className="space-y-2">
							{searchResults.map((result) => (
								<Link
									key={`${result.type}-${result.id}`}
									to={getResultHref(result)}
									className="flex items-start gap-4 rounded-lg bg-base-100 p-4 shadow-sm transition-shadow hover:shadow-md"
								>
									<div className="flex size-10 items-center justify-center rounded-full bg-base-200">
										{getResultIcon(result.type)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="badge badge-ghost badge-sm">
												{categoryConfig[result.type].label}
											</span>
										</div>
										<h3 className="mt-1 font-medium">
											{highlightMatch(result.title, query)}
										</h3>
										<p className="mt-0.5 text-base-content/70 text-sm">
											{highlightMatch(result.subtitle, query)}
										</p>
									</div>
								</Link>
							))}
						</div>
					) : (
						<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
							<Search
								className="mx-auto size-12 text-base-content/30"
								aria-hidden="true"
							/>
							<p className="mt-4 text-base-content/70">
								「{query}」に一致する結果が見つかりませんでした。
							</p>
							<p className="mt-2 text-base-content/50 text-sm">
								別のキーワードで検索してみてください。
							</p>
						</div>
					)}
				</div>
			) : (
				/* 検索履歴（クエリがない場合） */
				<div className="space-y-4">
					{searchHistory.length > 0 && (
						<div>
							<h2 className="mb-3 flex items-center gap-2 font-medium text-base-content/70">
								<Clock className="size-4" aria-hidden="true" />
								最近の検索
							</h2>
							<div className="flex flex-wrap gap-2">
								{searchHistory.map((historyItem) => (
									<button
										key={historyItem}
										type="button"
										onClick={() => handleHistoryClick(historyItem)}
										className="btn btn-ghost btn-sm"
									>
										{historyItem}
									</button>
								))}
							</div>
						</div>
					)}

					<div className="rounded-lg bg-base-100 p-8 text-center shadow-sm">
						<Search
							className="mx-auto size-12 text-base-content/30"
							aria-hidden="true"
						/>
						<p className="mt-4 text-base-content/70">
							アーティスト、曲名、サークル名で検索できます。
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
