import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Disc3, Pencil, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
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
	type Disc,
	discsApi,
	RELEASE_TYPE_LABELS,
	type Release,
	type ReleaseType,
	type ReleaseWithDiscCount,
	type ReleaseWithDiscs,
	releasesApi,
} from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/releases")({
	component: ReleasesPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "リリース名" },
	{ key: "catalogNumber", label: "カタログ番号" },
	{ key: "releaseType", label: "タイプ" },
	{ key: "releaseDate", label: "発売日" },
	{ key: "discCount", label: "ディスク数" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

// リリースタイプのオプション
const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_LABELS).map(
	([value, label]) => ({
		value,
		label,
	}),
);

function ReleasesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [releaseTypeFilter, setReleaseTypeFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:releases",
		columnConfigs,
	);

	const [editingRelease, setEditingRelease] = useState<ReleaseWithDiscs | null>(
		null,
	);
	const [editForm, setEditForm] = useState<Partial<Release>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<Release>>({
		releaseType: "album",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ディスク編集用
	const [isDiscDialogOpen, setIsDiscDialogOpen] = useState(false);
	const [editingDisc, setEditingDisc] = useState<Disc | null>(null);
	const [discForm, setDiscForm] = useState<Partial<Disc>>({});

	const { data, isLoading, error } = useQuery({
		queryKey: ["releases", page, pageSize, debouncedSearch, releaseTypeFilter],
		queryFn: () =>
			releasesApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				releaseType: releaseTypeFilter || undefined,
			}),
		staleTime: 30_000,
	});

	const releases = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["releases"] });
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			await releasesApi.create({
				id,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				catalogNumber: createForm.catalogNumber || null,
				releaseDate: createForm.releaseDate || null,
				releaseType: (createForm.releaseType as ReleaseType) || null,
				eventDayId: createForm.eventDayId || null,
				notes: createForm.notes || null,
			});
			setIsCreateDialogOpen(false);
			setCreateForm({ releaseType: "album" });
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async () => {
		if (!editingRelease) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await releasesApi.update(editingRelease.id, {
				name: editForm.name,
				nameJa: editForm.nameJa,
				nameEn: editForm.nameEn,
				catalogNumber: editForm.catalogNumber,
				releaseDate: editForm.releaseDate,
				releaseType: editForm.releaseType as ReleaseType,
				eventDayId: editForm.eventDayId,
				notes: editForm.notes,
			});
			setEditingRelease(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (release: ReleaseWithDiscCount) => {
		if (
			!confirm(
				`「${release.name}」を削除しますか？\n※関連するディスク情報も削除されます。`,
			)
		)
			return;
		try {
			await releasesApi.delete(release.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	// リリースを編集モードで開く（詳細取得）
	const handleEdit = async (release: ReleaseWithDiscCount) => {
		try {
			const releaseWithDiscs = await releasesApi.get(release.id);
			setEditingRelease(releaseWithDiscs);
			setEditForm({
				name: releaseWithDiscs.name,
				nameJa: releaseWithDiscs.nameJa,
				nameEn: releaseWithDiscs.nameEn,
				catalogNumber: releaseWithDiscs.catalogNumber,
				releaseDate: releaseWithDiscs.releaseDate,
				releaseType: releaseWithDiscs.releaseType,
				eventDayId: releaseWithDiscs.eventDayId,
				notes: releaseWithDiscs.notes,
			});
			setMutationError(null);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "リリース情報の取得に失敗しました",
			);
		}
	};

	// ディスク追加ダイアログを開く
	const handleOpenAddDiscDialog = () => {
		setEditingDisc(null);
		setDiscForm({
			discNumber: (editingRelease?.discs?.length ?? 0) + 1,
			discName: "",
		});
		setIsDiscDialogOpen(true);
	};

	// ディスク編集ダイアログを開く
	const handleOpenEditDiscDialog = (disc: Disc) => {
		setEditingDisc(disc);
		setDiscForm({
			discNumber: disc.discNumber,
			discName: disc.discName,
		});
		setIsDiscDialogOpen(true);
	};

	// ディスク保存
	const handleSaveDisc = async () => {
		if (!editingRelease) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingDisc) {
				// 更新
				await discsApi.update(editingRelease.id, editingDisc.id, {
					discNumber: discForm.discNumber,
					discName: discForm.discName,
				});
			} else {
				// 新規作成
				const id = nanoid();
				await discsApi.create(editingRelease.id, {
					id,
					discNumber: discForm.discNumber || 1,
					discName: discForm.discName || null,
				});
			}
			setIsDiscDialogOpen(false);
			// リリース詳細を再取得
			const updated = await releasesApi.get(editingRelease.id);
			setEditingRelease(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "ディスクの保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// ディスク削除
	const handleDeleteDisc = async (disc: Disc) => {
		if (!editingRelease) return;
		if (!confirm(`Disc ${disc.discNumber}を削除しますか？`)) return;
		try {
			await discsApi.delete(editingRelease.id, disc.id);
			const updated = await releasesApi.get(editingRelease.id);
			setEditingRelease(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "ディスクの削除に失敗しました",
			);
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

	const handleReleaseTypeFilterChange = (value: string) => {
		setReleaseTypeFilter(value);
		setPage(1);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="リリース管理"
				breadcrumbs={[{ label: "リリース" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="リリース名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={RELEASE_TYPE_OPTIONS}
					filterValue={releaseTypeFilter}
					filterPlaceholder="タイプで絞り込み"
					onFilterChange={handleReleaseTypeFilterChange}
					columnVisibility={{
						columns: columnConfigs,
						visibleColumns,
						onToggle: toggleColumn,
					}}
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
						columns={6}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									{isVisible("id") && (
										<TableHead className="w-[220px]">ID</TableHead>
									)}
									{isVisible("name") && (
										<TableHead className="min-w-[200px]">リリース名</TableHead>
									)}
									{isVisible("catalogNumber") && (
										<TableHead className="w-[140px]">カタログ番号</TableHead>
									)}
									{isVisible("releaseType") && (
										<TableHead className="w-[120px]">タイプ</TableHead>
									)}
									{isVisible("releaseDate") && (
										<TableHead className="w-[120px]">発売日</TableHead>
									)}
									{isVisible("discCount") && (
										<TableHead className="w-[100px]">ディスク数</TableHead>
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
								{releases.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											該当するリリースが見つかりません
										</TableCell>
									</TableRow>
								) : (
									releases.map((release) => (
										<TableRow key={release.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{release.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													{release.name}
												</TableCell>
											)}
											{isVisible("catalogNumber") && (
												<TableCell className="text-base-content/70">
													{release.catalogNumber || "-"}
												</TableCell>
											)}
											{isVisible("releaseType") && (
												<TableCell>
													{release.releaseType ? (
														<Badge variant="outline">
															{RELEASE_TYPE_LABELS[release.releaseType]}
														</Badge>
													) : (
														"-"
													)}
												</TableCell>
											)}
											{isVisible("releaseDate") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{release.releaseDate || "-"}
												</TableCell>
											)}
											{isVisible("discCount") && (
												<TableCell className="text-base-content/70">
													{release.discCount}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(release.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(release.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(release)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(release)}
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
			<Dialog
				open={isCreateDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsCreateDialogOpen(false);
						setCreateForm({ releaseType: "album" });
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規リリース</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								リリース名 <span className="text-error">*</span>
							</Label>
							<p className="text-base-content/60 text-xs">
								アルバム名、シングル名、EP名などを入力してください
							</p>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({
										...createForm,
										name: e.target.value,
										nameJa: e.target.value,
									})
								}
								placeholder="例: 東方紅魔郷オリジナルサウンドトラック"
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-nameJa">日本語名</Label>
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
									placeholder="例: Touhou Koumakyou"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-catalogNumber">カタログ番号</Label>
								<Input
									id="create-catalogNumber"
									value={createForm.catalogNumber || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											catalogNumber: e.target.value,
										})
									}
									placeholder="例: THCS-0001"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-releaseType">タイプ</Label>
								<Select
									id="create-releaseType"
									value={createForm.releaseType || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											releaseType: e.target.value as ReleaseType,
										})
									}
								>
									<option value="">選択してください</option>
									{RELEASE_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-releaseDate">発売日</Label>
							<Input
								id="create-releaseDate"
								type="date"
								value={createForm.releaseDate || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, releaseDate: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-notes">メモ</Label>
							<Textarea
								id="create-notes"
								value={createForm.notes || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, notes: e.target.value })
								}
								rows={3}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsCreateDialogOpen(false)}
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

			{/* 編集ダイアログ（ディスク管理含む） */}
			<Dialog
				open={!!editingRelease}
				onOpenChange={(open) => {
					if (!open) {
						setEditingRelease(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>リリースの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								リリース名 <span className="text-error">*</span>
							</Label>
							<p className="text-base-content/60 text-xs">
								アルバム名、シングル名、EP名などを入力してください
							</p>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: 東方紅魔郷オリジナルサウンドトラック"
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
									placeholder="例: Touhou Koumakyou"
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-catalogNumber">カタログ番号</Label>
								<Input
									id="edit-catalogNumber"
									value={editForm.catalogNumber || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, catalogNumber: e.target.value })
									}
									placeholder="例: THCS-0001"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-releaseType">タイプ</Label>
								<Select
									id="edit-releaseType"
									value={editForm.releaseType || ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											releaseType: e.target.value as ReleaseType,
										})
									}
								>
									<option value="">選択してください</option>
									{RELEASE_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</Select>
							</div>
						</div>
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
							<Label htmlFor="edit-notes">メモ</Label>
							<Textarea
								id="edit-notes"
								value={editForm.notes || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, notes: e.target.value })
								}
								rows={3}
							/>
						</div>

						{/* ディスク一覧 */}
						<div className="mt-2 border-base-300 border-t pt-4">
							<div className="mb-2 flex items-center justify-between">
								<Label className="flex items-center gap-2">
									<Disc3 className="h-4 w-4" />
									ディスク
								</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleOpenAddDiscDialog}
								>
									<Plus className="mr-1 h-4 w-4" />
									追加
								</Button>
							</div>
							{editingRelease?.discs && editingRelease.discs.length > 0 ? (
								<div className="space-y-2">
									{editingRelease.discs.map((disc) => (
										<div
											key={disc.id}
											className="flex items-center justify-between rounded border border-base-300 p-2"
										>
											<div className="flex items-center gap-2">
												<Badge variant="primary">Disc {disc.discNumber}</Badge>
												<span className="text-sm">
													{disc.discName || "(名称なし)"}
												</span>
											</div>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleOpenEditDiscDialog(disc)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-error hover:text-error"
													onClick={() => handleDeleteDisc(disc)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-base-content/50 text-sm">
									ディスクが登録されていません
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingRelease(null)}>
							閉じる
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

			{/* ディスク追加・編集ダイアログ */}
			<Dialog
				open={isDiscDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsDiscDialogOpen(false);
						setEditingDisc(null);
						setDiscForm({});
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>
							{editingDisc ? "ディスクの編集" : "ディスクの追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="disc-discNumber">
								ディスク番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="disc-discNumber"
								type="number"
								min="1"
								value={discForm.discNumber ?? ""}
								onChange={(e) =>
									setDiscForm({
										...discForm,
										discNumber: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="disc-discName">ディスク名</Label>
							<Input
								id="disc-discName"
								value={discForm.discName || ""}
								onChange={(e) =>
									setDiscForm({ ...discForm, discName: e.target.value })
								}
								placeholder="例: オリジナルサウンドトラック"
							/>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsDiscDialogOpen(false)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveDisc}
							disabled={isSubmitting}
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
