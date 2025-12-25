import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { OfficialWorkEditDialog } from "@/components/admin/official-work-edit-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
import {
	importApi,
	type OfficialWork,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { officialWorksListQueryOptions } from "@/lib/query-options";

// 初期表示用のデフォルト値
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

// カテゴリごとの色分け
const CATEGORY_COLORS: Record<string, BadgeVariant> = {
	pc98: "secondary",
	windows: "primary",
	zuns_music_collection: "accent",
	akyus_untouched_score: "info",
	commercial_books: "success",
	tasofro: "warning",
	other: "ghost",
};

export const Route = createFileRoute("/admin/_admin/official/works")({
	head: () => createPageHead("公式作品"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			officialWorksListQueryOptions({
				page: DEFAULT_PAGE,
				limit: DEFAULT_PAGE_SIZE,
			}),
		),
	component: OfficialWorksPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "作品名" },
	{ key: "shortNameJa", label: "短縮名", defaultVisible: false },
	{ key: "categoryCode", label: "カテゴリ" },
	{ key: "numberInSeries", label: "シリーズ番号", defaultVisible: false },
	{ key: "releaseDate", label: "発売日", defaultVisible: false },
	{ key: "position", label: "表示順", defaultVisible: false },
	{ key: "officialOrganization", label: "発行元", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function OfficialWorksPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:official:works",
		columnConfigs,
	);

	const [editingWork, setEditingWork] = useState<OfficialWork | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});

	const categoryOptions =
		categoriesData?.data.map((c) => ({
			value: c.code,
			label: c.name,
		})) ?? [];

	const { data, isPending, error } = useQuery(
		officialWorksListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			category: category || undefined,
		}),
	);

	const works = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialWorks"] });
	};

	const handleDelete = async (id: string) => {
		if (!confirm("この作品を削除しますか？\n※関連する楽曲もすべて削除されます"))
			return;
		try {
			await officialWorksApi.delete(id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	const handleCategoryChange = (value: string) => {
		setCategory(value);
		setPage(1);
	};

	const getCategoryName = (code: string) => {
		const cat = categoriesData?.data.find((c) => c.code === code);
		return cat?.name || code;
	};

	const getCategoryColor = (code: string): BadgeVariant => {
		return CATEGORY_COLORS[code] || "ghost";
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>公式作品管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">公式作品管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="作品名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={categoryOptions}
					filterValue={category}
					filterPlaceholder="カテゴリを選択"
					onFilterChange={handleCategoryChange}
					columnVisibility={{
						columns: columnConfigs,
						visibleColumns,
						onToggle: toggleColumn,
					}}
					primaryAction={{
						label: "新規作成",
						onClick: () => setIsCreateDialogOpen(true),
					}}
					secondaryActions={[
						{
							label: "インポート",
							icon: <Upload className="mr-2 h-4 w-4" />,
							onClick: () => setIsImportDialogOpen(true),
						},
					]}
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
					<DataTableSkeleton
						rows={5}
						columns={5}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									{isVisible("id") && (
										<TableHead className="w-[150px]">ID</TableHead>
									)}
									{isVisible("nameJa") && <TableHead>作品名</TableHead>}
									{isVisible("shortNameJa") && (
										<TableHead className="w-[100px]">短縮名</TableHead>
									)}
									{isVisible("categoryCode") && (
										<TableHead className="w-[140px]">カテゴリ</TableHead>
									)}
									{isVisible("numberInSeries") && (
										<TableHead className="w-[60px]">番号</TableHead>
									)}
									{isVisible("releaseDate") && (
										<TableHead className="w-[100px]">発売日</TableHead>
									)}
									{isVisible("position") && (
										<TableHead className="w-[70px]">表示順</TableHead>
									)}
									{isVisible("officialOrganization") && (
										<TableHead className="w-[150px]">発行元</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead className="w-[160px]">作成日時</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead className="w-[160px]">更新日時</TableHead>
									)}
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{works.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									works.map((w) => (
										<TableRow key={w.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-sm">
													{w.id}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="font-medium">
													<Link
														to="/admin/official/works/$id"
														params={{ id: w.id }}
														className="hover:underline"
													>
														{w.nameJa}
													</Link>
												</TableCell>
											)}
											{isVisible("shortNameJa") && (
												<TableCell className="text-sm">
													{w.shortNameJa || "-"}
												</TableCell>
											)}
											{isVisible("categoryCode") && (
												<TableCell>
													<Badge variant={getCategoryColor(w.categoryCode)}>
														{getCategoryName(w.categoryCode)}
													</Badge>
												</TableCell>
											)}
											{isVisible("numberInSeries") && (
												<TableCell className="text-center text-sm">
													{w.numberInSeries ?? "-"}
												</TableCell>
											)}
											{isVisible("releaseDate") && (
												<TableCell className="text-sm">
													{w.releaseDate || "-"}
												</TableCell>
											)}
											{isVisible("position") && (
												<TableCell className="text-center text-sm">
													{w.position ?? "-"}
												</TableCell>
											)}
											{isVisible("officialOrganization") && (
												<TableCell className="text-sm">
													{w.officialOrganization || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(w.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(w.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/official/works/$id"
														params={{ id: w.id }}
													>
														<Button variant="ghost" size="icon">
															<Eye className="h-4 w-4" />
															<span className="sr-only">詳細</span>
														</Button>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingWork(w);
															setMutationError(null);
														}}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(w.id)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>

						<div className="border-base-300 border-t p-4">
							<DataTablePagination
								page={page}
								pageSize={pageSize}
								total={total}
								onPageChange={handlePageChange}
								onPageSizeChange={handlePageSizeChange}
							/>
						</div>
					</>
				)}
			</div>

			{/* 新規作成ダイアログ */}
			<OfficialWorkEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<OfficialWorkEditDialog
				open={!!editingWork}
				onOpenChange={(open) => {
					if (!open) setEditingWork(null);
				}}
				mode="edit"
				work={editingWork}
				onSuccess={invalidateQuery}
			/>

			{/* インポートダイアログ */}
			<ImportDialog
				title="公式作品のインポート"
				onImport={importApi.officialWorks}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
