import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowUpDown,
	ChevronDown,
	ChevronUp,
	Eye,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
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
import { type CreditRole, creditRolesApi, importApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/credit-roles")({
	head: () => createPageHead("クレジット役割"),
	component: CreditRolesPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "sortOrder", label: "順序", defaultVisible: false },
	{ key: "code", label: "コード" },
	{ key: "label", label: "ラベル" },
	{ key: "description", label: "説明" },
] as const;

function CreditRolesPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ・ソート状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [isReordering, setIsReordering] = useState(false);

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:master:credit-roles",
		columnConfigs,
	);

	const [editingItem, setEditingItem] = useState<CreditRole | null>(null);
	const [editForm, setEditForm] = useState<Partial<CreditRole>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["credit-roles", page, pageSize, debouncedSearch],
		queryFn: () =>
			creditRolesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
			}),
		staleTime: 30_000,
	});

	const items = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["credit-roles"] });
	};

	// 並べ替えが無効な条件
	const isReorderDisabled = !!debouncedSearch;

	// 上へ移動
	const handleMoveUp = async (item: CreditRole, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevItem = items[index - 1];
		try {
			await creditRolesApi.update(item.code, { sortOrder: prevItem.sortOrder });
			await creditRolesApi.update(prevItem.code, { sortOrder: item.sortOrder });
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 下へ移動
	const handleMoveDown = async (item: CreditRole, index: number) => {
		if (index === items.length - 1 || isReorderDisabled) return;
		const nextItem = items[index + 1];
		try {
			await creditRolesApi.update(item.code, { sortOrder: nextItem.sortOrder });
			await creditRolesApi.update(nextItem.code, { sortOrder: item.sortOrder });
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
			await creditRolesApi.reorder(reorderItems);
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
		await creditRolesApi.create({
			code: formData.code,
			label: formData.label,
			description: formData.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await creditRolesApi.update(editingItem.code, {
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
			await creditRolesApi.delete(code);
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
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="クレジット役割管理"
				breadcrumbs={[{ label: "マスタ管理" }, { label: "クレジット役割" }]}
			/>

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

				{isLoading ? (
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
									<TableHead className="w-[100px]">並び替え</TableHead>
									{isVisible("sortOrder") && (
										<TableHead className="w-[80px]">順序</TableHead>
									)}
									{isVisible("code") && (
										<TableHead className="w-[150px]">コード</TableHead>
									)}
									{isVisible("label") && (
										<TableHead className="w-[200px]">ラベル</TableHead>
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
									items.map((c, index) => (
										<TableRow key={c.code}>
											<TableCell>
												<div className="flex items-center gap-1">
													<span className="w-8 text-center text-base-content/50 text-sm">
														{c.sortOrder}
													</span>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveUp(c, index)}
														disabled={index === 0 || isReorderDisabled}
														title="上へ移動"
													>
														<ChevronUp className="h-4 w-4" />
														<span className="sr-only">上へ移動</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleMoveDown(c, index)}
														disabled={
															index === items.length - 1 || isReorderDisabled
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
													{c.sortOrder}
												</TableCell>
											)}
											{isVisible("code") && (
												<TableCell className="font-mono text-sm">
													{c.code}
												</TableCell>
											)}
											{isVisible("label") && (
												<TableCell className="font-medium">{c.label}</TableCell>
											)}
											{isVisible("description") && (
												<TableCell className="text-base-content/70">
													{c.description || "-"}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/master/credit-roles/$code"
														params={{ code: c.code }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingItem(c);
															setEditForm({
																label: c.label,
																description: c.description,
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
														onClick={() => handleDelete(c.code)}
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
				title="新規クレジット役割"
				description="新しいクレジット役割を登録します"
				fields={[
					{
						name: "code",
						label: "コード",
						placeholder: "例: composer",
						required: true,
					},
					{
						name: "label",
						label: "ラベル",
						placeholder: "例: 作曲",
						required: true,
					},
					{
						name: "description",
						label: "説明",
						placeholder: "例: 楽曲の作曲者",
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
						<DialogTitle>クレジット役割の編集</DialogTitle>
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
				title="クレジット役割のインポート"
				onImport={importApi.creditRoles}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
