import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, Eye, Home, Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { SortIcon } from "@/components/admin/sort-icon";
import { CreateDialog } from "@/components/create-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { type AliasType, aliasTypesApi, importApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/alias-types")({
	head: () => createPageHead("名義種別"),
	component: AliasTypesPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "code", label: "コード" },
	{ key: "label", label: "ラベル" },
	{ key: "description", label: "説明" },
] as const;

function AliasTypesPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ・ソート状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [isReordering, setIsReordering] = useState(false);

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// ソート状態管理
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:master:alias-types",
		columnConfigs,
	);

	const [editingItem, setEditingItem] = useState<AliasType | null>(null);
	const [editForm, setEditForm] = useState<Partial<AliasType>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	const { data, isPending, error } = useQuery({
		queryKey: [
			"alias-types",
			page,
			pageSize,
			debouncedSearch,
			sortBy,
			sortOrder,
		],
		queryFn: () =>
			aliasTypesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				sortBy,
				sortOrder,
			}),
		staleTime: 30_000,
	});

	const items = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["alias-types"] });
	};

	// 並べ替えが無効な条件
	const isReorderDisabled = !!debouncedSearch || sortBy !== "sortOrder";

	// 上へ移動
	const handleMoveUp = async (item: AliasType, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevItem = items[index - 1];
		try {
			await aliasTypesApi.update(item.code, { sortOrder: prevItem.sortOrder });
			await aliasTypesApi.update(prevItem.code, { sortOrder: item.sortOrder });
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 下へ移動
	const handleMoveDown = async (item: AliasType, index: number) => {
		if (index === items.length - 1 || isReorderDisabled) return;
		const nextItem = items[index + 1];
		try {
			await aliasTypesApi.update(item.code, { sortOrder: nextItem.sortOrder });
			await aliasTypesApi.update(nextItem.code, { sortOrder: item.sortOrder });
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 順序を整理
	const handleReorder = async () => {
		if (items.length === 0) return;
		setIsReordering(true);
		try {
			const reorderItems = items.map((item, index) => ({
				code: item.code,
				sortOrder: index,
			}));
			await aliasTypesApi.reorder(reorderItems);
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序の整理に失敗しました",
			);
		} finally {
			setIsReordering(false);
		}
	};

	const handleCreate = async (formData: Record<string, string>) => {
		await aliasTypesApi.create({
			code: formData.code,
			label: formData.label,
			description: formData.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await aliasTypesApi.update(editingItem.code, {
				label: editForm.label,
				description: editForm.description,
			});
			setEditingItem(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await aliasTypesApi.delete(code);
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
					<li>名義種別管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">名義種別管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="ラベルまたはコードで検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
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
							disabled: isReordering || items.length === 0,
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
						columns={4}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead
										className="w-[120px] cursor-pointer select-none hover:bg-base-200"
										onClick={() => handleSort("sortOrder")}
									>
										並び替え
										<SortIcon
											column="sortOrder"
											sortBy={sortBy}
											sortOrder={sortOrder}
										/>
									</TableHead>
									{isVisible("code") && (
										<TableHead
											className="w-[150px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("code")}
										>
											コード
											<SortIcon
												column="code"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("label") && (
										<TableHead
											className="w-[200px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("label")}
										>
											ラベル
											<SortIcon
												column="label"
												sortBy={sortBy}
												sortOrder={sortOrder}
											/>
										</TableHead>
									)}
									{isVisible("description") && <TableHead>説明</TableHead>}
									<TableHead className="w-[100px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									items.map((a, index) => (
										<TableRow key={a.code}>
											<TableCell>
												<ReorderButtons
													sortOrder={a.sortOrder}
													onMoveUp={() => handleMoveUp(a, index)}
													onMoveDown={() => handleMoveDown(a, index)}
													isFirst={index === 0}
													isLast={index === items.length - 1}
													disabled={isReorderDisabled}
												/>
											</TableCell>
											{isVisible("code") && (
												<TableCell className="font-mono text-sm">
													{a.code}
												</TableCell>
											)}
											{isVisible("label") && (
												<TableCell className="font-medium">{a.label}</TableCell>
											)}
											{isVisible("description") && (
												<TableCell className="text-base-content/70">
													{a.description || "-"}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/master/alias-types/$code"
														params={{ code: a.code }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingItem(a);
															setEditForm({
																label: a.label,
																description: a.description,
															});
														}}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(a.code)}
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
			<CreateDialog
				title="新規名義種別"
				description="新しい名義種別を登録します"
				fields={[
					{
						name: "code",
						label: "コード",
						placeholder: "例: romanization",
						required: true,
					},
					{
						name: "label",
						label: "ラベル",
						placeholder: "例: ローマ字表記",
						required: true,
					},
					{
						name: "description",
						label: "説明",
						placeholder: "例: アーティスト名のローマ字表記",
					},
				]}
				onCreate={handleCreate}
				onSuccess={invalidateQuery}
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingItem}
				onOpenChange={(open) => !open && setEditingItem(null)}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>名義種別の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingItem?.code || ""} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-label">ラベル</Label>
							<Input
								id="edit-label"
								value={editForm.label || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, label: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-description">説明</Label>
							<Input
								id="edit-description"
								value={editForm.description || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, description: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingItem(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* インポートダイアログ */}
			<ImportDialog
				title="名義種別のインポート"
				onImport={importApi.aliasTypes}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
