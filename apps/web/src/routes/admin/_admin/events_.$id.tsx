import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type Event,
	type EventDay,
	eventDaysApi,
	eventSeriesApi,
	eventsApi,
} from "@/lib/api-client";
import { createEventDetailHead } from "@/lib/head";
import { eventDetailQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/events_/$id")({
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(eventDetailQueryOptions(params.id)),
	head: ({ loaderData }) => createEventDetailHead(loaderData?.name),
	component: EventDetailPage,
});

function EventDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Event>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// イベント日編集用
	const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);
	const [editingDay, setEditingDay] = useState<EventDay | null>(null);
	const [dayForm, setDayForm] = useState<{
		dayNumber: number;
		date: string;
	}>({
		dayNumber: 1,
		date: "",
	});

	const { data: event, isPending } = useQuery(eventDetailQueryOptions(id));

	// イベントシリーズ一覧取得（編集モード時のみ）
	const { data: eventSeriesData } = useQuery({
		queryKey: ["event-series"],
		queryFn: () => eventSeriesApi.list(),
		staleTime: 60_000,
		enabled: isEditing,
	});

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["events", id] });
	};

	// 編集開始
	const startEditing = () => {
		if (event) {
			setEditForm({
				name: event.name,
				eventSeriesId: event.eventSeriesId,
				edition: event.edition,
				venue: event.venue,
				startDate: event.startDate,
				endDate: event.endDate,
			});
			setIsEditing(true);
		}
	};

	// 編集キャンセル
	const cancelEditing = () => {
		setIsEditing(false);
		setEditForm({});
		setMutationError(null);
	};

	// 保存
	const handleSave = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await eventsApi.update(id, {
				name: editForm.name,
				eventSeriesId: editForm.eventSeriesId,
				edition: editForm.edition ?? null,
				venue: editForm.venue || null,
				startDate: editForm.startDate || null,
				endDate: editForm.endDate || null,
			});
			invalidateQuery();
			setIsEditing(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// イベント削除
	const handleDelete = async () => {
		if (
			!confirm("このイベントを削除しますか？関連するイベント日も削除されます。")
		) {
			return;
		}
		try {
			await eventsApi.delete(id);
			navigate({ to: "/admin/events" });
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// イベント日ダイアログを開く
	const openDayDialog = (day?: EventDay) => {
		if (day) {
			setEditingDay(day);
			setDayForm({
				dayNumber: day.dayNumber,
				date: day.date,
			});
		} else {
			setEditingDay(null);
			const nextDayNumber = event?.days
				? Math.max(...event.days.map((d) => d.dayNumber), 0) + 1
				: 1;
			setDayForm({
				dayNumber: nextDayNumber,
				date: "",
			});
		}
		setIsDayDialogOpen(true);
	};

	// イベント日保存
	const handleDaySubmit = async () => {
		setIsSubmitting(true);
		setMutationError(null);
		try {
			if (editingDay) {
				await eventDaysApi.update(id, editingDay.id, {
					dayNumber: dayForm.dayNumber,
					date: dayForm.date,
				});
			} else {
				await eventDaysApi.create(id, {
					id: createId.eventDay(),
					dayNumber: dayForm.dayNumber,
					date: dayForm.date,
				});
			}
			invalidateQuery();
			setIsDayDialogOpen(false);
		} catch (err) {
			setMutationError(
				err instanceof Error ? err.message : "保存に失敗しました",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	// イベント日削除
	const handleDayDelete = async (day: EventDay) => {
		if (!confirm(`${day.dayNumber}日目を削除しますか？`)) {
			return;
		}
		try {
			await eventDaysApi.delete(id, day.id);
			invalidateQuery();
		} catch (err) {
			alert(err instanceof Error ? err.message : "削除に失敗しました");
		}
	};

	// ローディング
	if (isPending && !event) {
		return <DetailPageSkeleton cardCount={2} fieldsPerCard={7} />;
	}

	// エラー・未存在
	if (!event) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>イベントが見つかりません</span>
				</div>
				<Link to="/admin/events" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					イベント一覧に戻る
				</Link>
			</div>
		);
	}

	// 開催日を日付順でソート
	const sortedDays = [...event.days].sort((a, b) => a.dayNumber - b.dayNumber);

	return (
		<div className="container mx-auto space-y-6 p-6">
			{/* パンくずナビゲーション */}
			<nav className="breadcrumbs text-sm">
				<ul>
					<li>
						<Link to="/admin/events">イベント管理</Link>
					</li>
					<li>{event.name}</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin/events" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<h1 className="font-bold text-2xl">{event.name}</h1>
				</div>
				{!isEditing && (
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={startEditing}>
							<Pencil className="mr-2 h-4 w-4" />
							編集
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="text-error hover:text-error"
							onClick={handleDelete}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							削除
						</Button>
					</div>
				)}
			</div>

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					{mutationError && (
						<div className="mb-4 rounded-md bg-error/10 p-3 text-error text-sm">
							{mutationError}
						</div>
					)}

					{isEditing ? (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="form-control">
								<Label>
									名前 <span className="text-error">*</span>
								</Label>
								<Input
									value={editForm.name || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, name: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>
									イベントシリーズ <span className="text-error">*</span>
								</Label>
								<SearchableSelect
									value={editForm.eventSeriesId || ""}
									onChange={(value) =>
										setEditForm({
											...editForm,
											eventSeriesId: value || "",
										})
									}
									options={
										eventSeriesData?.data.map((series) => ({
											value: series.id,
											label: series.name,
										})) ?? []
									}
									placeholder="イベントシリーズを選択"
									searchPlaceholder="イベントシリーズを検索..."
									emptyMessage="イベントシリーズが見つかりません"
									clearable={false}
								/>
							</div>
							<div className="form-control">
								<Label>回次</Label>
								<Input
									type="number"
									min={1}
									value={editForm.edition ?? ""}
									onChange={(e) =>
										setEditForm({
											...editForm,
											edition: e.target.value ? Number(e.target.value) : null,
										})
									}
								/>
							</div>
							<div className="form-control">
								<Label>会場</Label>
								<Input
									value={editForm.venue || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, venue: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>開始日</Label>
								<Input
									type="date"
									value={editForm.startDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, startDate: e.target.value })
									}
								/>
							</div>
							<div className="form-control">
								<Label>終了日</Label>
								<Input
									type="date"
									value={editForm.endDate || ""}
									onChange={(e) =>
										setEditForm({ ...editForm, endDate: e.target.value })
									}
								/>
							</div>
							<div className="flex justify-end gap-2 md:col-span-2">
								<Button
									variant="ghost"
									onClick={cancelEditing}
									disabled={isSubmitting}
								>
									キャンセル
								</Button>
								<Button
									variant="primary"
									onClick={handleSave}
									disabled={
										isSubmitting || !editForm.name || !editForm.eventSeriesId
									}
								>
									{isSubmitting ? "保存中..." : "保存"}
								</Button>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label className="text-base-content/60">名前</Label>
								<p className="font-medium">{event.name}</p>
							</div>
							<div>
								<Label className="text-base-content/60">イベントシリーズ</Label>
								<p>
									{event.seriesName ? (
										<Link
											to="/admin/event-series/$id"
											params={{ id: event.eventSeriesId }}
											className="text-primary hover:underline"
										>
											{event.seriesName}
										</Link>
									) : (
										"-"
									)}
								</p>
							</div>
							<div>
								<Label className="text-base-content/60">回次</Label>
								<p>{event.edition != null ? `第${event.edition}回` : "-"}</p>
							</div>
							<div>
								<Label className="text-base-content/60">開催日数</Label>
								<p>
									{event.totalDays != null ? `${event.totalDays}日間` : "-"}
								</p>
							</div>
							<div>
								<Label className="text-base-content/60">開始日</Label>
								<p>
									{event.startDate
										? format(new Date(event.startDate), "yyyy年M月d日", {
												locale: ja,
											})
										: "-"}
								</p>
							</div>
							<div>
								<Label className="text-base-content/60">終了日</Label>
								<p>
									{event.endDate
										? format(new Date(event.endDate), "yyyy年M月d日", {
												locale: ja,
											})
										: "-"}
								</p>
							</div>
							<div className="md:col-span-2">
								<Label className="text-base-content/60">会場</Label>
								<p>{event.venue || "-"}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* 開催日一覧カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							<Calendar className="h-5 w-5" />
							開催日一覧
						</h2>
						<Button variant="outline" size="sm" onClick={() => openDayDialog()}>
							<Plus className="mr-2 h-4 w-4" />
							開催日追加
						</Button>
					</div>

					{sortedDays.length === 0 ? (
						<p className="text-base-content/60">開催日が登録されていません</p>
					) : (
						<div className="overflow-x-auto">
							<Table zebra>
								<TableHeader>
									<TableRow className="hover:bg-transparent">
										<TableHead className="w-[100px]">日目</TableHead>
										<TableHead>日付</TableHead>
										<TableHead className="w-[100px]">操作</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sortedDays.map((day) => (
										<TableRow key={day.id}>
											<TableCell className="font-medium">
												{day.dayNumber}日目
											</TableCell>
											<TableCell>
												{format(new Date(day.date), "yyyy年M月d日（E）", {
													locale: ja,
												})}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => openDayDialog(day)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDayDelete(day)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>

			{/* イベント日編集ダイアログ */}
			<Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>
							{editingDay ? "開催日の編集" : "開催日の追加"}
						</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
						<div className="grid gap-2">
							<Label>
								日目 <span className="text-error">*</span>
							</Label>
							<Input
								type="number"
								min={1}
								value={dayForm.dayNumber}
								onChange={(e) =>
									setDayForm({
										...dayForm,
										dayNumber: Number(e.target.value),
									})
								}
							/>
						</div>
						<div className="grid gap-2">
							<Label>
								日付 <span className="text-error">*</span>
							</Label>
							<Input
								type="date"
								value={dayForm.date}
								onChange={(e) =>
									setDayForm({ ...dayForm, date: e.target.value })
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setIsDayDialogOpen(false)}
							disabled={isSubmitting}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleDaySubmit}
							disabled={isSubmitting || !dayForm.dayNumber || !dayForm.date}
						>
							{isSubmitting
								? editingDay
									? "更新中..."
									: "追加中..."
								: editingDay
									? "更新"
									: "追加"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
