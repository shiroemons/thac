import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowDown,
	ArrowUp,
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
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
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

	// ページネーション・フィルタ・ソート状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");
	const [sortBy, setSortBy] = useState<string>("sortOrder");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [isReordering, setIsReordering] = useState(false);

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:master:platforms",
		columnConfigs,
	);

	const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
	const [editForm, setEditForm] = useState<Partial<Platform>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

	const handleCreate = async (formData: Record<string, string>) => {
		await platformsApi.create({
			code: formData.code,
			name: formData.name,
			category: formData.category || null,
			urlPattern: formData.urlPattern || null,
			sortOrder: platforms.length,
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

	const handleSort = (column: string) => {
		if (sortBy === column) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(column);
			setSortOrder("asc");
		}
		setPage(1);
	};

	const SortIcon = ({ column }: { column: string }) => {
		if (sortBy !== column) {
			return (
				<ArrowUpDown className="ml-1 inline h-4 w-4 text-base-content/30" />
			);
		}
		return sortOrder === "asc" ? (
			<ArrowUp className="ml-1 inline h-4 w-4" />
		) : (
			<ArrowDown className="ml-1 inline h-4 w-4" />
		);
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
											順序
											<SortIcon column="sortOrder" />
										</TableHead>
									)}
									{isVisible("code") && (
										<TableHead
											className="w-[150px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("code")}
										>
											コード
											<SortIcon column="code" />
										</TableHead>
									)}
									{isVisible("name") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("name")}
										>
											名前
											<SortIcon column="name" />
										</TableHead>
									)}
									{isVisible("category") && (
										<TableHead
											className="w-[120px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("category")}
										>
											カテゴリ
											<SortIcon column="category" />
										</TableHead>
									)}
									{isVisible("urlPattern") && (
										<TableHead>URLパターン</TableHead>
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
