import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { type CreditRole, creditRolesApi, importApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/credit-roles")({
	component: CreditRolesPage,
});

function CreditRolesPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [searchQuery, setSearchQuery] = useState("");
	const [editingItem, setEditingItem] = useState<CreditRole | null>(null);
	const [editForm, setEditForm] = useState<Partial<CreditRole>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["credit-roles", page, pageSize],
		queryFn: () => creditRolesApi.list({ page, limit: pageSize }),
		staleTime: 30_000,
	});

	// クライアントサイドでフィルタリング
	const allItems = data?.data ?? [];
	const filteredItems = allItems.filter((item) => {
		const matchesSearch =
			searchQuery === "" ||
			item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.code.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	const serverTotal = data?.total ?? 0;
	const isFiltering = searchQuery !== "";
	// フィルタリング中はフィルタ結果の件数を、それ以外はサーバーの総件数を使用
	const displayTotal = isFiltering ? filteredItems.length : serverTotal;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["credit-roles"] });
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

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="クレジット役割管理"
				description={`${serverTotal}件のクレジット役割が登録されています`}
				breadcrumbs={[
					{ label: "ダッシュボード", href: "/admin" },
					{ label: "マスタ管理", href: "/admin" },
					{ label: "クレジット役割" },
				]}
			>
				<ImportDialog
					title="クレジット役割のインポート"
					onImport={importApi.creditRoles}
					onSuccess={invalidateQuery}
				/>
			</AdminPageHeader>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="ラベルまたはコードで検索..."
					searchValue={searchQuery}
					onSearchChange={setSearchQuery}
					primaryAction={{
						label: "新規作成",
						onClick: () => setIsCreateDialogOpen(true),
					}}
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
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[150px]">コード</TableHead>
									<TableHead className="w-[200px]">ラベル</TableHead>
									<TableHead>説明</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredItems.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={4}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									filteredItems.map((c) => (
										<TableRow key={c.code}>
											<TableCell className="font-mono text-sm">
												{c.code}
											</TableCell>
											<TableCell className="font-medium">{c.label}</TableCell>
											<TableCell className="text-base-content/70">
												{c.description || "-"}
											</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon">
															<MoreHorizontal className="h-4 w-4" />
															<span className="sr-only">メニューを開く</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															onClick={() => {
																setEditingItem(c);
																setEditForm({
																	label: c.label,
																	description: c.description,
																});
															}}
														>
															<Pencil className="mr-2 h-4 w-4" />
															編集
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-error"
															onClick={() => handleDelete(c.code)}
														>
															<Trash2 className="mr-2 h-4 w-4" />
															削除
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
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
								total={displayTotal}
								onPageChange={setPage}
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
		</div>
	);
}
