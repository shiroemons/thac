import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Disc, Music, Users } from "lucide-react";
import { useRef, useState } from "react";
import {
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	TwoStageScriptFilter,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { SearchInput } from "@/components/ui/search-input";
import { formatNumber } from "@/lib/format";
import { createPageHead } from "@/lib/head";
import type { KanaRow } from "@/lib/kana-utils";
import { publicApi } from "@/lib/public-api";
import {
	type AlphabetInitial,
	parseInitialParam,
	parsePageParam,
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
	page?: number;
	view?: ViewMode;
	search?: string;
}

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_public/circles")({
	head: () => createPageHead("サークル"),
	loaderDeps: ({ search }) => ({
		script: search.script,
		initial: search.initial,
		row: search.row,
		page: search.page,
		search: search.search,
	}),
	loader: async ({ deps }) => {
		const { script, initial, row, page, search } = deps;

		try {
			const response = await publicApi.circles.list({
				page: page || 1,
				limit: PAGE_SIZE,
				initialScript: script === "all" ? undefined : script,
				initial: script === "alphabet" ? initial : undefined,
				row: script === "kana" ? row : undefined,
				sortBy: "releaseCount",
				sortOrder: "desc",
				search: search || undefined,
			});
			return { circles: response.data, total: response.total };
		} catch {
			return { circles: [], total: 0 };
		}
	},
	component: CirclesPage,
	validateSearch: (search: Record<string, unknown>): CirclesSearchParams => {
		const script = parseScriptParam(search.script);
		return {
			script,
			initial:
				script === "alphabet" ? parseInitialParam(search.initial) : undefined,
			row: script === "kana" ? parseRowParam(search.row) : undefined,
			page: parsePageParam(search.page),
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
		page = 1,
		view = "list",
		search = "",
	} = Route.useSearch();
	const { circles, total } = Route.useLoaderData();

	// 検索入力のローカルステート（IME対応）
	const [searchInput, setSearchInput] = useState(search);
	const isComposingRef = useRef(false);

	// 型安全なパラメータ
	const scriptCategory = script as ScriptCategory;
	const alphabetInitial = initial as AlphabetInitial | undefined;
	const kanaRow = row as KanaRow | undefined;

	// ページネーション
	const totalPages = Math.ceil(total / PAGE_SIZE);

	// ナビゲーションハンドラー
	const handleScriptCategoryChange = (newScript: ScriptCategory) => {
		navigate({
			to: "/circles",
			search: { script: newScript, page: 1, view, search: search || undefined },
		});
	};

	const handleAlphabetInitialChange = (newInitial: AlphabetInitial | null) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: newInitial ?? undefined,
				page: 1,
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
				page: 1,
				view,
				search: search || undefined,
			},
		});
	};

	const handlePageChange = (newPage: number) => {
		navigate({
			to: "/circles",
			search: {
				script: scriptCategory,
				initial: alphabetInitial,
				row: kanaRow,
				page: newPage,
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
				page,
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
				page: 1,
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
				page: 1,
				view,
				search: value || undefined,
			},
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
				<ViewToggle value={view} onChange={handleViewChange} />
			</div>

			{/* フィルター */}
			<div className="space-y-4">
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

			{/* サークル一覧 */}
			{circles.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当するサークルがありません"
					description="フィルター条件を変更してお試しください"
				/>
			) : view === "grid" ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{circles.map((circle) => (
						<Link
							key={circle.id}
							to="/circles/$id"
							params={{ id: circle.id }}
							className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="card-body p-4">
								<div className="flex items-center gap-3">
									<div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
										<Users className="size-6 text-primary" aria-hidden="true" />
									</div>
									<div className="min-w-0 flex-1">
										<h3 className="truncate font-bold text-base">
											{circle.name}
										</h3>
										{circle.sortName && (
											<p className="truncate text-base-content/50 text-sm">
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
				<div className="overflow-x-auto">
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

			{/* ページネーション */}
			{totalPages > 1 && (
				<Pagination
					currentPage={page}
					totalPages={totalPages}
					onPageChange={handlePageChange}
				/>
			)}
		</div>
	);
}
