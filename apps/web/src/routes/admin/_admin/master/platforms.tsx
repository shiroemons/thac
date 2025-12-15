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
import { Badge } from "@/components/ui/badge";
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
import { importApi, type Platform, platformsApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/master/platforms")({
	component: PlatformsPage,
});

const categoryColors: Record<string, string> = {
	streaming: "bg-blue-500",
	video: "bg-red-500",
	download: "bg-green-500",
	shop: "bg-purple-500",
};

const categoryOptions = [
	{ value: "streaming", label: "Streaming" },
	{ value: "video", label: "Video" },
	{ value: "download", label: "Download" },
	{ value: "shop", label: "Shop" },
];

function PlatformsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
	const [editForm, setEditForm] = useState<Partial<Platform>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

	const { data, isLoading, error } = useQuery({
		queryKey: ["platforms", page, pageSize, debouncedSearch, category],
		queryFn: () =>
			platformsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				category: category || undefined,
			}),
		staleTime: 30_000,
	});

	const platforms = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["platforms"] });
	};

	const handleCreate = async (formData: Record<string, string>) => {
		await platformsApi.create({
			code: formData.code,
			name: formData.name,
			category: formData.category || null,
			urlPattern: formData.urlPattern || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingPlatform) return;
		try {
			await platformsApi.update(editingPlatform.code, {
				name: editForm.name,
				category: editForm.category,
				urlPattern: editForm.urlPattern,
			});
			setEditingPlatform(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async (code: string) => {
		if (!confirm(`「${code}」を削除しますか？`)) return;
		try {
			await platformsApi.delete(code);
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

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="プラットフォーム管理"
				breadcrumbs={[
					{ label: "ダッシュボード", href: "/admin" },
					{ label: "マスタ管理" },
					{ label: "プラットフォーム" },
				]}
			/>

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
						columns={5}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[150px]">コード</TableHead>
									<TableHead>名前</TableHead>
									<TableHead className="w-[120px]">カテゴリ</TableHead>
									<TableHead>URLパターン</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{platforms.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									platforms.map((p) => (
										<TableRow key={p.code}>
											<TableCell className="font-mono text-sm">
												{p.code}
											</TableCell>
											<TableCell className="font-medium">{p.name}</TableCell>
											<TableCell>
												{p.category ? (
													<Badge
														variant="secondary"
														className={`${categoryColors[p.category] || "bg-gray-500"} text-white`}
													>
														{p.category}
													</Badge>
												) : (
													<span className="text-base-content/50">-</span>
												)}
											</TableCell>
											<TableCell className="max-w-[300px] truncate font-mono text-base-content/70 text-xs">
												{p.urlPattern || "-"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingPlatform(p);
															setEditForm({
																name: p.name,
																category: p.category,
																urlPattern: p.urlPattern,
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
														onClick={() => handleDelete(p.code)}
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
				title="新規プラットフォーム"
				description="新しいプラットフォームを登録します"
				fields={[
					{
						name: "code",
						label: "コード",
						placeholder: "例: spotify",
						required: true,
					},
					{
						name: "name",
						label: "名前",
						placeholder: "例: Spotify",
						required: true,
					},
					{
						name: "category",
						label: "カテゴリ",
						placeholder: "例: streaming",
					},
					{
						name: "urlPattern",
						label: "URLパターン",
						placeholder: "例: ^https?://open\\.spotify\\.com/",
					},
				]}
				onCreate={handleCreate}
				onSuccess={invalidateQuery}
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingPlatform}
				onOpenChange={(open) => !open && setEditingPlatform(null)}
			>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>プラットフォームの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={editingPlatform?.code || ""} disabled />
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
							<Label htmlFor="edit-category">カテゴリ</Label>
							<Input
								id="edit-category"
								value={editForm.category || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, category: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-urlPattern">URLパターン</Label>
							<Input
								id="edit-urlPattern"
								value={editForm.urlPattern || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, urlPattern: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingPlatform(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* インポートダイアログ */}
			<ImportDialog
				title="プラットフォームのインポート"
				onImport={importApi.platforms}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
