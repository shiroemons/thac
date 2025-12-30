import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { TrackEditDialog } from "@/components/admin/track-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import {
	releasesApi,
	type Track,
	type TrackListItem,
	tracksApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/tracks")({
	head: () => createPageHead("トラック"),
	component: TracksPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "トラック名" },
	{ key: "releaseName", label: "作品" },
	{ key: "discNumber", label: "ディスク" },
	{ key: "trackNumber", label: "No." },
	{ key: "event", label: "イベント", defaultVisible: false },
	{ key: "eventDay", label: "イベント日", defaultVisible: false },
	{ key: "vocalists", label: "ボーカル" },
	{ key: "arrangers", label: "編曲" },
	{ key: "lyricists", label: "作詞" },
	{ key: "originalSongs", label: "原曲" },
	{ key: "creditCount", label: "クレジット数", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function TracksPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [releaseFilter, setReleaseFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:tracks",
		columnConfigs,
	);

	const [editingTrack, setEditingTrack] = useState<TrackListItem | null>(null);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<
		Partial<Track & { releaseId: string }>
	>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 選択状態管理
	const {
		selectedItems,
		isSelected,
		isAllSelected,
		isIndeterminate,
		toggleItem,
		toggleAll,
		clearSelection,
		selectedCount,
	} = useRowSelection<TrackListItem>();

	// 一括削除ダイアログ状態
	const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
	const [isBatchDeleting, setIsBatchDeleting] = useState(false);
	const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<TrackListItem | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// 作品一覧取得（フィルター用・新規作成用）
	const { data: releasesData } = useQuery({
		queryKey: ["releases", { limit: 200 }],
		queryFn: () => releasesApi.list({ limit: 200 }),
		staleTime: 60_000,
	});

	// トラック一覧取得（ページネーション対応API）
	const { data, isPending, error } = useQuery({
		queryKey: ["all-tracks", page, pageSize, debouncedSearch, releaseFilter],
		queryFn: () =>
			tracksApi.listPaginated({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				releaseId: releaseFilter || undefined,
			}),
		staleTime: 30_000,
	});

	const tracks = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["all-tracks"] });
		queryClient.invalidateQueries({ queryKey: ["releases"] });
	};

	const handleCreate = async () => {
		if (!createForm.releaseId) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = createId.track();
			await tracksApi.create(createForm.releaseId, {
				id,
				trackNumber: createForm.trackNumber ?? 1,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				discId: createForm.discId || null,
				releaseDate: null,
				releaseYear: null,
				releaseMonth: null,
				releaseDay: null,
				eventId: null,
				eventDayId: null,
			});
			setIsCreateDialogOpen(false);
			setCreateForm({});
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		if (!deleteTarget.releaseId) {
			setMutationError(
				"作品に紐づかないトラックの削除は現在サポートされていません",
			);
			return;
		}
		setIsDeleting(true);
		try {
			await tracksApi.delete(deleteTarget.releaseId, deleteTarget.id);
			setDeleteTarget(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleBatchDelete = async () => {
		setIsBatchDeleting(true);
		setBatchDeleteError(null);

		try {
			// 選択されたアイテムからreleaseIdとtrackIdを抽出
			const items = Array.from(selectedItems.values())
				.filter((item) => item.releaseId)
				.map((item) => ({
					trackId: item.id,
					releaseId: item.releaseId as string,
				}));

			if (items.length === 0) {
				setBatchDeleteError("削除可能なトラックがありません");
				return;
			}

			const result = await tracksApi.batchDelete(items);

			if (result.failed.length > 0) {
				setBatchDeleteError(
					`${result.deleted}件削除、${result.failed.length}件失敗`,
				);
			} else {
				setIsBatchDeleteDialogOpen(false);
				clearSelection();
			}

			invalidateQuery();
		} catch (e) {
			setBatchDeleteError(
				e instanceof Error ? e.message : "一括削除に失敗しました",
			);
		} finally {
			setIsBatchDeleting(false);
		}
	};

	const handleEdit = (track: TrackListItem) => {
		setEditingTrack(track);
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

	const handleReleaseFilterChange = (value: string) => {
		setReleaseFilter(value);
		setPage(1);
	};

	const releaseOptions =
		releasesData?.data.map((r) => ({
			value: r.id,
			label: r.name,
		})) ?? [];

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
					<li>トラック管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">トラック管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="トラック名で検索..."
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
					secondaryActions={
						selectedCount > 0
							? [
									{
										label: `選択中の${selectedCount}件を削除`,
										icon: <Trash2 className="mr-2 h-4 w-4" />,
										onClick: () => setIsBatchDeleteDialogOpen(true),
									},
								]
							: undefined
					}
				>
					<SearchableSelect
						value={releaseFilter}
						onChange={(value) => handleReleaseFilterChange(value || "")}
						options={releaseOptions}
						placeholder="作品で絞り込み"
						searchPlaceholder="作品を検索..."
						emptyMessage="作品が見つかりません"
						clearable={true}
						className="w-[200px]"
					/>
					{selectedCount > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-base-content/70 text-sm">
								{selectedCount}件選択中
							</span>
							<Button variant="ghost" size="sm" onClick={clearSelection}>
								選択解除
							</Button>
						</div>
					)}
				</DataTableActionBar>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
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
									<TableHead className="w-[50px]">
										<Checkbox
											checked={isAllSelected(tracks)}
											indeterminate={isIndeterminate(tracks)}
											onCheckedChange={() => toggleAll(tracks)}
											aria-label="すべて選択"
										/>
									</TableHead>
									{isVisible("id") && (
										<TableHead className="w-[220px]">ID</TableHead>
									)}
									{isVisible("name") && (
										<TableHead className="min-w-[200px]">トラック名</TableHead>
									)}
									{isVisible("releaseName") && (
										<TableHead className="min-w-[200px]">作品</TableHead>
									)}
									{isVisible("discNumber") && (
										<TableHead className="w-[100px]">ディスク</TableHead>
									)}
									{isVisible("trackNumber") && (
										<TableHead className="w-[60px]">No.</TableHead>
									)}
									{isVisible("event") && (
										<TableHead className="min-w-[150px]">イベント</TableHead>
									)}
									{isVisible("eventDay") && (
										<TableHead className="w-[150px]">イベント日</TableHead>
									)}
									{isVisible("vocalists") && (
										<TableHead className="min-w-[150px]">ボーカル</TableHead>
									)}
									{isVisible("arrangers") && (
										<TableHead className="min-w-[150px]">編曲</TableHead>
									)}
									{isVisible("lyricists") && (
										<TableHead className="min-w-[150px]">作詞</TableHead>
									)}
									{isVisible("originalSongs") && (
										<TableHead className="min-w-[200px]">原曲</TableHead>
									)}
									{isVisible("creditCount") && (
										<TableHead className="w-[100px]">クレジット数</TableHead>
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
								{tracks.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											該当するトラックが見つかりません
										</TableCell>
									</TableRow>
								) : (
									tracks.map((track) => (
										<TableRow
											key={track.id}
											className={
												isSelected(track.id) ? "bg-primary/5" : undefined
											}
										>
											<TableCell>
												<Checkbox
													checked={isSelected(track.id)}
													onCheckedChange={() => toggleItem(track)}
													aria-label={`${track.name}を選択`}
												/>
											</TableCell>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-xs">
													{track.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													<div>
														<p>{track.name}</p>
														{track.nameJa && (
															<p className="text-base-content/60 text-sm">
																{track.nameJa}
															</p>
														)}
													</div>
												</TableCell>
											)}
											{isVisible("releaseName") && (
												<TableCell className="text-base-content/70">
													{track.releaseName || "-"}
												</TableCell>
											)}
											{isVisible("discNumber") && (
												<TableCell className="text-base-content/70">
													{track.discNumber ? `Disc ${track.discNumber}` : "-"}
												</TableCell>
											)}
											{isVisible("trackNumber") && (
												<TableCell className="text-base-content/70">
													{track.trackNumber}
												</TableCell>
											)}
											{isVisible("event") && (
												<TableCell>
													{track.eventId && track.eventName ? (
														<Link
															to="/admin/events/$id"
															params={{ id: track.eventId }}
															className="text-primary hover:underline"
														>
															{track.eventName}
														</Link>
													) : (
														"-"
													)}
												</TableCell>
											)}
											{isVisible("eventDay") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{track.eventDayDate
														? `${track.eventDayDate}${track.eventDayNumber ? ` (Day ${track.eventDayNumber})` : ""}`
														: "-"}
												</TableCell>
											)}
											{isVisible("vocalists") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.vocalists || "-"}
												</TableCell>
											)}
											{isVisible("arrangers") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.arrangers || "-"}
												</TableCell>
											)}
											{isVisible("lyricists") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.lyricists || "-"}
												</TableCell>
											)}
											{isVisible("originalSongs") && (
												<TableCell className="text-base-content/70 text-sm">
													{track.originalSongs || "-"}
												</TableCell>
											)}
											{isVisible("creditCount") && (
												<TableCell>
													<Badge variant="ghost">{track.creditCount}件</Badge>
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(track.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(track.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/tracks/$id"
														params={{ id: track.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">トラック詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(track)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteTarget(track)}
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
						setCreateForm({});
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規トラック</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-release">
								作品 <span className="text-error">*</span>
							</Label>
							<SearchableSelect
								value={createForm.releaseId || ""}
								onChange={(value) =>
									setCreateForm({ ...createForm, releaseId: value || "" })
								}
								options={releaseOptions}
								placeholder="作品を選択"
								searchPlaceholder="作品を検索..."
								emptyMessage="作品が見つかりません"
								clearable={false}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								トラック名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) => {
									const newName = e.target.value;
									setCreateForm({
										...createForm,
										name: newName,
										nameJa:
											!createForm.nameJa ||
											createForm.nameJa === createForm.name
												? newName
												: createForm.nameJa,
									});
								}}
								placeholder="例: ネイティブフェイス"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-nameJa">日本語名</Label>
							<Input
								id="create-nameJa"
								value={createForm.nameJa || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, nameJa: e.target.value })
								}
								placeholder="例: ネイティブフェイス"
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
								placeholder="例: Native Face"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-trackNumber">
								トラック番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-trackNumber"
								type="number"
								min={1}
								value={createForm.trackNumber ?? ""}
								onChange={(e) =>
									setCreateForm({
										...createForm,
										trackNumber: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="1"
							/>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
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
							disabled={
								isSubmitting || !createForm.releaseId || !createForm.name
							}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			{editingTrack && (
				<TrackEditDialog
					open={!!editingTrack}
					onOpenChange={(open) => {
						if (!open) {
							setEditingTrack(null);
						}
					}}
					track={editingTrack}
					onSuccess={() => {
						invalidateQuery();
					}}
				/>
			)}

			{/* 一括削除確認ダイアログ */}
			<ConfirmDialog
				open={isBatchDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsBatchDeleteDialogOpen(open);
					if (!open) {
						setBatchDeleteError(null);
					}
				}}
				title="トラックの一括削除"
				description={
					<div>
						<p>選択した{selectedCount}件のトラックを削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連するクレジット情報も削除されます。この操作は取り消せません。
						</p>
						{batchDeleteError && (
							<p className="mt-2 text-error text-sm">{batchDeleteError}</p>
						)}
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleBatchDelete}
				isLoading={isBatchDeleting}
			/>

			{/* 個別削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				title="トラックの削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連するクレジット情報も削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={isDeleting}
			/>
		</div>
	);
}
