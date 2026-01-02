import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Download, Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ArtistEditDialog } from "@/components/admin/artist-edit-dialog";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { SortIcon } from "@/components/admin/sort-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import { useSortableTable } from "@/hooks/use-sortable-table";
import {
	type Artist,
	artistsApi,
	type ExportFormat,
	exportApi,
	INITIAL_SCRIPT_BADGE_VARIANTS,
	INITIAL_SCRIPT_LABELS,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { artistsListQueryOptions } from "@/lib/query-options";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/artists")({
	head: () => createPageHead("アーティスト"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			artistsListQueryOptions({ page: DEFAULT_PAGE, limit: DEFAULT_PAGE_SIZE }),
		),
	component: ArtistsPage,
});

const initialScriptOptions = Object.entries(INITIAL_SCRIPT_LABELS).map(
	([value, label]) => ({ value, label }),
);

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "名前" },
	{ key: "nameJa", label: "日本語名" },
	{ key: "nameEn", label: "英語名" },
	{ key: "sortName", label: "ソート用名" },
	{ key: "initialScript", label: "文字種" },
	{ key: "nameInitial", label: "頭文字" },
	{ key: "notes", label: "備考" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function ArtistsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [initialScript, setInitialScript] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "name",
		defaultSortOrder: "asc",
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:artists",
		columnConfigs,
	);

	const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// 選択状態管理
	const {
		selectedItems,
		isSelected,
		isAllSelected,
		isIndeterminate,
		toggleItem,
		toggleAll,
		clearSelection,
		selectedCount,
	} = useRowSelection<Artist>();

	// 一括削除ダイアログ状態
	const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
	const [isBatchDeleting, setIsBatchDeleting] = useState(false);
	const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// エクスポート状態
	const [isExporting, setIsExporting] = useState(false);

	// ensureQueryData + queryOptionsパターン
	// ローダーでプリフェッチしたデータを自動的に使用
	const { data, isPending, isFetching, error } = useQuery(
		artistsListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			initialScript: initialScript || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const artists = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["artists"] });
	};

	const handleExport = async (
		format: ExportFormat,
		includeRelations: boolean,
	) => {
		setIsExporting(true);
		try {
			await exportApi.artists({
				format,
				includeRelations,
				search: debouncedSearch || undefined,
				initialScript: initialScript || undefined,
			});
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "エクスポートに失敗しました",
			);
		} finally {
			setIsExporting(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await artistsApi.delete(deleteTarget.id);
			setDeleteTarget(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleBatchDelete = async () => {
		setIsBatchDeleting(true);
		setBatchDeleteError(null);

		try {
			const ids = Array.from(selectedItems.values()).map((item) => item.id);

			if (ids.length === 0) {
				setBatchDeleteError("削除可能なアーティストがありません");
				return;
			}

			const result = await artistsApi.batchDelete(ids);

			if (result.failed.length > 0) {
				setBatchDeleteError(
					`${result.deleted.length}件削除、${result.failed.length}件失敗`,
				);
			} else {
				setIsBatchDeleteDialogOpen(false);
				clearSelection();
			}

			invalidateQuery();
		} catch (e) {
			setBatchDeleteError(
				e instanceof Error ? e.message : "一括削除に失敗しました",
			);
		} finally {
			setIsBatchDeleting(false);
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

	const handleInitialScriptChange = (value: string) => {
		setInitialScript(value);
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
					<li>アーティスト管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">アーティスト管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					isLoading={isFetching}
					filterOptions={initialScriptOptions}
					filterValue={initialScript}
					filterPlaceholder="頭文字の文字種"
					onFilterChange={handleInitialScriptChange}
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
						...(selectedCount > 0
							? [
									{
										label: `選択中の${selectedCount}件を削除`,
										icon: <Trash2 className="mr-2 h-4 w-4" />,
										onClick: () => setIsBatchDeleteDialogOpen(true),
									},
								]
							: []),
						{
							label: "TSVでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", false),
							disabled: isExporting,
						},
						{
							label: "JSONでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", false),
							disabled: isExporting,
						},
						{
							label: "TSV（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", true),
							disabled: isExporting,
						},
						{
							label: "JSON（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", true),
							disabled: isExporting,
						},
					]}
				>
					{selectedCount > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-base-content/70 text-sm">
								{selectedCount}件選択中
							</span>
							<Button variant="ghost" size="sm" onClick={clearSelection}>
								選択解除
							</Button>
						</div>
					)}
				</DataTableActionBar>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
					<DataTableSkeleton
						rows={5}
						columns={6}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[50px]">
										<Checkbox
											checked={isAllSelected(artists)}
											indeterminate={isIndeterminate(artists)}
											onCheckedChange={() => toggleAll(artists)}
											aria-label="すべて選択"
										/>
									</TableHead>
									{isVisible("id") && (
										<TableHead
											className="w-[220px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("id")}
										>
											ID
											<SortIcon
												column="id"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("name") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("name")}
										>
											名前
											<SortIcon
												column="name"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("nameJa") && (
										<TableHead
											className="w-[150px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("nameJa")}
										>
											日本語名
											<SortIcon
												column="nameJa"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("nameEn") && (
										<TableHead className="w-[150px]">英語名</TableHead>
									)}
									{isVisible("sortName") && (
										<TableHead className="w-[150px]">ソート用名</TableHead>
									)}
									{isVisible("initialScript") && (
										<TableHead className="w-[120px]">文字種</TableHead>
									)}
									{isVisible("nameInitial") && (
										<TableHead className="w-[120px]">頭文字</TableHead>
									)}
									{isVisible("notes") && (
										<TableHead className="w-[200px]">備考</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("createdAt")}
										>
											作成日時
											<SortIcon
												column="createdAt"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("updatedAt")}
										>
											更新日時
											<SortIcon
												column="updatedAt"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{artists.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											該当するアーティストが見つかりません
										</TableCell>
									</TableRow>
								) : (
									artists.map((artist) => (
										<TableRow
											key={artist.id}
											className={
												isSelected(artist.id) ? "bg-primary/5" : undefined
											}
										>
											<TableCell>
												<Checkbox
													checked={isSelected(artist.id)}
													onCheckedChange={() => toggleItem(artist)}
													aria-label={`${artist.name}を選択`}
												/>
											</TableCell>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{artist.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													{artist.name}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="text-base-content/70">
													{artist.nameJa || "-"}
												</TableCell>
											)}
											{isVisible("nameEn") && (
												<TableCell className="text-base-content/70">
													{artist.nameEn || "-"}
												</TableCell>
											)}
											{isVisible("sortName") && (
												<TableCell className="text-base-content/70">
													{artist.sortName || "-"}
												</TableCell>
											)}
											{isVisible("initialScript") && (
												<TableCell>
													<Badge
														variant={
															INITIAL_SCRIPT_BADGE_VARIANTS[
																artist.initialScript
															]
														}
													>
														{INITIAL_SCRIPT_LABELS[artist.initialScript]}
													</Badge>
												</TableCell>
											)}
											{isVisible("nameInitial") && (
												<TableCell className="font-mono">
													{artist.nameInitial || "-"}
												</TableCell>
											)}
											{isVisible("notes") && (
												<TableCell className="max-w-[200px] truncate text-base-content/70">
													{artist.notes || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(artist.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(artist.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/artists/$id"
														params={{ id: artist.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingArtist(artist);
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
														onClick={() => setDeleteTarget(artist)}
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
			<ArtistEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<ArtistEditDialog
				open={!!editingArtist}
				onOpenChange={(open) => {
					if (!open) setEditingArtist(null);
				}}
				mode="edit"
				artist={editingArtist}
				onSuccess={invalidateQuery}
			/>

			{/* 一括削除確認ダイアログ */}
			<ConfirmDialog
				open={isBatchDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsBatchDeleteDialogOpen(open);
					if (!open) {
						setBatchDeleteError(null);
					}
				}}
				title="アーティストの一括削除"
				description={
					<div>
						<p>選択した{selectedCount}件のアーティストを削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する別名義も削除されます。この操作は取り消せません。
						</p>
						{batchDeleteError && (
							<p className="mt-2 text-error text-sm">{batchDeleteError}</p>
						)}
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleBatchDelete}
				isLoading={isBatchDeleting}
			/>

			{/* 個別削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				title="アーティストの削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する別名義も削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
