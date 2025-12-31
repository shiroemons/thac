import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { ReleaseEditDialog } from "@/components/admin/release-edit-dialog";
import { SortIcon } from "@/components/admin/sort-icon";
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
import { useRowSelection } from "@/hooks/use-row-selection";
import { useSortableTable } from "@/hooks/use-sortable-table";
import {
	discsApi,
	eventDaysApi,
	eventsApi,
	RELEASE_TYPE_COLORS,
	RELEASE_TYPE_LABELS,
	type Release,
	type ReleaseType,
	type ReleaseWithCounts,
	type ReleaseWithDiscs,
	releasesApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { releasesListQueryOptions } from "@/lib/query-options";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/releases")({
	head: () => createPageHead("作品"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			releasesListQueryOptions({
				page: DEFAULT_PAGE,
				limit: DEFAULT_PAGE_SIZE,
			}),
		),
	component: ReleasesPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "作品名" },
	{ key: "releaseType", label: "タイプ" },
	{ key: "releaseDate", label: "発売日" },
	{ key: "event", label: "イベント" },
	{ key: "eventDay", label: "イベント日" },
	{ key: "discCount", label: "ディスク数" },
	{ key: "trackCount", label: "トラック数" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

// 作品タイプのオプション
const RELEASE_TYPE_OPTIONS = Object.entries(RELEASE_TYPE_LABELS).map(
	([value, label]) => ({
		value,
		label,
	}),
);

function ReleasesPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [releaseTypeFilter, setReleaseTypeFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "releaseDate",
		defaultSortOrder: "asc",
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:releases",
		columnConfigs,
	);

	const [editingRelease, setEditingRelease] = useState<ReleaseWithDiscs | null>(
		null,
	);
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<Release>>({
		releaseType: "album",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedEventIdForCreate, setSelectedEventIdForCreate] = useState<
		string | null
	>(null);

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
	} = useRowSelection<ReleaseWithCounts>();

	// 一括削除ダイアログ状態
	const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
	const [isBatchDeleting, setIsBatchDeleting] = useState(false);
	const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null);

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<ReleaseWithCounts | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = useState(false);

	const { data, isPending, error } = useQuery(
		releasesListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			releaseType: releaseTypeFilter || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const releases = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["releases"] });
	};

	// 新規作成用：イベント一覧取得
	const { data: eventsDataForCreate } = useQuery({
		queryKey: ["events"],
		queryFn: () => eventsApi.list({ limit: 500 }),
		staleTime: 300_000,
		enabled: isCreateDialogOpen,
	});

	// 新規作成用：イベント日一覧取得
	const { data: eventDaysDataForCreate } = useQuery({
		queryKey: ["events", selectedEventIdForCreate, "days"],
		queryFn: () =>
			selectedEventIdForCreate
				? eventDaysApi.list(selectedEventIdForCreate)
				: Promise.resolve([]),
		staleTime: 300_000,
		enabled: isCreateDialogOpen && !!selectedEventIdForCreate,
	});

	// 新規作成用：イベントオプション
	const eventOptionsForCreate = useMemo(() => {
		const events = eventsDataForCreate?.data ?? [];
		return events.map((e) => ({
			value: e.id,
			label: e.seriesName ? `【${e.seriesName}】${e.name}` : e.name,
		}));
	}, [eventsDataForCreate?.data]);

	// 新規作成用：イベント日オプション
	const eventDayOptionsForCreate = useMemo(() => {
		const days = eventDaysDataForCreate ?? [];
		const hasMultipleDays = days.length > 1;
		return days.map((d) => ({
			value: d.id,
			label: hasMultipleDays ? `${d.dayNumber}日目（${d.date}）` : d.date,
		}));
	}, [eventDaysDataForCreate]);

	// 新規作成用：イベント日が取得されたら1日目を自動設定
	// createForm.eventDayIdを依存配列に含めると無限ループが発生するため、意図的に省略
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally omitted to prevent infinite loop
	useEffect(() => {
		if (
			isCreateDialogOpen &&
			selectedEventIdForCreate &&
			eventDaysDataForCreate &&
			eventDaysDataForCreate.length > 0 &&
			!createForm.eventDayId
		) {
			const firstDay =
				eventDaysDataForCreate.find((d) => d.dayNumber === 1) ||
				eventDaysDataForCreate[0];
			if (firstDay) {
				setCreateForm((prev) => ({
					...prev,
					eventDayId: firstDay.id,
					releaseDate: firstDay.date,
				}));
			}
		}
	}, [isCreateDialogOpen, selectedEventIdForCreate, eventDaysDataForCreate]);

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = createId.release();
			const releaseType = (createForm.releaseType as ReleaseType) || null;
			await releasesApi.create({
				id,
				name: createForm.name || "",
				nameJa: createForm.nameJa || null,
				nameEn: createForm.nameEn || null,
				releaseDate: createForm.releaseDate || null,
				releaseYear: null,
				releaseMonth: null,
				releaseDay: null,
				releaseType,
				eventId: createForm.eventId || null,
				eventDayId: createForm.eventDayId || null,
				notes: createForm.notes || null,
			});
			// アルバム、シングル、EPの場合はデフォルトでDisc 1を作成
			if (
				releaseType === "album" ||
				releaseType === "single" ||
				releaseType === "ep"
			) {
				await discsApi.create(id, {
					id: createId.disc(),
					discNumber: 1,
					discName: createForm.name || null,
				});
			}
			setIsCreateDialogOpen(false);
			setCreateForm({ releaseType: "album" });
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "作成に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		setIsDeleting(true);
		try {
			await releasesApi.delete(deleteTarget.id);
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
			const ids = Array.from(selectedItems.values()).map((item) => item.id);

			if (ids.length === 0) {
				setBatchDeleteError("削除可能な作品がありません");
				return;
			}

			const result = await releasesApi.batchDelete(ids);

			if (result.failed.length > 0) {
				setBatchDeleteError(
					`${result.deleted.length}件削除、${result.failed.length}件失敗`,
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

	// 作品を編集モードで開く（詳細取得）
	const handleEdit = async (release: ReleaseWithCounts) => {
		try {
			const releaseDetail = await releasesApi.get(release.id);
			setEditingRelease(releaseDetail);
			setMutationError(null);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "作品情報の取得に失敗しました",
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
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin">
							<Home className="h-4 w-4" />
						</Link>
					</li>
					<li>作品管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">作品管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="作品名で検索..."
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
											checked={isAllSelected(releases)}
											indeterminate={isIndeterminate(releases)}
											onCheckedChange={() => toggleAll(releases)}
											aria-label="すべて選択"
										/>
									</TableHead>
									{isVisible("id") && (
										<TableHead
											className="w-[220px] cursor-pointer select-none"
											onClick={() => handleSort("id")}
										>
											<span className="inline-flex items-center gap-1">
												ID
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="id"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("name") && (
										<TableHead
											className="min-w-[200px] cursor-pointer select-none"
											onClick={() => handleSort("name")}
										>
											<span className="inline-flex items-center gap-1">
												作品名
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="name"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("releaseType") && (
										<TableHead className="w-[120px]">タイプ</TableHead>
									)}
									{isVisible("releaseDate") && (
										<TableHead
											className="w-[120px] cursor-pointer select-none"
											onClick={() => handleSort("releaseDate")}
										>
											<span className="inline-flex items-center gap-1">
												発売日
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="releaseDate"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("event") && (
										<TableHead className="min-w-[180px]">イベント</TableHead>
									)}
									{isVisible("eventDay") && (
										<TableHead className="w-[120px]">イベント日</TableHead>
									)}
									{isVisible("discCount") && (
										<TableHead className="w-[100px]">ディスク数</TableHead>
									)}
									{isVisible("trackCount") && (
										<TableHead className="w-[100px]">トラック数</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none"
											onClick={() => handleSort("createdAt")}
										>
											<span className="inline-flex items-center gap-1">
												作成日時
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="createdAt"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("updatedAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none"
											onClick={() => handleSort("updatedAt")}
										>
											<span className="inline-flex items-center gap-1">
												更新日時
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="updatedAt"
												/>
											</span>
										</TableHead>
									)}
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{releases.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											該当する作品が見つかりません
										</TableCell>
									</TableRow>
								) : (
									releases.map((release) => (
										<TableRow
											key={release.id}
											className={
												isSelected(release.id) ? "bg-primary/5" : undefined
											}
										>
											<TableCell>
												<Checkbox
													checked={isSelected(release.id)}
													onCheckedChange={() => toggleItem(release)}
													aria-label={`${release.name}を選択`}
												/>
											</TableCell>
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
											{isVisible("releaseType") && (
												<TableCell>
													{release.releaseType ? (
														<Badge
															variant={RELEASE_TYPE_COLORS[release.releaseType]}
														>
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
											{isVisible("event") && (
												<TableCell>
													{release.eventId && release.eventName ? (
														<Link
															to="/admin/events/$id"
															params={{ id: release.eventId }}
															className="text-primary hover:underline"
														>
															{release.eventName}
														</Link>
													) : (
														"-"
													)}
												</TableCell>
											)}
											{isVisible("eventDay") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{release.eventDayDate
														? `${release.eventDayDate}${release.eventDayNumber ? ` (Day ${release.eventDayNumber})` : ""}`
														: "-"}
												</TableCell>
											)}
											{isVisible("discCount") && (
												<TableCell className="text-base-content/70">
													{release.discCount}
												</TableCell>
											)}
											{isVisible("trackCount") && (
												<TableCell className="text-base-content/70">
													{release.trackCount}
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
													<Link
														to="/admin/releases/$id"
														params={{ id: release.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
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
														onClick={() => setDeleteTarget(release)}
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
						setSelectedEventIdForCreate(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>新規作品</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								作品名 <span className="text-error">*</span>
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
						<div className="grid gap-4">
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
							<Label htmlFor="create-event">イベント</Label>
							<SearchableSelect
								id="create-event"
								value={createForm.eventId || ""}
								onChange={(value) => {
									const newEventId = value || null;
									setCreateForm({
										...createForm,
										eventId: newEventId,
										eventDayId: null,
									});
									setSelectedEventIdForCreate(newEventId);
								}}
								options={eventOptionsForCreate}
								placeholder="イベントを選択"
								searchPlaceholder="イベントを検索..."
								emptyMessage="イベントが見つかりません"
								clearable
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-eventDay">イベント日</Label>
							<SearchableSelect
								id="create-eventDay"
								value={createForm.eventDayId || ""}
								onChange={(value) => {
									const selectedDay = eventDaysDataForCreate?.find(
										(d) => d.id === value,
									);
									setCreateForm({
										...createForm,
										eventDayId: value || null,
										releaseDate: selectedDay?.date || createForm.releaseDate,
									});
								}}
								options={eventDayOptionsForCreate}
								placeholder="イベント日を選択"
								searchPlaceholder="イベント日を検索..."
								emptyMessage={
									selectedEventIdForCreate
										? "イベント日が見つかりません"
										: "先にイベントを選択してください"
								}
								disabled={
									!selectedEventIdForCreate ||
									(eventDaysDataForCreate?.length ?? 0) <= 1
								}
								clearable
							/>
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
								disabled={!!createForm.eventDayId}
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
								placeholder="例: 来歴、特記事項など"
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

			{/* 編集ダイアログ */}
			{editingRelease && (
				<ReleaseEditDialog
					open={!!editingRelease}
					onOpenChange={(open) => {
						if (!open) {
							setEditingRelease(null);
							setMutationError(null);
						}
					}}
					release={editingRelease}
					onSuccess={invalidateQuery}
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
				title="作品の一括削除"
				description={
					<div>
						<p>選択した{selectedCount}件の作品を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連するディスク・トラックも削除されます。この操作は取り消せません。
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
				title="作品の削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連するディスク情報も削除されます。この操作は取り消せません。
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
