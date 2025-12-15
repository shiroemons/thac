import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2, Upload } from "lucide-react";
import { useState } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";
import {
	importApi,
	type OfficialWorkCategory,
	officialWorkCategoriesApi,
} from "@/lib/api-client";

export const Route = createFileRoute(
	"/admin/_admin/master/official-work-categories",
)({
	component: OfficialWorkCategoriesPage,
});

function OfficialWorkCategoriesPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	const [editingItem, setEditingItem] = useState<OfficialWorkCategory | null>(
		null,
	);
	const [editForm, setEditForm] = useState<Partial<OfficialWorkCategory>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["official-work-categories", page, pageSize, debouncedSearch],
		queryFn: () =>
			officialWorkCategoriesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
			}),
		staleTime: 30_000,
	});

	const items = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["official-work-categories"] });
	};

	const handleCreate = async (formData: Record<string, string>) => {
		await officialWorkCategoriesApi.create({
			code: formData.code,
			name: formData.name,
			description: formData.description || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingItem) return;
		try {
			await officialWorkCategoriesApi.update(editingItem.code, {
				name: editForm.name,
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
			await officialWorkCategoriesApi.delete(code);
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
				title="公式作品カテゴリ管理"
				breadcrumbs={[{ label: "マスタ管理" }, { label: "公式作品カテゴリ" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="名前またはコードで検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
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
									<TableHead className="w-[200px]">コード</TableHead>
									<TableHead className="w-[200px]">名前</TableHead>
									<TableHead>説明</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									items.map((c) => (
										<TableRow key={c.code}>
											<TableCell className="font-mono text-sm">
												{c.code}
											</TableCell>
											<TableCell className="font-medium">{c.name}</TableCell>
											<TableCell className="text-base-content/70">
												{c.description || "-"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingItem(c);
															setEditForm({
																name: c.name,
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
				title="新規公式作品カテゴリ"
				description="新しい公式作品カテゴリを登録します"
				fields={[
					{
						name: "code",
						label: "コード",
						placeholder: "例: windows",
						required: true,
					},
					{
						name: "name",
						label: "名前",
						placeholder: "例: Windows作品",
						required: true,
					},
					{
						name: "description",
						label: "説明",
						placeholder: "例: Windows向けに発売された作品",
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
						<DialogTitle>公式作品カテゴリの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingItem?.code || ""} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
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
				title="公式作品カテゴリのインポート"
				onImport={importApi.officialWorkCategories}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
