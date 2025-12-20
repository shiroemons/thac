import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2, Upload } from "lucide-react";
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

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

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

	const { data, isLoading, error } = useQuery({
		queryKey: ["alias-types", page, pageSize, debouncedSearch],
		queryFn: () =>
			aliasTypesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
			}),
		staleTime: 30_000,
	});

	const items = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["alias-types"] });
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
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="名義種別管理"
				breadcrumbs={[{ label: "マスタ管理" }, { label: "名義種別" }]}
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
									{isVisible("code") && (
										<TableHead className="w-[150px]">コード</TableHead>
									)}
									{isVisible("label") && (
										<TableHead className="w-[200px]">ラベル</TableHead>
									)}
									{isVisible("description") && <TableHead>説明</TableHead>}
									<TableHead className="w-[70px]" />
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
									items.map((a) => (
										<TableRow key={a.code}>
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
