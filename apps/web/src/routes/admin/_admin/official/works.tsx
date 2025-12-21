import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { ImportDialog } from "@/components/import-dialog";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
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
import { Select } from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
import {
	importApi,
	type OfficialWork,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

// カテゴリごとの色分け
const CATEGORY_COLORS: Record<string, BadgeVariant> = {
	pc98: "secondary",
	windows: "primary",
	zuns_music_collection: "accent",
	akyus_untouched_score: "info",
	commercial_books: "success",
	tasofro: "warning",
	other: "ghost",
};

// カテゴリコード（ID生成用）
const CATEGORY_CODES: Record<string, string> = {
	pc98: "01",
	windows: "02",
	zuns_music_collection: "03",
	akyus_untouched_score: "04",
	commercial_books: "05",
	tasofro: "06",
	other: "07",
};

export const Route = createFileRoute("/admin/_admin/official/works")({
	head: () => createPageHead("公式作品"),
	component: OfficialWorksPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "作品名" },
	{ key: "shortNameJa", label: "短縮名", defaultVisible: false },
	{ key: "categoryCode", label: "カテゴリ" },
	{ key: "seriesCode", label: "シリーズコード", defaultVisible: false },
	{ key: "numberInSeries", label: "シリーズ番号", defaultVisible: false },
	{ key: "releaseDate", label: "発売日", defaultVisible: false },
	{ key: "position", label: "表示順", defaultVisible: false },
	{ key: "officialOrganization", label: "発行元", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function OfficialWorksPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:official:works",
		columnConfigs,
	);

	const [editingWork, setEditingWork] = useState<OfficialWork | null>(null);
	const [editForm, setEditForm] = useState<Partial<OfficialWork>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<OfficialWork>>({});

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 60_000,
	});

	const categoryOptions =
		categoriesData?.data.map((c) => ({
			value: c.code,
			label: c.name,
		})) ?? [];

	// 全作品を取得（ID生成用）
	const { data: allWorksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

	// 次のIDを生成
	const generateNextId = (categoryKey: string): string => {
		const categoryCode = CATEGORY_CODES[categoryKey];
		if (!categoryCode) return "";

		const allWorks = allWorksData?.data ?? [];
		const categoryWorks = allWorks.filter((w) => w.id.startsWith(categoryCode));

		if (categoryWorks.length === 0) {
			return `${categoryCode}01`;
		}

		const maxNumber = Math.max(
			...categoryWorks.map((w) => {
				const num = Number.parseInt(w.id.slice(2), 10);
				return Number.isNaN(num) ? 0 : num;
			}),
		);

		const nextNumber = (maxNumber + 1).toString().padStart(2, "0");
		return `${categoryCode}${nextNumber}`;
	};

	const { data, isLoading, error } = useQuery({
		queryKey: ["officialWorks", page, pageSize, debouncedSearch, category],
		queryFn: () =>
			officialWorksApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				category: category || undefined,
			}),
		staleTime: 30_000,
	});

	const works = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialWorks"] });
	};

	const openCreateDialog = () => {
		setCreateForm({});
		setMutationError(null);
		setIsCreateDialogOpen(true);
	};

	const handleCreate = async () => {
		if (
			!createForm.id ||
			!createForm.categoryCode ||
			!createForm.name ||
			!createForm.nameJa
		) {
			setMutationError("必須項目を入力してください");
			return;
		}
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await officialWorksApi.create({
				id: createForm.id,
				categoryCode: createForm.categoryCode,
				name: createForm.name,
				nameJa: createForm.nameJa,
				nameEn: createForm.nameEn || null,
				shortNameJa: createForm.shortNameJa || null,
				shortNameEn: createForm.shortNameEn || null,
				seriesCode: createForm.seriesCode || null,
				numberInSeries: createForm.numberInSeries ?? null,
				releaseDate: createForm.releaseDate || null,
				officialOrganization: createForm.officialOrganization || null,
				position: createForm.position ?? null,
				notes: createForm.notes || null,
			});
			setIsCreateDialogOpen(false);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingWork) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await officialWorksApi.update(editingWork.id, {
				categoryCode: editForm.categoryCode,
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				shortNameJa: editForm.shortNameJa,
				shortNameEn: editForm.shortNameEn,
				seriesCode: editForm.seriesCode,
				numberInSeries: editForm.numberInSeries,
				releaseDate: editForm.releaseDate,
				officialOrganization: editForm.officialOrganization,
				position: editForm.position,
				notes: editForm.notes,
			});
			setEditingWork(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("この作品を削除しますか？\n※関連する楽曲もすべて削除されます"))
			return;
		try {
			await officialWorksApi.delete(id);
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

	const getCategoryName = (code: string) => {
		const cat = categoriesData?.data.find((c) => c.code === code);
		return cat?.name || code;
	};

	const getCategoryColor = (code: string): BadgeVariant => {
		return CATEGORY_COLORS[code] || "ghost";
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="公式作品管理"
				breadcrumbs={[{ label: "公式管理" }, { label: "公式作品" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="作品名で検索..."
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
						onClick: openCreateDialog,
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
									{isVisible("id") && (
										<TableHead className="w-[150px]">ID</TableHead>
									)}
									{isVisible("nameJa") && <TableHead>作品名</TableHead>}
									{isVisible("shortNameJa") && (
										<TableHead className="w-[100px]">短縮名</TableHead>
									)}
									{isVisible("categoryCode") && (
										<TableHead className="w-[140px]">カテゴリ</TableHead>
									)}
									{isVisible("seriesCode") && (
										<TableHead className="w-[100px]">シリーズ</TableHead>
									)}
									{isVisible("numberInSeries") && (
										<TableHead className="w-[60px]">番号</TableHead>
									)}
									{isVisible("releaseDate") && (
										<TableHead className="w-[100px]">発売日</TableHead>
									)}
									{isVisible("position") && (
										<TableHead className="w-[70px]">表示順</TableHead>
									)}
									{isVisible("officialOrganization") && (
										<TableHead className="w-[150px]">発行元</TableHead>
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
								{works.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									works.map((w) => (
										<TableRow key={w.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-sm">
													{w.id}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="font-medium">
													<Link
														to="/admin/official/works/$id"
														params={{ id: w.id }}
														className="hover:underline"
													>
														{w.nameJa}
													</Link>
												</TableCell>
											)}
											{isVisible("shortNameJa") && (
												<TableCell className="text-sm">
													{w.shortNameJa || "-"}
												</TableCell>
											)}
											{isVisible("categoryCode") && (
												<TableCell>
													<Badge variant={getCategoryColor(w.categoryCode)}>
														{getCategoryName(w.categoryCode)}
													</Badge>
												</TableCell>
											)}
											{isVisible("seriesCode") && (
												<TableCell className="font-mono text-sm">
													{w.seriesCode || "-"}
												</TableCell>
											)}
											{isVisible("numberInSeries") && (
												<TableCell className="text-center text-sm">
													{w.numberInSeries ?? "-"}
												</TableCell>
											)}
											{isVisible("releaseDate") && (
												<TableCell className="text-sm">
													{w.releaseDate || "-"}
												</TableCell>
											)}
											{isVisible("position") && (
												<TableCell className="text-center text-sm">
													{w.position ?? "-"}
												</TableCell>
											)}
											{isVisible("officialOrganization") && (
												<TableCell className="text-sm">
													{w.officialOrganization || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(w.createdAt),
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
														new Date(w.updatedAt),
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
														to="/admin/official/works/$id"
														params={{ id: w.id }}
													>
														<Button variant="ghost" size="icon">
															<Eye className="h-4 w-4" />
															<span className="sr-only">詳細</span>
														</Button>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setEditingWork(w);
															setEditForm({
																categoryCode: w.categoryCode,
																name: w.name,
																nameJa: w.nameJa,
																nameEn: w.nameEn,
																shortNameJa: w.shortNameJa,
																shortNameEn: w.shortNameEn,
																seriesCode: w.seriesCode,
																numberInSeries: w.numberInSeries,
																releaseDate: w.releaseDate,
																officialOrganization: w.officialOrganization,
																position: w.position,
																notes: w.notes,
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
														onClick={() => handleDelete(w.id)}
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
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>新規公式作品</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-id">
									ID <span className="text-error">*</span>
									<span className="ml-2 font-normal text-base-content/50 text-xs">
										（カテゴリ選択で自動生成）
									</span>
								</Label>
								<Input
									id="create-id"
									value={createForm.id || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, id: e.target.value })
									}
									placeholder="カテゴリを選択してください"
									className={createForm.id ? "bg-base-200" : ""}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-categoryCode">
									カテゴリ <span className="text-error">*</span>
								</Label>
								<Select
									id="create-categoryCode"
									value={createForm.categoryCode || ""}
									onChange={(e) => {
										const newCategoryCode = e.target.value;
										const newId = newCategoryCode
											? generateNextId(newCategoryCode)
											: "";
										setCreateForm({
											...createForm,
											categoryCode: newCategoryCode,
											id: newId,
										});
									}}
								>
									<option value="">選択してください</option>
									{categoryOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								名前 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
								placeholder="例: Embodiment of Scarlet Devil"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-nameJa">
									日本語名 <span className="text-error">*</span>
								</Label>
								<Input
									id="create-nameJa"
									value={createForm.nameJa || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameJa: e.target.value })
									}
									placeholder="例: 東方紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-nameEn">英語名</Label>
								<Input
									id="create-nameEn"
									value={createForm.nameEn || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameEn: e.target.value })
									}
									placeholder="例: Embodiment of Scarlet Devil"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-shortNameJa">短縮名（日本語）</Label>
								<Input
									id="create-shortNameJa"
									value={createForm.shortNameJa || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											shortNameJa: e.target.value,
										})
									}
									placeholder="例: 紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-shortNameEn">短縮名（英語）</Label>
								<Input
									id="create-shortNameEn"
									value={createForm.shortNameEn || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											shortNameEn: e.target.value,
										})
									}
									placeholder="例: EoSD"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-seriesCode">シリーズコード</Label>
								<Input
									id="create-seriesCode"
									value={createForm.seriesCode || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, seriesCode: e.target.value })
									}
									placeholder="例: TH06"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-numberInSeries">シリーズ内番号</Label>
								<Input
									id="create-numberInSeries"
									type="number"
									value={createForm.numberInSeries ?? ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											numberInSeries: e.target.value
												? Number(e.target.value)
												: null,
										})
									}
									placeholder="例: 6"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-releaseDate">発売日</Label>
								<Input
									id="create-releaseDate"
									type="date"
									value={createForm.releaseDate || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											releaseDate: e.target.value,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-position">表示順</Label>
								<Input
									id="create-position"
									type="number"
									value={createForm.position ?? ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											position: e.target.value ? Number(e.target.value) : null,
										})
									}
									placeholder="例: 1"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-officialOrganization">発行元</Label>
							<Input
								id="create-officialOrganization"
								value={createForm.officialOrganization || ""}
								onChange={(e) =>
									setCreateForm({
										...createForm,
										officialOrganization: e.target.value,
									})
								}
								placeholder="例: 上海アリス幻樂団"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-notes">備考</Label>
							<Textarea
								id="create-notes"
								value={createForm.notes || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, notes: e.target.value })
								}
								placeholder="備考を入力"
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCreateDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreate}
							disabled={isSubmitting}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingWork}
				onOpenChange={(open) => !open && setEditingWork(null)}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>公式作品の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>ID</Label>
								<Input value={editingWork?.id || ""} disabled />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-categoryCode">カテゴリ</Label>
								<Select
									id="edit-categoryCode"
									value={editForm.categoryCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, categoryCode: e.target.value })
									}
								>
									<option value="">選択してください</option>
									{categoryOptions.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</Select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: Embodiment of Scarlet Devil"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-nameJa">日本語名</Label>
								<Input
									id="edit-nameJa"
									value={editForm.nameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameJa: e.target.value })
									}
									placeholder="例: 東方紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-nameEn">英語名</Label>
								<Input
									id="edit-nameEn"
									value={editForm.nameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, nameEn: e.target.value })
									}
									placeholder="例: Embodiment of Scarlet Devil"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-shortNameJa">短縮名（日本語）</Label>
								<Input
									id="edit-shortNameJa"
									value={editForm.shortNameJa || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, shortNameJa: e.target.value })
									}
									placeholder="例: 紅魔郷"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-shortNameEn">短縮名（英語）</Label>
								<Input
									id="edit-shortNameEn"
									value={editForm.shortNameEn || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, shortNameEn: e.target.value })
									}
									placeholder="例: EoSD"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-seriesCode">シリーズコード</Label>
								<Input
									id="edit-seriesCode"
									value={editForm.seriesCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, seriesCode: e.target.value })
									}
									placeholder="例: TH06"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-numberInSeries">シリーズ内番号</Label>
								<Input
									id="edit-numberInSeries"
									type="number"
									value={editForm.numberInSeries ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											numberInSeries: e.target.value
												? Number(e.target.value)
												: null,
										})
									}
									placeholder="例: 6"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-releaseDate">発売日</Label>
								<Input
									id="edit-releaseDate"
									type="date"
									value={editForm.releaseDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, releaseDate: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-position">表示順</Label>
								<Input
									id="edit-position"
									type="number"
									value={editForm.position ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											position: e.target.value ? Number(e.target.value) : null,
										})
									}
									placeholder="例: 1"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-officialOrganization">発行元</Label>
							<Input
								id="edit-officialOrganization"
								value={editForm.officialOrganization || ""}
								onChange={(e) =>
									setEditForm({
										...editForm,
										officialOrganization: e.target.value,
									})
								}
								placeholder="例: 上海アリス幻樂団"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-notes">備考</Label>
							<Textarea
								id="edit-notes"
								value={editForm.notes || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, notes: e.target.value })
								}
								placeholder="備考を入力"
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setEditingWork(null)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleUpdate}
							disabled={isSubmitting}
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* インポートダイアログ */}
			<ImportDialog
				title="公式作品のインポート"
				onImport={importApi.officialWorks}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
