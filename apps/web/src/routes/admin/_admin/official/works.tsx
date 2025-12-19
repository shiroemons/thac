import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Pencil, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
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
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
import {
	importApi,
	type OfficialWork,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/official/works")({
	component: OfficialWorksPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "作品名" },
	{ key: "categoryCode", label: "カテゴリ" },
	{ key: "seriesCode", label: "シリーズ" },
	{ key: "releaseDate", label: "発売日" },
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

	const handleCreate = async (formData: Record<string, string>) => {
		await officialWorksApi.create({
			id: formData.id,
			categoryCode: formData.categoryCode,
			name: formData.name,
			nameJa: formData.nameJa,
			nameEn: formData.nameEn || null,
			shortNameJa: formData.shortNameJa || null,
			shortNameEn: formData.shortNameEn || null,
			seriesCode: formData.seriesCode || null,
			numberInSeries: formData.numberInSeries
				? Number(formData.numberInSeries)
				: null,
			releaseDate: formData.releaseDate || null,
			officialOrganization: formData.officialOrganization || null,
			position: formData.position ? Number(formData.position) : null,
			notes: formData.notes || null,
		});
	};

	const handleUpdate = async () => {
		if (!editingWork) return;
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
									{isVisible("id") && (
										<TableHead className="w-[150px]">ID</TableHead>
									)}
									{isVisible("nameJa") && <TableHead>作品名</TableHead>}
									{isVisible("categoryCode") && (
										<TableHead className="w-[120px]">カテゴリ</TableHead>
									)}
									{isVisible("seriesCode") && (
										<TableHead className="w-[100px]">シリーズ</TableHead>
									)}
									{isVisible("releaseDate") && (
										<TableHead className="w-[100px]">発売日</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead className="w-[160px]">作成日時</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead className="w-[160px]">更新日時</TableHead>
									)}
									<TableHead className="w-[70px]" />
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
													{w.nameJa}
												</TableCell>
											)}
											{isVisible("categoryCode") && (
												<TableCell>
													<Badge variant="secondary">
														{getCategoryName(w.categoryCode)}
													</Badge>
												</TableCell>
											)}
											{isVisible("seriesCode") && (
												<TableCell className="font-mono text-sm">
													{w.seriesCode || "-"}
												</TableCell>
											)}
											{isVisible("releaseDate") && (
												<TableCell className="text-sm">
													{w.releaseDate || "-"}
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
			<CreateDialog
				title="新規公式作品"
				description="新しい公式作品を登録します"
				fields={[
					{
						name: "id",
						label: "ID",
						placeholder: "例: th06",
						required: true,
					},
					{
						name: "categoryCode",
						label: "カテゴリコード",
						placeholder: "例: game",
						required: true,
					},
					{
						name: "name",
						label: "名前",
						placeholder: "例: Embodiment of Scarlet Devil",
						required: true,
					},
					{
						name: "nameJa",
						label: "日本語名",
						placeholder: "例: 東方紅魔郷",
						required: true,
					},
					{
						name: "nameEn",
						label: "英語名",
						placeholder: "例: Embodiment of Scarlet Devil",
					},
					{
						name: "shortNameJa",
						label: "短縮名（日本語）",
						placeholder: "例: 紅魔郷",
					},
					{
						name: "shortNameEn",
						label: "短縮名（英語）",
						placeholder: "例: EoSD",
					},
					{
						name: "seriesCode",
						label: "シリーズコード",
						placeholder: "例: TH06",
					},
					{
						name: "numberInSeries",
						label: "シリーズ内番号",
						placeholder: "例: 6",
					},
					{
						name: "releaseDate",
						label: "発売日",
						placeholder: "例: 2002-08-11",
					},
					{
						name: "officialOrganization",
						label: "発行元",
						placeholder: "例: 上海アリス幻樂団",
					},
					{
						name: "position",
						label: "表示順",
						placeholder: "例: 1",
					},
					{
						name: "notes",
						label: "備考",
						placeholder: "備考を入力",
					},
				]}
				onCreate={handleCreate}
				onSuccess={invalidateQuery}
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
			/>

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
						<div className="grid gap-2">
							<Label>ID</Label>
							<Input value={editingWork?.id || ""} disabled />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-categoryCode">カテゴリコード</Label>
								<Input
									id="edit-categoryCode"
									value={editForm.categoryCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, categoryCode: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-seriesCode">シリーズコード</Label>
								<Input
									id="edit-seriesCode"
									value={editForm.seriesCode || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, seriesCode: e.target.value })
									}
								/>
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
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-releaseDate">発売日</Label>
								<Input
									id="edit-releaseDate"
									value={editForm.releaseDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, releaseDate: e.target.value })
									}
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
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
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
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-notes">備考</Label>
							<Input
								id="edit-notes"
								value={editForm.notes || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, notes: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingWork(null)}>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
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
