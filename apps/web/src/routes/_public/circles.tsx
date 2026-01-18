import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, Disc, Music, Users } from "lucide-react";
import { useRef, useState } from "react";
import {
	EmptyState,
	FilterDrawer,
	FilterDrawerTrigger,
	MobileCardItem,
	MobileCardList,
	PublicBreadcrumb,
	TwoStageScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { SearchInput } from "@/components/ui/search-input";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import type { KanaRow } from "@/lib/kana-utils";
import { publicCirclesInfiniteQueryOptions } from "@/lib/public-query-options";
import {
	type AlphabetInitial,
	parseInitialParam,
	parseRowParam,
	parseScriptParam,
	type ScriptCategory,
} from "@/lib/script-filter-utils";

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

interface CirclesSearchParams {
	script?: ScriptCategory;
	initial?: string; // A-Z
	row?: string; // あ, か, さ...
	view?: ViewMode;
	search?: string;
}

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/circles")({
	head: () => createPageHead("サークル"),
	component: CirclesPage,
	validateSearch: (search: Record<string, unknown>): CirclesSearchParams => {
		const script = parseScriptParam(search.script);
		return {
			script,
			initial:
				script === "alphabet" ? parseInitialParam(search.initial) : undefined,
			row: script === "kana" ? parseRowParam(search.row) : undefined,
			view:
				search.view === "grid" || search.view === "list" ? search.view : "list",
			search: typeof search.search === "string" ? search.search : undefined,
		};
	},
});

// =============================================================================
// コンポーネント
// =============================================================================

function CirclesPage() {
	const navigate = useNavigate();
	const {
		script = "all",
		initial,
		row,
		view = "list",
		search = "",
	} = Route.useSearch();

	// 検索入力のローカルステート（IME対応）
	const [searchInput, setSearchInput] = useState(search);
	const isComposingRef = useRef(false);
	// モバイルフィルタードロワーの状態
	const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

	// 型安全なパラメータ
	const scriptCategory = script as ScriptCategory;
	const alphabetInitial = initial as AlphabetInitial | undefined;
	const kanaRow = row as KanaRow | undefined;

	// 無限スクロールクエリ
	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
		useInfiniteQuery(
			publicCirclesInfiniteQueryOptions({
				limit: PAGE_SIZE,
				search: search || undefined,
				initialScript: scriptCategory === "all" ? undefined : scriptCategory,
				initial: scriptCategory === "alphabet" ? alphabetInitial : undefined,
				row: scriptCategory === "kana" ? kanaRow : undefined,
			}),
		);

	// ページデータをフラット化
	const circles = data?.pages.flatMap((page) => page.data) ?? [];
	const total = data?.pages[0]?.total ?? 0;

	// ナビゲーションハンドラー
	const handleScriptCategoryChange = (newScript: ScriptCategory) => {
		navigate({
			to: "/circles",
			search: { script: newScript, view, search: search || undefined },
		});
	};

	const handleAlphabetInitialChange = (newInitial: AlphabetInitial | null) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: newInitial ?? undefined,
				view,
				search: search || undefined,
			},
		});
	};

	const handleKanaRowChange = (newRow: KanaRow | null) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				row: newRow ?? undefined,
				view,
				search: search || undefined,
			},
		});
	};

	const handleViewChange = (newView: ViewMode) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				view: newView,
				search: search || undefined,
			},
		});
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchInput(value);
		// IME変換中は検索を実行しない
		if (isComposingRef.current) return;
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				view,
				search: value || undefined,
			},
		});
	};

	const handleCompositionStart = () => {
		isComposingRef.current = true;
	};

	const handleCompositionEnd = (
		e: React.CompositionEvent<HTMLInputElement>,
	) => {
		isComposingRef.current = false;
		const value = e.currentTarget.value;
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				view,
				search: value || undefined,
			},
		});
	};

	// アクティブなフィルター数を計算
	const activeFilterCount =
		(search ? 1 : 0) +
		(scriptCategory !== "all" ? 1 : 0) +
		(alphabetInitial ? 1 : 0) +
		(kanaRow ? 1 : 0);

	// フィルターをリセット
	const handleResetFilters = () => {
		setSearchInput("");
		navigate({
			to: "/circles",
			search: { view },
		});
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "サークル" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">サークル一覧</h1>
					<p className="mt-1 text-base-content/70">
						同人サークル · {formatNumber(total)}件
					</p>
				</div>
				<div className="flex items-center gap-2">
					{/* モバイル用フィルタートリガー（md未満で表示） */}
					<FilterDrawerTrigger
						onClick={() => setIsFilterDrawerOpen(true)}
						activeFilterCount={activeFilterCount}
					/>
					<ViewToggle value={view} onChange={handleViewChange} />
				</div>
			</div>

			{/* モバイル用フィルタードロワー */}
			<FilterDrawer
				isOpen={isFilterDrawerOpen}
				onClose={() => setIsFilterDrawerOpen(false)}
				title="フィルター"
				onReset={handleResetFilters}
			>
				<div className="space-y-6">
					{/* キーワード検索 */}
					<div>
						<span className="mb-2 block font-medium text-sm">
							キーワード検索:
						</span>
						<SearchInput
							value={searchInput}
							onChange={handleSearchChange}
							onCompositionStart={handleCompositionStart}
							onCompositionEnd={handleCompositionEnd}
							placeholder="サークル名で検索..."
							size="sm"
						/>
					</div>

					{/* 文字種フィルター（2段階） */}
					<div>
						<span className="mb-2 block font-medium text-sm">文字種:</span>
						<TwoStageScriptFilter
							scriptCategory={scriptCategory}
							alphabetInitial={alphabetInitial ?? null}
							kanaRow={kanaRow ?? null}
							onScriptCategoryChange={handleScriptCategoryChange}
							onAlphabetInitialChange={handleAlphabetInitialChange}
							onKanaRowChange={handleKanaRowChange}
						/>
					</div>
				</div>
			</FilterDrawer>

			{/* デスクトップ用フィルター（md以上で表示） */}
			<div className="hidden space-y-4 md:block">
				{/* キーワード検索 */}
				<div>
					<span className="mb-2 block font-medium text-sm">
						キーワード検索:
					</span>
					<SearchInput
						value={searchInput}
						onChange={handleSearchChange}
						onCompositionStart={handleCompositionStart}
						onCompositionEnd={handleCompositionEnd}
						placeholder="サークル名で検索..."
						size="sm"
						containerClassName="max-w-md"
					/>
				</div>

				{/* 文字種フィルター（2段階） */}
				<div>
					<span className="mb-2 block font-medium text-sm">文字種:</span>
					<TwoStageScriptFilter
						scriptCategory={scriptCategory}
						alphabetInitial={alphabetInitial ?? null}
						kanaRow={kanaRow ?? null}
						onScriptCategoryChange={handleScriptCategoryChange}
						onAlphabetInitialChange={handleAlphabetInitialChange}
						onKanaRowChange={handleKanaRowChange}
					/>
				</div>
			</div>

			{/* 初回ローディング */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<span className="loading loading-spinner loading-lg" />
				</div>
			) : circles.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当するサークルがありません"
					description="フィルター条件を変更してお試しください"
				/>
			) : (
				<>
					{/* モバイル用カードリスト（sm未満で表示） */}
					<MobileCardList
						items={circles}
						keyExtractor={(circle) => circle.id}
						renderCard={(circle) => (
							<Link
								to="/circles/$id"
								params={{ id: circle.id }}
								preload="intent"
								className="block"
							>
								<MobileCardItem>
									<div className="flex items-center gap-3">
										<div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
											<Building2
												className="size-6 text-primary"
												aria-hidden="true"
											/>
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="truncate font-bold text-base">
												{circle.name}
											</h3>
											{circle.sortName && (
												<p className="truncate text-base-content/60 text-sm">
													{circle.sortName}
												</p>
											)}
											<div className="mt-2 flex items-center gap-4 text-base-content/70 text-sm">
												<span className="flex items-center gap-1">
													<Disc className="size-4" aria-hidden="true" />
													{formatNumber(circle.releaseCount)}
												</span>
												<span className="flex items-center gap-1">
													<Music className="size-4" aria-hidden="true" />
													{formatNumber(circle.trackCount)}
												</span>
											</div>
										</div>
									</div>
								</MobileCardItem>
							</Link>
						)}
					/>

					{/* デスクトップ用グリッド表示（sm以上で表示） */}
					{view === "grid" ? (
						<div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{circles.map((circle) => (
								<Link
									key={circle.id}
									to="/circles/$id"
									params={{ id: circle.id }}
									preload="intent"
									className="card bg-base-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:ring-2 hover:ring-primary/10"
								>
									<div className="card-body p-4">
										<div className="flex items-center gap-3">
											<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
												<Users
													className="size-6 text-primary"
													aria-hidden="true"
												/>
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="truncate font-bold text-base">
													{circle.name}
												</h3>
												{circle.sortName && (
													<p className="truncate text-base-content/60 text-sm">
														{circle.sortName}
													</p>
												)}
											</div>
										</div>
										<div className="mt-3 flex items-center gap-4 text-base-content/70 text-sm">
											<span className="flex items-center gap-1">
												<Disc className="size-4" aria-hidden="true" />
												{formatNumber(circle.releaseCount)}リリース
											</span>
											<span className="flex items-center gap-1">
												<Music className="size-4" aria-hidden="true" />
												{formatNumber(circle.trackCount)}曲
											</span>
										</div>
									</div>
								</Link>
							))}
						</div>
					) : (
						/* デスクトップ用テーブル表示（sm以上で表示） */
						<div className="hidden overflow-x-auto sm:block">
							<table className="table">
								<thead>
									<tr>
										<th>サークル名</th>
										<th>読み</th>
										<th>リリース数</th>
										<th>曲数</th>
									</tr>
								</thead>
								<tbody>
									{circles.map((circle) => (
										<tr key={circle.id} className="hover:bg-base-200/50">
											<td>
												<Link
													to="/circles/$id"
													params={{ id: circle.id }}
													preload="intent"
													className="flex items-center gap-3 hover:text-primary"
												>
													<div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
														<Users
															className="size-4 text-primary"
															aria-hidden="true"
														/>
													</div>
													<span className="font-medium">{circle.name}</span>
												</Link>
											</td>
											<td className="text-base-content/70">
												{circle.sortName || "-"}
											</td>
											<td className="text-base-content/70">
												{formatNumber(circle.releaseCount)}
											</td>
											<td className="text-base-content/70">
												{formatNumber(circle.trackCount)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</>
			)}

			{/* 無限スクロール */}
			{!isLoading && (
				<InfiniteScroll
					onLoadMore={() => fetchNextPage()}
					isLoading={isFetchingNextPage}
					hasMore={hasNextPage ?? false}
					loadedCount={circles.length}
					totalCount={total}
				/>
			)}
		</div>
	);
}
