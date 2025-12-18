import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useState } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";
import {
	type Event,
	type EventDay,
	type EventWithDays,
	eventDaysApi,
	eventSeriesApi,
	eventsApi,
} from "@/lib/api-client";
import { suggestFromEventName } from "@/lib/event-name-parser";

export const Route = createFileRoute("/admin/_admin/events")({
	component: EventsPage,
});

function EventsPage() {
	const queryClient = useQueryClient();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [seriesFilter, setSeriesFilter] = useState("");

	const debouncedSearch = useDebounce(search, 300);

	const [editingEvent, setEditingEvent] = useState<EventWithDays | null>(null);
	const [editForm, setEditForm] = useState<Partial<Event>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<Event>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 開催日編集用
	const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
	const [editingDay, setEditingDay] = useState<EventDay | null>(null);
	const [dayForm, setDayForm] = useState<Partial<EventDay>>({});

	// シリーズ新規作成用
	const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
	const [newSeriesName, setNewSeriesName] = useState("");

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

	// シリーズリストをユーティリティ関数で使えるようにラップ
	const suggest = useCallback(
		(eventName: string) => suggestFromEventName(eventName, seriesList),
		[seriesList],
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["events", page, pageSize, debouncedSearch, seriesFilter],
		queryFn: () =>
			eventsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				seriesId: seriesFilter || undefined,
			}),
		staleTime: 30_000,
	});

	const events = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["events"] });
	};

	const handleCreateSeries = async () => {
		if (!newSeriesName.trim()) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			const newSeries = await eventSeriesApi.create({
				id,
				name: newSeriesName.trim(),
			});
			// シリーズ一覧を更新
			queryClient.invalidateQueries({ queryKey: ["event-series"] });
			// 新しいシリーズを選択状態にする（新規作成または編集中のフォーム）
			if (editingEvent) {
				setEditForm({ ...editForm, eventSeriesId: newSeries.id });
			} else {
				setCreateForm({ ...createForm, eventSeriesId: newSeries.id });
			}
			setIsSeriesDialogOpen(false);
			setNewSeriesName("");
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "シリーズの作成に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCreate = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const id = nanoid();
			await eventsApi.create({
				id,
				eventSeriesId: createForm.eventSeriesId || "",
				name: createForm.name || "",
				edition: createForm.edition || null,
				totalDays: createForm.totalDays || null,
				venue: createForm.venue || null,
				startDate: createForm.startDate || null,
				endDate: createForm.endDate || null,
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

	const handleUpdate = async () => {
		if (!editingEvent) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await eventsApi.update(editingEvent.id, {
				eventSeriesId: editForm.eventSeriesId,
				name: editForm.name,
				edition: editForm.edition,
				totalDays: editForm.totalDays,
				venue: editForm.venue,
				startDate: editForm.startDate,
				endDate: editForm.endDate,
			});
			setEditingEvent(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (event: Event) => {
		if (
			!confirm(
				`「${event.name}」を削除しますか？\n※関連する開催日情報も削除されます。`,
			)
		)
			return;
		try {
			await eventsApi.delete(event.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
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
			setMutationError(null);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "イベント情報の取得に失敗しました",
			);
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
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingDay) {
				// 更新
				await eventDaysApi.update(editingEvent.id, editingDay.id, {
					dayNumber: dayForm.dayNumber,
					date: dayForm.date,
				});
			} else {
				// 新規作成
				const id = nanoid();
				await eventDaysApi.create(editingEvent.id, {
					id,
					dayNumber: dayForm.dayNumber || 1,
					date: dayForm.date || "",
				});
			}
			setIsDayDialogOpen(false);
			// イベント詳細を再取得
			const updated = await eventsApi.get(editingEvent.id);
			setEditingEvent(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "開催日の保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// 開催日削除
	const handleDeleteDay = async (day: EventDay) => {
		if (!editingEvent) return;
		if (!confirm(`${day.dayNumber}日目（${day.date}）を削除しますか？`)) return;
		try {
			await eventDaysApi.delete(editingEvent.id, day.id);
			const updated = await eventsApi.get(editingEvent.id);
			setEditingEvent(updated);
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "開催日の削除に失敗しました",
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

	const handleSeriesFilterChange = (value: string) => {
		setSeriesFilter(value);
		setPage(1);
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

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="イベント管理"
				breadcrumbs={[{ label: "イベント" }]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="イベント名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					filterOptions={seriesOptions}
					filterValue={seriesFilter}
					filterPlaceholder="シリーズで絞り込み"
					onFilterChange={handleSeriesFilterChange}
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
									<TableHead className="min-w-[200px]">イベント名</TableHead>
									<TableHead className="w-[160px]">シリーズ</TableHead>
									<TableHead className="w-[70px]">回次</TableHead>
									<TableHead className="w-[180px]">開催期間</TableHead>
									<TableHead className="w-[120px]">会場</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{events.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={6}
											className="h-24 text-center text-base-content/50"
										>
											該当するイベントが見つかりません
										</TableCell>
									</TableRow>
								) : (
									events.map((event) => (
										<TableRow key={event.id}>
											<TableCell className="font-medium">
												{event.name}
											</TableCell>
											<TableCell>
												<Badge variant="outline">
													{event.seriesName || "-"}
												</Badge>
											</TableCell>
											<TableCell className="whitespace-nowrap text-base-content/70">
												{event.edition ? `第${event.edition}回` : "-"}
											</TableCell>
											<TableCell className="whitespace-nowrap text-base-content/70">
												{formatDateRange(event.startDate, event.endDate)}
											</TableCell>
											<TableCell className="text-base-content/70">
												{event.venue || "-"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
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
														onClick={() => handleDelete(event)}
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
						<DialogTitle>新規イベント</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								イベント名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) => {
									const newName = e.target.value;
									const { seriesId, edition } = suggest(newName);
									setCreateForm({
										...createForm,
										name: newName,
										// シリーズが未選択の場合のみ自動設定
										...(seriesId && !createForm.eventSeriesId
											? { eventSeriesId: seriesId }
											: {}),
										// 回次が未入力の場合のみ自動設定
										...(edition !== null && !createForm.edition
											? { edition }
											: {}),
									});
								}}
								placeholder="例: コミックマーケット104"
							/>
							<p className="text-base-content/50 text-xs">
								イベント名からシリーズと回次を自動推察します
							</p>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-seriesId">
								シリーズ <span className="text-error">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<Select
									id="create-seriesId"
									value={createForm.eventSeriesId || ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											eventSeriesId: e.target.value,
										})
									}
									className="flex-1"
								>
									<option value="">選択してください</option>
									{seriesList.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</Select>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsSeriesDialogOpen(true)}
								>
									<Plus className="mr-1 h-4 w-4" />
									新規シリーズ
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-edition">回次</Label>
								<Input
									id="create-edition"
									type="number"
									min="1"
									value={createForm.edition ?? ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											edition: e.target.value ? Number(e.target.value) : null,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-totalDays">開催日数</Label>
								<Input
									id="create-totalDays"
									type="number"
									min="1"
									value={createForm.totalDays ?? ""}
									onChange={(e) =>
										setCreateForm({
											...createForm,
											totalDays: e.target.value ? Number(e.target.value) : null,
										})
									}
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="create-venue">会場</Label>
							<Input
								id="create-venue"
								value={createForm.venue || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, venue: e.target.value })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="create-startDate">開始日</Label>
								<Input
									id="create-startDate"
									type="date"
									value={createForm.startDate || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, startDate: e.target.value })
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="create-endDate">終了日</Label>
								<Input
									id="create-endDate"
									type="date"
									value={createForm.endDate || ""}
									onChange={(e) =>
										setCreateForm({ ...createForm, endDate: e.target.value })
									}
								/>
							</div>
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

			{/* シリーズ新規作成ダイアログ */}
			<Dialog
				open={isSeriesDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsSeriesDialogOpen(false);
						setNewSeriesName("");
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="new-series-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="new-series-name"
								value={newSeriesName}
								onChange={(e) => setNewSeriesName(e.target.value)}
								placeholder="例: コミックマーケット"
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
							onClick={() => setIsSeriesDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreateSeries}
							disabled={isSubmitting || !newSeriesName.trim()}
						>
							{isSubmitting ? "作成中..." : "作成"}
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
						setMutationError(null);
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
							<Label htmlFor="edit-seriesId">
								シリーズ <span className="text-error">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<Select
									id="edit-seriesId"
									value={editForm.eventSeriesId || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, eventSeriesId: e.target.value })
									}
									className="flex-1"
								>
									<option value="">選択してください</option>
									{seriesList.map((s) => (
										<option key={s.id} value={s.id}>
											{s.name}
										</option>
									))}
								</Select>
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsSeriesDialogOpen(true)}
								>
									<Plus className="mr-1 h-4 w-4" />
									新規シリーズ
								</Button>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-edition">回次</Label>
								<Input
									id="edit-edition"
									type="number"
									min="1"
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
								<Label className="flex items-center gap-2">
									<Calendar className="h-4 w-4" />
									開催日
								</Label>
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
											className="flex items-center justify-between rounded border border-base-300 p-2"
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
													onClick={() => handleDeleteDay(day)}
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
							disabled={isSubmitting}
						>
							{isSubmitting ? "保存中..." : "保存"}
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
						setMutationError(null);
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
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setIsDayDialogOpen(false)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleSaveDay}
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
