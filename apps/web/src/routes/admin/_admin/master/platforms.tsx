import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowUpDown,
	ChevronDown,
	ChevronUp,
	Eye,
	Home,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { PlatformEditDialog } from "@/components/admin/platform-edit-dialog";
import { SortIcon } from "@/components/admin/sort-icon";
import { ImportDialog } from "@/components/import-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { useSortableTable } from "@/hooks/use-sortable-table";
import { importApi, type Platform, platformsApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/platforms")({
	head: () => createPageHead("プラットフォーム"),
	component: PlatformsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "sortOrder", label: "順序", defaultVisible: false },
	{ key: "code", label: "コード" },
	{ key: "name", label: "名前" },
	{ key: "category", label: "カテゴリ" },
	{ key: "urlPattern", label: "URLパターン" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

const categoryColors: Record<string, string> = {
	streaming: "bg-blue-500",
	video: "bg-red-500",
	download: "bg-green-500",
	shop: "bg-purple-500",
	other: "bg-gray-500",
};

const categoryLabels: Record<string, string> = {
	streaming: "ストリーミング",
	video: "動画",
	download: "ダウンロード",
	shop: "ショップ",
	other: "その他",
};

const categoryOptions = [
	{ value: "streaming", label: "ストリーミング" },
	{ value: "video", label: "動画" },
	{ value: "download", label: "ダウンロード" },
	{ value: "shop", label: "ショップ" },
	{ value: "other", label: "その他" },
];

function PlatformsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");
	const [isReordering, setIsReordering] = useState(false);

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "sortOrder",
		defaultSortOrder: "asc",
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:master:platforms",
		columnConfigs,
	);

	const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<Platform | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const { data, isPending, error } = useQuery({
		queryKey: [
			"platforms",
			page,
			pageSize,
			debouncedSearch,
			category,
			sortBy,
			sortOrder,
		],
		queryFn: () =>
			platformsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				category: category || undefined,
				sortBy,
				sortOrder,
			}),
		staleTime: 30_000,
	});

	const platforms = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["platforms"] });
	};

	// 並べ替えが無効な条件
	const isReorderDisabled =
		!!debouncedSearch || !!category || sortBy !== "sortOrder";

	// 上へ移動
	const handleMoveUp = async (platform: Platform, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevPlatform = platforms[index - 1];
		try {
			await platformsApi.update(platform.code, {
				sortOrder: prevPlatform.sortOrder,
			});
			await platformsApi.update(prevPlatform.code, {
				sortOrder: platform.sortOrder,
			});
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 下へ移動
	const handleMoveDown = async (platform: Platform, index: number) => {
		if (index === platforms.length - 1 || isReorderDisabled) return;
		const nextPlatform = platforms[index + 1];
		try {
			await platformsApi.update(platform.code, {
				sortOrder: nextPlatform.sortOrder,
			});
			await platformsApi.update(nextPlatform.code, {
				sortOrder: platform.sortOrder,
			});
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 順序を整理
	const handleReorder = async () => {
		if (platforms.length === 0) return;
		setIsReordering(true);
		try {
			const items = platforms.map((p, index) => ({
				code: p.code,
				sortOrder: index,
			}));
			await platformsApi.reorder(items);
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序の整理に失敗しました",
			);
		} finally {
			setIsReordering(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await platformsApi.delete(deleteTarget.code);
			setDeleteTarget(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		} finally {
			setIsDeleting(false);
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
					<li>プラットフォーム管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">プラットフォーム管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前またはコードで検索..."
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
							label: isReordering ? "整理中..." : "順序を整理",
							icon: <ArrowUpDown className="mr-2 h-4 w-4" />,
							onClick: handleReorder,
							disabled: isReordering || platforms.length === 0,
						},
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
									<TableHead className="w-[100px]">並び替え</TableHead>
									{isVisible("sortOrder") && (
										<TableHead
											className="w-[80px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("sortOrder")}
										>
											<span className="flex items-center gap-1">
												順序
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="sortOrder"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("code") && (
										<TableHead
											className="w-[150px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("code")}
										>
											<span className="flex items-center gap-1">
												コード
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="code"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("name") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("name")}
										>
											<span className="flex items-center gap-1">
												名前
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="name"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("category") && (
										<TableHead
											className="w-[120px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("category")}
										>
											<span className="flex items-center gap-1">
												カテゴリ
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="category"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("urlPattern") && (
										<TableHead>URLパターン</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("createdAt")}
										>
											<span className="flex items-center gap-1">
												作成日時
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="createdAt"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("updatedAt")}
										>
											<span className="flex items-center gap-1">
												更新日時
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="updatedAt"
												/>
											</span>
										</TableHead>
									)}
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{platforms.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									platforms.map((p, index) => (
										<TableRow key={p.code}>
											<TableCell>
												<div className="flex items-center gap-1">
													<span className="w-8 text-center text-base-content/50 text-sm">
														{p.sortOrder}
													</span>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveUp(p, index)}
														disabled={index === 0 || isReorderDisabled}
														title="上へ移動"
													>
														<ChevronUp className="h-4 w-4" />
														<span className="sr-only">上へ移動</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveDown(p, index)}
														disabled={
															index === platforms.length - 1 ||
															isReorderDisabled
														}
														title="下へ移動"
													>
														<ChevronDown className="h-4 w-4" />
														<span className="sr-only">下へ移動</span>
													</Button>
												</div>
											</TableCell>
											{isVisible("sortOrder") && (
												<TableCell className="text-base-content/50 text-sm">
													{p.sortOrder}
												</TableCell>
											)}
											{isVisible("code") && (
												<TableCell className="font-mono text-sm">
													{p.code}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">{p.name}</TableCell>
											)}
											{isVisible("category") && (
												<TableCell>
													{p.category ? (
														<Badge
															variant="secondary"
															className={`${categoryColors[p.category] || "bg-gray-500"} text-white`}
														>
															{categoryLabels[p.category] || p.category}
														</Badge>
													) : (
														<span className="text-base-content/50">-</span>
													)}
												</TableCell>
											)}
											{isVisible("urlPattern") && (
												<TableCell className="max-w-[300px] truncate font-mono text-base-content/70 text-xs">
													{p.urlPattern || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(p.createdAt),
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
														new Date(p.updatedAt),
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
														to="/admin/master/platforms/$code"
														params={{ code: p.code }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setEditingPlatform(p)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteTarget(p)}
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
			<PlatformEditDialog
				mode="create"
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				currentPlatformsCount={platforms.length}
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<PlatformEditDialog
				mode="edit"
				open={!!editingPlatform}
				onOpenChange={(open) => !open && setEditingPlatform(null)}
				platform={editingPlatform}
				onSuccess={invalidateQuery}
			/>

			{/* インポートダイアログ */}
			<ImportDialog
				title="プラットフォームのインポート"
				onImport={importApi.platforms}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
				title="プラットフォームの削除"
				description={`「${deleteTarget?.name}」を削除しますか？この操作は取り消せません。`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
