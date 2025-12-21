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
import { SearchableGroupedSelect } from "@/components/ui/searchable-grouped-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
	type OfficialSong,
	officialSongsApi,
	officialWorkCategoriesApi,
	officialWorksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/official/songs")({
	head: () => createPageHead("公式楽曲"),
	component: OfficialSongsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "nameJa", label: "楽曲名" },
	{ key: "workName", label: "作品" },
	{ key: "trackNumber", label: "トラック", defaultVisible: false },
	{ key: "composerName", label: "作曲者", defaultVisible: false },
	{ key: "arrangerName", label: "編曲者", defaultVisible: false },
	{ key: "isOriginal", label: "オリジナル" },
	{ key: "sourceSongName", label: "原曲", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function OfficialSongsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [workId, setWorkId] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:official:songs",
		columnConfigs,
	);

	const [editingSong, setEditingSong] = useState<OfficialSong | null>(null);
	const [editForm, setEditForm] = useState<Partial<OfficialSong>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<
		Record<string, string | boolean>
	>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 作品一覧を取得（セレクトボックス用）
	const { data: worksData } = useQuery({
		queryKey: ["officialWorks", "all"],
		queryFn: () => officialWorksApi.list({ limit: 1000 }),
		staleTime: 60_000,
	});

	// カテゴリ一覧を取得
	const { data: categoriesData } = useQuery({
		queryKey: ["officialWorkCategories"],
		queryFn: () => officialWorkCategoriesApi.list({ limit: 100 }),
		staleTime: 300_000,
	});

	// 楽曲一覧を取得（原曲選択用）
	const { data: allSongsData } = useQuery({
		queryKey: ["officialSongs", "all"],
		queryFn: () => officialSongsApi.list({ limit: 5000 }),
		staleTime: 60_000,
	});

	const { data, isLoading, error } = useQuery({
		queryKey: ["officialSongs", page, pageSize, debouncedSearch, workId],
		queryFn: () =>
			officialSongsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				workId: workId || undefined,
			}),
		staleTime: 30_000,
	});

	const songs = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["officialSongs"] });
	};

	// 作品選択肢（カテゴリ別グループ）
	const workGroups = useMemo(() => {
		const works = worksData?.data ?? [];
		const categories = categoriesData?.data ?? [];

		// カテゴリコードをラベルにマッピング
		const categoryMap = new Map(categories.map((c) => [c.code, c.name]));

		// 作品をカテゴリ別にグループ化
		const grouped = new Map<string, { value: string; label: string }[]>();

		for (const w of works) {
			const categoryCode = w.categoryCode || "other";
			if (!grouped.has(categoryCode)) {
				grouped.set(categoryCode, []);
			}
			grouped.get(categoryCode)?.push({
				value: w.id,
				label: w.nameJa || w.name,
			});
		}

		// カテゴリ順にソートしてグループ配列を作成
		const categoryOrder = [
			"pc98",
			"windows",
			"zuns_music_collection",
			"akyus_untouched_score",
			"commercial_books",
			"tasofro",
			"other",
		];

		return categoryOrder
			.filter((code) => grouped.has(code))
			.map((code) => ({
				label: categoryMap.get(code) || code,
				options: grouped.get(code) || [],
			}));
	}, [worksData, categoriesData]);

	// フィルター用のフラットな作品選択肢
	const workOptions = useMemo(() => {
		return (worksData?.data ?? []).map((w) => ({
			value: w.id,
			label: w.nameJa || w.name,
		}));
	}, [worksData]);

	// 原曲選択肢（自身を除外）
	const sourceSongOptions = useMemo(() => {
		const currentId = editingSong?.id || (createForm.id as string);
		return (allSongsData?.data ?? [])
			.filter((s) => s.id !== currentId)
			.map((s) => ({
				value: s.id,
				label: `${s.nameJa} (${s.workName || "作品なし"})`,
			}));
	}, [allSongsData, editingSong?.id, createForm.id]);

	const openCreateDialog = () => {
		setCreateForm({ isOriginal: true });
		setMutationError(null);
		setIsCreateDialogOpen(true);
	};

	const handleCreate = async () => {
		if (!createForm.id || !createForm.name || !createForm.nameJa) {
			setMutationError("ID、名前、日本語名は必須です");
			return;
		}

		setIsSubmitting(true);
		setMutationError(null);
		try {
			await officialSongsApi.create({
				id: createForm.id as string,
				officialWorkId: (createForm.officialWorkId as string) || null,
				trackNumber: createForm.trackNumber
					? Number.parseInt(createForm.trackNumber as string, 10)
					: null,
				name: createForm.name as string,
				nameJa: createForm.nameJa as string,
				nameEn: (createForm.nameEn as string) || null,
				composerName: (createForm.composerName as string) || null,
				arrangerName: (createForm.arrangerName as string) || null,
				isOriginal: createForm.isOriginal !== false,
				sourceSongId: createForm.isOriginal
					? null
					: (createForm.sourceSongId as string) || null,
				notes: (createForm.notes as string) || null,
			});
			setIsCreateDialogOpen(false);
			setCreateForm({ isOriginal: true });
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingSong) return;

		// 自己参照チェック
		if (editForm.sourceSongId === editingSong.id) {
			setMutationError("自身を原曲に指定することはできません");
			return;
		}

		setIsSubmitting(true);
		setMutationError(null);
		try {
			await officialSongsApi.update(editingSong.id, {
				officialWorkId: editForm.officialWorkId,
				trackNumber: editForm.trackNumber,
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				composerName: editForm.composerName,
				arrangerName: editForm.arrangerName,
				isOriginal: editForm.isOriginal,
				sourceSongId: editForm.isOriginal ? null : editForm.sourceSongId,
				notes: editForm.notes,
			});
			setEditingSong(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("この楽曲を削除しますか？")) return;
		try {
			await officialSongsApi.delete(id);
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

	const handleWorkIdChange = (value: string) => {
		setWorkId(value);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="公式楽曲管理"
				breadcrumbs={[{ label: "公式管理" }, { label: "公式楽曲" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="楽曲名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={workOptions}
					filterValue={workId}
					filterPlaceholder="作品を選択"
					onFilterChange={handleWorkIdChange}
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
										<TableHead className="w-[200px]">ID</TableHead>
									)}
									{isVisible("nameJa") && <TableHead>楽曲名</TableHead>}
									{isVisible("workName") && (
										<TableHead className="w-[200px]">作品</TableHead>
									)}
									{isVisible("trackNumber") && (
										<TableHead className="w-[80px]">トラック</TableHead>
									)}
									{isVisible("composerName") && (
										<TableHead className="w-[100px]">作曲者</TableHead>
									)}
									{isVisible("arrangerName") && (
										<TableHead className="w-[100px]">編曲者</TableHead>
									)}
									{isVisible("isOriginal") && (
										<TableHead className="w-[100px]">オリジナル</TableHead>
									)}
									{isVisible("sourceSongName") && (
										<TableHead className="w-[180px]">原曲</TableHead>
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
								{songs.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									songs.map((s) => (
										<TableRow key={s.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-sm">
													{s.id}
												</TableCell>
											)}
											{isVisible("nameJa") && (
												<TableCell className="font-medium">
													<Link
														to="/admin/official/songs/$id"
														params={{ id: s.id }}
														className="hover:text-primary hover:underline"
													>
														{s.nameJa}
													</Link>
												</TableCell>
											)}
											{isVisible("workName") && (
												<TableCell
													className="max-w-[200px] truncate text-sm"
													title={s.workName || undefined}
												>
													{s.workName || "-"}
												</TableCell>
											)}
											{isVisible("trackNumber") && (
												<TableCell className="text-sm">
													{s.trackNumber ?? "-"}
												</TableCell>
											)}
											{isVisible("composerName") && (
												<TableCell className="text-sm">
													{s.composerName || "-"}
												</TableCell>
											)}
											{isVisible("arrangerName") && (
												<TableCell className="text-sm">
													{s.arrangerName || "-"}
												</TableCell>
											)}
											{isVisible("isOriginal") && (
												<TableCell>
													{s.isOriginal ? (
														<Badge variant="outline">Yes</Badge>
													) : (
														<Badge variant="secondary">No</Badge>
													)}
												</TableCell>
											)}
											{isVisible("sourceSongName") && (
												<TableCell
													className="max-w-[180px] truncate text-sm"
													title={s.sourceSongName || undefined}
												>
													{s.sourceSongName || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(s.createdAt),
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
														new Date(s.updatedAt),
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
														to="/admin/official/songs/$id"
														params={{ id: s.id }}
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
															setEditingSong(s);
															setEditForm({
																officialWorkId: s.officialWorkId,
																trackNumber: s.trackNumber,
																name: s.name,
																nameJa: s.nameJa,
																nameEn: s.nameEn,
																composerName: s.composerName,
																arrangerName: s.arrangerName,
																isOriginal: s.isOriginal,
																sourceSongId: s.sourceSongId,
																notes: s.notes,
															});
															setMutationError(null);
														}}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(s.id)}
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
						<DialogTitle>新規公式楽曲</DialogTitle>
					</DialogHeader>
					{mutationError && isCreateDialogOpen && (
						<div className="rounded-md bg-error/10 p-3 text-error text-sm">
							{mutationError}
						</div>
					)}
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-id">ID *</Label>
								<Input
									id="create-id"
									value={(createForm.id as string) || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, id: e.target.value })
									}
									placeholder="例: th06-01"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-trackNumber">トラック番号</Label>
								<Input
									id="create-trackNumber"
									type="number"
									value={(createForm.trackNumber as string) || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											trackNumber: e.target.value,
										})
									}
									placeholder="例: 1"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-officialWorkId">作品</Label>
							<SearchableGroupedSelect
								id="create-officialWorkId"
								value={(createForm.officialWorkId as string) || ""}
								onChange={(value) =>
									setCreateForm({ ...createForm, officialWorkId: value })
								}
								groups={workGroups}
								placeholder="作品を選択"
								searchPlaceholder="作品名で検索..."
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-name">名前 *</Label>
							<Input
								id="create-name"
								value={(createForm.name as string) || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
								placeholder="例: A Soul as Red as a Ground Cherry"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-nameJa">日本語名 *</Label>
								<Input
									id="create-nameJa"
									value={(createForm.nameJa as string) || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameJa: e.target.value })
									}
									placeholder="例: 赤より紅い夢"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-nameEn">英語名</Label>
								<Input
									id="create-nameEn"
									value={(createForm.nameEn as string) || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, nameEn: e.target.value })
									}
									placeholder="例: A Soul as Red as a Ground Cherry"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-isOriginal">オリジナル</Label>
								<Select
									id="create-isOriginal"
									value={createForm.isOriginal !== false ? "true" : "false"}
									onChange={(e) => {
										const isOrig = e.target.value === "true";
										setCreateForm({
											...createForm,
											isOriginal: isOrig,
											sourceSongId: isOrig
												? ""
												: (createForm.sourceSongId as string),
										});
									}}
								>
									<option value="true">はい</option>
									<option value="false">いいえ</option>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-composerName">作曲者名</Label>
								<Input
									id="create-composerName"
									value={(createForm.composerName as string) || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											composerName: e.target.value,
										})
									}
									placeholder="例: ZUN"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-arrangerName">編曲者名</Label>
								<Input
									id="create-arrangerName"
									value={(createForm.arrangerName as string) || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											arrangerName: e.target.value,
										})
									}
									placeholder="例: ZUN"
								/>
							</div>
						</div>
						{createForm.isOriginal === false && (
							<div className="grid gap-2">
								<Label htmlFor="create-sourceSongId">原曲</Label>
								<SearchableSelect
									id="create-sourceSongId"
									value={(createForm.sourceSongId as string) || ""}
									onChange={(value) =>
										setCreateForm({ ...createForm, sourceSongId: value })
									}
									options={sourceSongOptions}
									placeholder="原曲を選択"
									searchPlaceholder="楽曲名で検索..."
								/>
							</div>
						)}
						<div className="grid gap-2">
							<Label htmlFor="create-notes">備考</Label>
							<Textarea
								id="create-notes"
								value={(createForm.notes as string) || ""}
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
				open={!!editingSong}
				onOpenChange={(open) => !open && setEditingSong(null)}
			>
				<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>公式楽曲の編集</DialogTitle>
					</DialogHeader>
					{mutationError && editingSong && (
						<div className="rounded-md bg-error/10 p-3 text-error text-sm">
							{mutationError}
						</div>
					)}
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label>ID</Label>
								<Input value={editingSong?.id || ""} disabled />
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-trackNumber">トラック番号</Label>
								<Input
									id="edit-trackNumber"
									type="number"
									value={editForm.trackNumber ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											trackNumber: e.target.value
												? Number.parseInt(e.target.value, 10)
												: null,
										})
									}
									placeholder="例: 1"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-officialWorkId">作品</Label>
							<SearchableGroupedSelect
								id="edit-officialWorkId"
								value={editForm.officialWorkId || ""}
								onChange={(value) =>
									setEditForm({ ...editForm, officialWorkId: value || null })
								}
								groups={workGroups}
								placeholder="作品を選択"
								searchPlaceholder="作品名で検索..."
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: A Soul as Red as a Ground Cherry"
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
									placeholder="例: 赤より紅い夢"
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
									placeholder="例: A Soul as Red as a Ground Cherry"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-isOriginal">オリジナル</Label>
								<Select
									id="edit-isOriginal"
									value={editForm.isOriginal ? "true" : "false"}
									onChange={(e) => {
										const isOrig = e.target.value === "true";
										setEditForm({
											...editForm,
											isOriginal: isOrig,
											sourceSongId: isOrig ? null : editForm.sourceSongId,
										});
									}}
								>
									<option value="true">はい</option>
									<option value="false">いいえ</option>
								</Select>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-composerName">作曲者名</Label>
								<Input
									id="edit-composerName"
									value={editForm.composerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, composerName: e.target.value })
									}
									placeholder="例: ZUN"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-arrangerName">編曲者名</Label>
								<Input
									id="edit-arrangerName"
									value={editForm.arrangerName || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, arrangerName: e.target.value })
									}
									placeholder="例: ZUN"
								/>
							</div>
						</div>
						{editForm.isOriginal === false && (
							<div className="grid gap-2">
								<Label htmlFor="edit-sourceSongId">原曲</Label>
								<SearchableSelect
									id="edit-sourceSongId"
									value={editForm.sourceSongId || ""}
									onChange={(value) =>
										setEditForm({ ...editForm, sourceSongId: value || null })
									}
									options={sourceSongOptions}
									placeholder="原曲を選択"
									searchPlaceholder="楽曲名で検索..."
								/>
							</div>
						)}
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
							onClick={() => setEditingSong(null)}
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
				title="公式楽曲のインポート"
				onImport={importApi.officialSongs}
				onSuccess={invalidateQuery}
				open={isImportDialogOpen}
				onOpenChange={setIsImportDialogOpen}
			/>
		</div>
	);
}
