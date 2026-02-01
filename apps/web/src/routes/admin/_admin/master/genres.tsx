import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowUpDown,
	ChevronDown,
	ChevronUp,
	Home,
	Pencil,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { GenreEditDialog } from "@/components/admin/genre-edit-dialog";
import { SortIcon } from "@/components/admin/sort-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GenreBadge } from "@/components/ui/genre-badge";
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
import { type Genre, genresApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { genreMutations } from "@/lib/mutation-options";

export const Route = createFileRoute("/admin/_admin/master/genres")({
	head: () => createPageHead("ジャンル"),
	component: GenresPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "sortOrder", label: "順序", defaultVisible: false },
	{ key: "code", label: "コード" },
	{ key: "name", label: "名前" },
	{ key: "color", label: "色" },
	{ key: "icon", label: "アイコン" },
	{ key: "description", label: "説明", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function GenresPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");

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
		"admin:master:genres",
		columnConfigs,
	);

	const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<Genre | null>(null);

	// Mutations
	const deleteMutation = useMutation(genreMutations.delete(queryClient));
	const updateMutation = useMutation(genreMutations.update(queryClient));
	const reorderMutation = useMutation(genreMutations.reorder(queryClient));

	const { data, isPending, isFetching, error } = useQuery({
		queryKey: ["genres", page, pageSize, debouncedSearch, sortBy, sortOrder],
		queryFn: () =>
			genresApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				sortBy,
				sortOrder,
			}),
		staleTime: 30_000,
	});

	const genres = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["genres"] });
	};

	// 並べ替えが無効な条件
	const isReorderDisabled = !!debouncedSearch || sortBy !== "sortOrder";

	// 上へ移動
	const handleMoveUp = (genre: Genre, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevGenre = genres[index - 1];
		// 順番に2つの更新を実行
		updateMutation.mutate(
			{ code: genre.code, data: { sortOrder: prevGenre.sortOrder } },
			{
				onSuccess: () => {
					updateMutation.mutate({
						code: prevGenre.code,
						data: { sortOrder: genre.sortOrder },
					});
				},
			},
		);
	};

	// 下へ移動
	const handleMoveDown = (genre: Genre, index: number) => {
		if (index === genres.length - 1 || isReorderDisabled) return;
		const nextGenre = genres[index + 1];
		// 順番に2つの更新を実行
		updateMutation.mutate(
			{ code: genre.code, data: { sortOrder: nextGenre.sortOrder } },
			{
				onSuccess: () => {
					updateMutation.mutate({
						code: nextGenre.code,
						data: { sortOrder: genre.sortOrder },
					});
				},
			},
		);
	};

	// 順序を整理（連番に振り直し）
	const handleReorder = () => {
		if (genres.length === 0) return;
		const items = genres.map((g, index) => ({
			code: g.code,
			sortOrder: index,
		}));
		reorderMutation.mutate(items);
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		deleteMutation.mutate(deleteTarget.code, {
			onSuccess: () => {
				setDeleteTarget(null);
			},
		});
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

	const mutationError =
		deleteMutation.error || updateMutation.error || reorderMutation.error;
	const displayError =
		(mutationError instanceof Error ? mutationError.message : null) ||
		(error instanceof Error ? error.message : null);

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
					<li>ジャンル管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">ジャンル管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前またはコードで検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					isLoading={isFetching}
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
							label: reorderMutation.isPending ? "整理中..." : "順序を整理",
							icon: <ArrowUpDown className="h-4 w-4" />,
							onClick: handleReorder,
							disabled: reorderMutation.isPending || genres.length === 0,
						},
					]}
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error p-4 text-error-content text-sm">
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
											onClick={() => handleSort("nameJa")}
										>
											<span className="flex items-center gap-1">
												名前
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="nameJa"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("color") && (
										<TableHead className="w-[100px]">色</TableHead>
									)}
									{isVisible("icon") && (
										<TableHead className="w-[100px]">アイコン</TableHead>
									)}
									{isVisible("description") && (
										<TableHead>説明</TableHead>
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
								{genres.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									genres.map((g, index) => (
										<TableRow key={g.code}>
											<TableCell>
												<div className="flex items-center gap-1">
													<span className="w-8 text-center text-base-content/50 text-sm">
														{g.sortOrder}
													</span>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveUp(g, index)}
														disabled={index === 0 || isReorderDisabled}
														title="上へ移動"
													>
														<ChevronUp className="h-4 w-4" />
														<span className="sr-only">上へ移動</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveDown(g, index)}
														disabled={
															index === genres.length - 1 || isReorderDisabled
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
													{g.sortOrder}
												</TableCell>
											)}
											{isVisible("code") && (
												<TableCell className="font-mono text-sm">
													{g.code}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell>
													<GenreBadge
														code={g.code}
														name={g.nameJa}
														color={g.color}
														icon={g.icon}
													/>
													<span className="ml-2 text-sm text-base-content/60">
														{g.nameEn}
													</span>
												</TableCell>
											)}
											{isVisible("color") && (
												<TableCell>
													<div className="flex items-center gap-2">
														<span
															className="size-4 rounded border border-base-300"
															style={{ backgroundColor: g.color }}
														/>
														<span className="font-mono text-sm text-base-content/70">
															{g.color}
														</span>
													</div>
												</TableCell>
											)}
											{isVisible("icon") && (
												<TableCell className="font-mono text-sm text-base-content/70">
													{g.icon}
												</TableCell>
											)}
											{isVisible("description") && (
												<TableCell className="max-w-[200px] truncate text-sm text-base-content/70">
													{g.description || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(g.createdAt),
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
														new Date(g.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => setEditingGenre(g)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteTarget(g)}
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
			<GenreEditDialog
				mode="create"
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				currentGenresCount={genres.length}
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<GenreEditDialog
				mode="edit"
				open={!!editingGenre}
				onOpenChange={(open) => !open && setEditingGenre(null)}
				genre={editingGenre}
				onSuccess={invalidateQuery}
			/>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						deleteMutation.reset();
					}
				}}
				title="ジャンルの削除"
				description={`「${deleteTarget?.nameJa}」を削除しますか？この操作は取り消せません。`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
