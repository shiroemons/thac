import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	Calendar,
	Download,
	Eye,
	Home,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { EventEditDialog } from "@/components/admin/event-edit-dialog";
import { SortIcon } from "@/components/admin/sort-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useSortableTable } from "@/hooks/use-sortable-table";
import {
	type Event,
	type EventDay,
	type EventWithDays,
	type ExportFormat,
	eventSeriesApi,
	eventsApi,
	exportApi,
} from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import {
	eventDayMutations,
	eventMutations,
	eventSeriesMutations,
} from "@/lib/mutation-options";
import { eventsListQueryOptions } from "@/lib/query-options";
import { getErrorMessage } from "@/lib/utils";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute("/admin/_admin/events")({
	head: () => createPageHead("イベント"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(
			eventsListQueryOptions({ page: DEFAULT_PAGE, limit: DEFAULT_PAGE_SIZE }),
		),
	component: EventsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "イベント名" },
	{ key: "seriesName", label: "シリーズ" },
	{ key: "edition", label: "回次" },
	{ key: "dateRange", label: "開催期間" },
	{ key: "venue", label: "会場" },
	{ key: "totalDays", label: "開催日数", defaultVisible: false },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function EventsPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(DEFAULT_PAGE);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [seriesFilter, setSeriesFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "startDate",
		defaultSortOrder: "asc",
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:events",
		columnConfigs,
	);

	const [editingEvent, setEditingEvent] = useState<EventWithDays | null>(null);
	const [editForm, setEditForm] = useState<Partial<Event>>({});
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// 開催日編集用
	const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
	const [editingDay, setEditingDay] = useState<EventDay | null>(null);
	const [dayForm, setDayForm] = useState<Partial<EventDay>>({});

	// シリーズ新規作成用
	const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState("");

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

	// 開催日削除ダイアログ状態
	const [deleteDayTarget, setDeleteDayTarget] = useState<EventDay | null>(null);

	// エクスポート状態
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);

	// Mutations
	const deleteMutation = useMutation(eventMutations.delete(queryClient));
	const updateMutation = useMutation(eventMutations.update(queryClient));
	const createSeriesMutation = useMutation(
		eventSeriesMutations.create(queryClient),
	);
	const createDayMutation = useMutation(eventDayMutations.create(queryClient));
	const updateDayMutation = useMutation(eventDayMutations.update(queryClient));
	const deleteDayMutation = useMutation(eventDayMutations.delete(queryClient));

	// シリーズ一覧取得
	const { data: seriesData } = useQuery({
		queryKey: ["event-series"],
		queryFn: () => eventSeriesApi.list(),
		staleTime: 60_000,
	});
	const seriesList = seriesData?.data ?? [];

	const seriesOptions = seriesList.map((s) => ({
		value: s.id,
		label: s.name,
	}));

	const { data, isPending, isFetching, error } = useQuery(
		eventsListQueryOptions({
			page,
			limit: pageSize,
			search: debouncedSearch || undefined,
			seriesId: seriesFilter || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const events = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["events"] });
	};

	const handleCreateSeries = () => {
		if (!newSeriesName.trim()) return;
		const id = createId.eventSeries();
		createSeriesMutation.mutate(
			{
				id,
				name: newSeriesName.trim(),
				sortOrder: seriesList.length + 1,
			},
			{
				onSuccess: (newSeries) => {
					// 新しいシリーズを選択状態にする（編集中のフォーム）
					if (editingEvent) {
						setEditForm({ ...editForm, eventSeriesId: newSeries.id });
					}
					setIsSeriesDialogOpen(false);
					setNewSeriesName("");
				},
			},
		);
	};

	const handleUpdate = () => {
		if (!editingEvent) return;
		updateMutation.mutate(
			{
				id: editingEvent.id,
				data: {
					eventSeriesId: editForm.eventSeriesId,
					name: editForm.name,
					edition: editForm.edition,
					totalDays: editForm.totalDays,
					venue: editForm.venue,
					startDate: editForm.startDate,
					endDate: editForm.endDate,
				},
			},
			{
				onSuccess: () => setEditingEvent(null),
			},
		);
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		deleteMutation.mutate(deleteTarget.id, {
			onSuccess: () => setDeleteTarget(null),
		});
	};

	// イベントを編集モードで開く（詳細取得）
	const handleEdit = async (event: Event) => {
		try {
			const eventWithDays = await eventsApi.get(event.id);
			setEditingEvent(eventWithDays);
			setEditForm({
				eventSeriesId: eventWithDays.eventSeriesId,
				name: eventWithDays.name,
				edition: eventWithDays.edition,
				totalDays: eventWithDays.totalDays,
				venue: eventWithDays.venue,
				startDate: eventWithDays.startDate,
				endDate: eventWithDays.endDate,
			});
			updateMutation.reset();
			deleteMutation.reset();
		} catch {
			// Error handling is done through the fetch itself
		}
	};

	// 開催日追加ダイアログを開く
	const handleOpenAddDayDialog = () => {
		setEditingDay(null);
		setDayForm({
			dayNumber: (editingEvent?.days?.length ?? 0) + 1,
			date: "",
		});
		setIsDayDialogOpen(true);
	};

	// 開催日編集ダイアログを開く
	const handleOpenEditDayDialog = (day: EventDay) => {
		setEditingDay(day);
		setDayForm({
			dayNumber: day.dayNumber,
			date: day.date,
		});
		setIsDayDialogOpen(true);
	};

	// 開催日保存
	const handleSaveDay = async () => {
		if (!editingEvent) return;
		const eventId = editingEvent.id;

		const onSaveSuccess = async () => {
			setIsDayDialogOpen(false);
			// イベント詳細を再取得
			const updated = await eventsApi.get(eventId);
			setEditingEvent(updated);
		};

		if (editingDay) {
			// 更新
			updateDayMutation.mutate(
				{
					eventId,
					dayId: editingDay.id,
					data: {
						dayNumber: dayForm.dayNumber,
						date: dayForm.date,
					},
				},
				{ onSuccess: onSaveSuccess },
			);
		} else {
			// 新規作成
			const id = createId.eventDay();
			createDayMutation.mutate(
				{
					eventId,
					data: {
						id,
						dayNumber: dayForm.dayNumber || 1,
						date: dayForm.date || "",
					},
				},
				{ onSuccess: onSaveSuccess },
			);
		}
	};

	// 開催日削除
	const handleDeleteDay = async () => {
		if (!editingEvent || !deleteDayTarget) return;
		const eventId = editingEvent.id;

		deleteDayMutation.mutate(
			{ eventId, dayId: deleteDayTarget.id },
			{
				onSuccess: async () => {
					const updated = await eventsApi.get(eventId);
					setEditingEvent(updated);
					setDeleteDayTarget(null);
				},
			},
		);
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

	const handleSeriesFilterChange = (value: string) => {
		setSeriesFilter(value);
		setPage(1);
	};

	const handleExport = async (
		format: ExportFormat,
		includeRelations: boolean,
	) => {
		setIsExporting(true);
		setExportError(null);
		try {
			await exportApi.events({
				format,
				includeRelations,
				search: debouncedSearch || undefined,
				seriesId: seriesFilter || undefined,
			});
		} catch (e) {
			setExportError(
				e instanceof Error ? e.message : "エクスポートに失敗しました",
			);
		} finally {
			setIsExporting(false);
		}
	};

	const formatDateRange = (
		startDate: string | null,
		endDate: string | null,
	) => {
		if (!startDate && !endDate) return "-";
		if (startDate && endDate) {
			return `${startDate} 〜 ${endDate}`;
		}
		return startDate || endDate || "-";
	};

	const mutationError =
		deleteMutation.error ||
		updateMutation.error ||
		createSeriesMutation.error ||
		createDayMutation.error ||
		updateDayMutation.error ||
		deleteDayMutation.error;
	const displayError =
		(mutationError instanceof Error ? mutationError.message : null) ||
		exportError ||
		(error instanceof Error ? error.message : null);

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
					<li>イベント管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">イベント管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="イベント名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					isLoading={isFetching}
					filterOptions={seriesOptions}
					filterValue={seriesFilter}
					filterPlaceholder="シリーズで絞り込み"
					onFilterChange={handleSeriesFilterChange}
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
							label: "TSVでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", false),
							disabled: isExporting,
						},
						{
							label: "JSONでエクスポート",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", false),
							disabled: isExporting,
						},
						{
							label: "TSV（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("tsv", true),
							disabled: isExporting,
						},
						{
							label: "JSON（関連データ含む）",
							icon: <Download className="mr-2 h-4 w-4" />,
							onClick: () => handleExport("json", true),
							disabled: isExporting,
						},
					]}
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-4 text-error text-sm">
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
												イベント名
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="name"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("seriesName") && (
										<TableHead className="w-[160px]">シリーズ</TableHead>
									)}
									{isVisible("edition") && (
										<TableHead className="w-[70px]">回次</TableHead>
									)}
									{isVisible("dateRange") && (
										<TableHead
											className="w-[180px] cursor-pointer select-none"
											onClick={() => handleSort("startDate")}
										>
											<span className="inline-flex items-center gap-1">
												開催期間
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="startDate"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("venue") && (
										<TableHead className="w-[120px]">会場</TableHead>
									)}
									{isVisible("totalDays") && (
										<TableHead className="w-[80px]">開催日数</TableHead>
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
								{events.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 1}
											className="h-24 text-center text-base-content/50"
										>
											該当するイベントが見つかりません
										</TableCell>
									</TableRow>
								) : (
									events.map((event) => (
										<TableRow key={event.id}>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/50 text-sm">
													{event.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell className="font-medium">
													{event.name}
												</TableCell>
											)}
											{isVisible("seriesName") && (
												<TableCell>
													<Badge variant="outline">
														{event.seriesName || "-"}
													</Badge>
												</TableCell>
											)}
											{isVisible("edition") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{event.edition ? `第${event.edition}回` : "-"}
												</TableCell>
											)}
											{isVisible("dateRange") && (
												<TableCell className="whitespace-nowrap text-base-content/70">
													{formatDateRange(event.startDate, event.endDate)}
												</TableCell>
											)}
											{isVisible("venue") && (
												<TableCell className="text-base-content/70">
													{event.venue || "-"}
												</TableCell>
											)}
											{isVisible("totalDays") && (
												<TableCell className="text-base-content/70">
													{event.totalDays || "-"}
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(event.createdAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											{isVisible("updatedAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(event.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{ locale: ja },
													)}
												</TableCell>
											)}
											<TableCell>
												<div className="flex items-center gap-1">
													<Link
														to="/admin/events/$id"
														params={{ id: event.id }}
														className="btn btn-ghost btn-xs"
													>
														<Eye className="h-4 w-4" />
														<span className="sr-only">詳細</span>
													</Link>
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(event)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => setDeleteTarget(event)}
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
			<EventEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				onSuccess={invalidateQuery}
			/>

			{/* シリーズ新規作成ダイアログ */}
			<Dialog
				open={isSeriesDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsSeriesDialogOpen(false);
						setNewSeriesName("");
						createSeriesMutation.reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-new-series-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-new-series-name"
								value={newSeriesName}
								onChange={(e) => setNewSeriesName(e.target.value)}
								placeholder="例: コミックマーケット"
							/>
						</div>
						{createSeriesMutation.error && (
							<div className="rounded-md bg-error/10 p-4 text-error text-sm">
								{createSeriesMutation.error instanceof Error
									? createSeriesMutation.error.message
									: "シリーズの作成に失敗しました"}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsSeriesDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreateSeries}
							disabled={createSeriesMutation.isPending || !newSeriesName.trim()}
						>
							{createSeriesMutation.isPending ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ（開催日管理含む） */}
			<Dialog
				open={!!editingEvent}
				onOpenChange={(open) => {
					if (!open) {
						setEditingEvent(null);
						updateMutation.reset();
						createDayMutation.reset();
						updateDayMutation.reset();
						deleteDayMutation.reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle>イベントの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								イベント名 <span className="text-error">*</span>
							</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="edit-seriesId">シリーズ</Label>
								<Button
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-primary text-sm hover:underline"
									onClick={() => setIsSeriesDialogOpen(true)}
								>
									+ 新規シリーズ作成
								</Button>
							</div>
							<SearchableSelect
								id="edit-seriesId"
								value={editForm.eventSeriesId || ""}
								onChange={(value) =>
									setEditForm({ ...editForm, eventSeriesId: value })
								}
								options={seriesList.map((s) => ({
									value: s.id,
									label: s.name,
								}))}
								placeholder="選択してください"
								searchPlaceholder="シリーズを検索..."
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-edition">回次</Label>
								<Input
									id="edit-edition"
									type="number"
									min="1"
									placeholder="例: 104"
									value={editForm.edition ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											edition: e.target.value ? Number(e.target.value) : null,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-totalDays">開催日数</Label>
								<Input
									id="edit-totalDays"
									type="number"
									min="1"
									placeholder="例: 2"
									value={editForm.totalDays ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											totalDays: e.target.value ? Number(e.target.value) : null,
										})
									}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-venue">会場</Label>
							<Input
								id="edit-venue"
								placeholder="例: 東京ビッグサイト"
								value={editForm.venue || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, venue: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-startDate">開始日</Label>
								<Input
									id="edit-startDate"
									type="date"
									value={editForm.startDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, startDate: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="edit-endDate">終了日</Label>
								<Input
									id="edit-endDate"
									type="date"
									value={editForm.endDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, endDate: e.target.value })
									}
								/>
							</div>
						</div>

						{/* 開催日一覧 */}
						<div className="mt-2 border-base-300 border-t pt-4">
							<div className="mb-2 flex items-center justify-between">
								<span className="flex items-center gap-2 font-medium text-sm">
									<Calendar className="h-4 w-4" />
									開催日
								</span>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleOpenAddDayDialog}
								>
									<Plus className="mr-1 h-4 w-4" />
									追加
								</Button>
							</div>
							{editingEvent?.days && editingEvent.days.length > 0 ? (
								<div className="space-y-2">
									{editingEvent.days.map((day) => (
										<div
											key={day.id}
											className="flex items-center justify-between rounded-md border border-base-300 p-4"
										>
											<div className="flex items-center gap-2">
												<Badge variant="primary">{day.dayNumber}日目</Badge>
												<span className="text-sm">{day.date}</span>
											</div>
											<div className="flex items-center gap-1">
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleOpenEditDayDialog(day)}
												>
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-error hover:text-error"
													onClick={() => setDeleteDayTarget(day)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className="text-base-content/50 text-sm">
									開催日が登録されていません
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingEvent(null)}>
							閉じる
						</Button>
						<Button
							variant="primary"
							onClick={handleUpdate}
							disabled={updateMutation.isPending}
						>
							{updateMutation.isPending ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 開催日追加・編集ダイアログ */}
			<Dialog
				open={isDayDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsDayDialogOpen(false);
						setEditingDay(null);
						setDayForm({});
						createDayMutation.reset();
						updateDayMutation.reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>
							{editingDay ? "開催日の編集" : "開催日の追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="day-dayNumber">
								日番号 <span className="text-error">*</span>
							</Label>
							<Input
								id="day-dayNumber"
								type="number"
								min="1"
								value={dayForm.dayNumber ?? ""}
								onChange={(e) =>
									setDayForm({
										...dayForm,
										dayNumber: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="day-date">
								日付 <span className="text-error">*</span>
							</Label>
							<Input
								id="day-date"
								type="date"
								value={dayForm.date || ""}
								onChange={(e) =>
									setDayForm({ ...dayForm, date: e.target.value })
								}
							/>
						</div>
						{createDayMutation.error || updateDayMutation.error ? (
							<div className="rounded-md bg-error/10 p-4 text-error text-sm">
								{getErrorMessage(
									createDayMutation.error || updateDayMutation.error,
									"開催日の保存に失敗しました",
								)}
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsDayDialogOpen(false)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveDay}
							disabled={
								createDayMutation.isPending || updateDayMutation.isPending
							}
						>
							{createDayMutation.isPending || updateDayMutation.isPending
								? "保存中..."
								: "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* イベント削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						deleteMutation.reset();
					}
				}}
				title="イベントの削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※関連する開催日情報も削除されます。この操作は取り消せません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>

			{/* 開催日削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteDayTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteDayTarget(null);
						deleteDayMutation.reset();
					}
				}}
				title="開催日の削除"
				description={`${deleteDayTarget?.dayNumber}日目（${deleteDayTarget?.date}）を削除しますか？この操作は取り消せません。`}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDeleteDay}
				isLoading={deleteDayMutation.isPending}
			/>
		</div>
	);
}
