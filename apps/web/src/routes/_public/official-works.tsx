import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Disc3, Gamepad2, Music, Package } from "lucide-react";
import { useMemo } from "react";
import {
	calculateTotalPages,
	EmptyState,
	Pagination,
	PublicBreadcrumb,
	paginateData,
	type ViewMode,
	ViewToggle,
} from "@/components/public";
import { createPageHead } from "@/lib/head";
import {
	getWorksByProductType,
	getWorkWithStats,
	productTypes,
} from "@/mocks/official";
import type { OfficialWorkWithStats, ProductType } from "@/types/official";

// =============================================================================
// URL パラメータの定義と検証
// =============================================================================

interface OfficialWorksSearchParams {
	type?: ProductType | "all";
	page?: number;
	view?: ViewMode;
}

const PRODUCT_TYPES = [
	"pc98",
	"windows",
	"zuns_music_collection",
	"akyus_untouched_score",
	"commercial_books",
	"tasofro",
	"other",
] as const;

function isValidProductType(value: unknown): value is ProductType | "all" {
	if (typeof value !== "string") return false;
	return value === "all" || PRODUCT_TYPES.includes(value as ProductType);
}

function parseTypeParam(value: unknown): ProductType | "all" {
	return isValidProductType(value) ? value : "all";
}

function parsePageParam(value: unknown): number {
	if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isNaN(parsed) && parsed >= 1) return parsed;
	}
	return 1;
}

export const Route = createFileRoute("/_public/official-works")({
	head: () => createPageHead("原作"),
	component: OfficialWorksPage,
	validateSearch: (
		search: Record<string, unknown>,
	): OfficialWorksSearchParams => {
		return {
			type: parseTypeParam(search.type),
			page: parsePageParam(search.page),
			view:
				search.view === "grid" || search.view === "list" ? search.view : "list",
		};
	},
});

// =============================================================================
// カテゴリ設定
// =============================================================================

interface CategoryConfig {
	label: string;
	icon: React.ReactNode;
	badgeClass: string;
}

const categoryConfig: Record<ProductType | "all", CategoryConfig> = {
	all: { label: "すべて", icon: null, badgeClass: "" },
	pc98: {
		label: "PC-98",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-primary",
	},
	windows: {
		label: "Windows",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-primary",
	},
	zuns_music_collection: {
		label: "ZUN's Music Collection",
		icon: <Disc3 className="size-4" />,
		badgeClass: "badge-secondary",
	},
	akyus_untouched_score: {
		label: "幺樂団の歴史",
		icon: <Disc3 className="size-4" />,
		badgeClass: "badge-secondary",
	},
	commercial_books: {
		label: "商業書籍",
		icon: <BookOpen className="size-4" />,
		badgeClass: "badge-accent",
	},
	tasofro: {
		label: "黄昏フロンティア",
		icon: <Gamepad2 className="size-4" />,
		badgeClass: "badge-info",
	},
	other: {
		label: "その他",
		icon: <Package className="size-4" />,
		badgeClass: "badge-ghost",
	},
};

// =============================================================================
// ページサイズ
// =============================================================================
const PAGE_SIZE = 20;

// =============================================================================
// メインコンポーネント
// =============================================================================

function OfficialWorksPage() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { type = "all", page = 1, view = "list" } = Route.useSearch();

	// カテゴリでフィルタリングした作品一覧（統計付き）
	const worksWithStats = useMemo(() => {
		const works = getWorksByProductType(type);
		return works.map(getWorkWithStats);
	}, [type]);

	// ページネーション
	const totalPages = calculateTotalPages(worksWithStats.length, PAGE_SIZE);
	const paginatedWorks = paginateData(worksWithStats, page, PAGE_SIZE);

	// カテゴリ変更
	const handleTypeChange = (newType: ProductType | "all") => {
		navigate({
			search: { type: newType, page: 1, view },
		});
	};

	// ページ変更
	const handlePageChange = (newPage: number) => {
		navigate({
			search: { type, page: newPage, view },
		});
	};

	// 表示モード変更
	const handleViewChange = (newView: ViewMode) => {
		navigate({
			search: { type, page, view: newView },
		});
	};

	return (
		<div className="space-y-6">
			<PublicBreadcrumb items={[{ label: "公式作品" }]} />

			{/* ヘッダー */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-bold text-3xl">公式作品一覧</h1>
					<p className="mt-1 text-base-content/70">
						東方Project公式作品 · {worksWithStats.length}件
					</p>
				</div>
				<ViewToggle value={view} onChange={handleViewChange} />
			</div>

			{/* カテゴリフィルター */}
			<div className="space-y-2">
				<h2 className="font-medium text-base-content/70 text-sm">
					カテゴリを選択
				</h2>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						className={`btn btn-sm ${type === "all" ? "btn-primary" : "btn-ghost"}`}
						onClick={() => handleTypeChange("all")}
						aria-pressed={type === "all"}
					>
						すべて
					</button>
					{productTypes.map((pt) => (
						<button
							key={pt.code}
							type="button"
							className={`btn btn-sm gap-1 ${type === pt.code ? "btn-primary" : "btn-ghost"}`}
							onClick={() => handleTypeChange(pt.code)}
							aria-pressed={type === pt.code}
						>
							{categoryConfig[pt.code].icon}
							{pt.name}
						</button>
					))}
				</div>
			</div>

			{/* 作品一覧 */}
			{paginatedWorks.length === 0 ? (
				<EmptyState
					type="filter"
					title="該当する作品がありません"
					description="別のカテゴリを選択してお試しください"
				/>
			) : (
				<>
					{view === "grid" ? (
						<WorksGridView works={paginatedWorks} />
					) : (
						<WorksListView works={paginatedWorks} />
					)}

					{/* ページネーション */}
					{totalPages > 1 && (
						<Pagination
							currentPage={page}
							totalPages={totalPages}
							onPageChange={handlePageChange}
						/>
					)}
				</>
			)}
		</div>
	);
}

// =============================================================================
// グリッドビュー
// =============================================================================

interface WorksViewProps {
	works: OfficialWorkWithStats[];
}

function WorksGridView({ works }: WorksViewProps) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{works.map((work) => (
				<Link
					key={work.id}
					to="/official-works/$id"
					params={{ id: work.id }}
					className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
				>
					<div className="card-body p-4">
						<div className="flex items-start justify-between gap-2">
							<h3 className="card-title text-base">{work.shortName}</h3>
							<span
								className={`badge badge-sm ${categoryConfig[work.productType].badgeClass}`}
							>
								{categoryConfig[work.productType].label}
							</span>
						</div>
						<p className="line-clamp-2 text-base-content/70 text-sm">
							{work.name}
						</p>
						<div className="mt-2 flex items-center gap-4 text-base-content/50 text-sm">
							<span>No.{work.seriesNumber}</span>
							{work.songCount > 0 && (
								<span className="flex items-center gap-1">
									<Music className="size-3" aria-hidden="true" />
									{work.songCount}曲
								</span>
							)}
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}

// =============================================================================
// リストビュー
// =============================================================================

function WorksListView({ works }: WorksViewProps) {
	return (
		<div className="overflow-x-auto">
			<table className="table">
				<thead>
					<tr>
						<th>No.</th>
						<th>タイトル</th>
						<th>カテゴリ</th>
						<th>曲数</th>
					</tr>
				</thead>
				<tbody>
					{works.map((work) => (
						<tr key={work.id} className="hover:bg-base-200/50">
							<td className="w-16 text-base-content/70">{work.seriesNumber}</td>
							<td>
								<Link
									to="/official-works/$id"
									params={{ id: work.id }}
									className="hover:text-primary"
								>
									<div className="font-medium">{work.shortName}</div>
									<div className="line-clamp-1 text-base-content/70 text-sm">
										{work.name}
									</div>
								</Link>
							</td>
							<td>
								<span
									className={`badge badge-sm ${categoryConfig[work.productType].badgeClass}`}
								>
									{categoryConfig[work.productType].label}
								</span>
							</td>
							<td className="text-base-content/70">
								{work.songCount > 0 ? `${work.songCount}曲` : "-"}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
