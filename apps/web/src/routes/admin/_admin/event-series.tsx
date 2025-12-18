import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowUpDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
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
import { useDebounce } from "@/hooks/use-debounce";
import { type EventSeries, eventSeriesApi } from "@/lib/api-client";

export const Route = createFileRoute("/admin/_admin/event-series")({
	component: EventSeriesPage,
});

// ソート可能な行コンポーネント
function SortableRow({
	series,
	onEdit,
	onDelete,
}: {
	series: EventSeries;
	onEdit: (series: EventSeries) => void;
	onDelete: (series: EventSeries) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: series.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<TableRow ref={setNodeRef} style={style}>
			<TableCell className="w-[50px]">
				<button
					type="button"
					className="cursor-grab touch-none p-1 text-base-content/50 hover:text-base-content"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="h-4 w-4" />
				</button>
			</TableCell>
			<TableCell className="w-[80px] text-base-content/70">
				{series.sortOrder}
			</TableCell>
			<TableCell className="font-medium">{series.name}</TableCell>
			<TableCell className="whitespace-nowrap text-base-content/70">
				{format(new Date(series.createdAt), "yyyy/MM/dd HH:mm:ss", {
					locale: ja,
				})}
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" onClick={() => onEdit(series)}>
						<Pencil className="h-4 w-4" />
						<span className="sr-only">編集</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-error hover:text-error"
						onClick={() => onDelete(series)}
					>
						<Trash2 className="h-4 w-4" />
						<span className="sr-only">削除</span>
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

function EventSeriesPage() {
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);

	const [editingSeries, setEditingSeries] = useState<EventSeries | null>(null);
	const [editForm, setEditForm] = useState<Partial<EventSeries>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<EventSeries>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const { data, isLoading, error } = useQuery({
		queryKey: ["event-series", debouncedSearch],
		queryFn: () => eventSeriesApi.list(debouncedSearch || undefined),
		staleTime: 30_000,
	});

	const seriesList = data?.data ?? [];
	const total = data?.total ?? 0;

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["event-series"] });
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = seriesList.findIndex((item) => item.id === active.id);
			const newIndex = seriesList.findIndex((item) => item.id === over.id);

			const newList = arrayMove(seriesList, oldIndex, newIndex);

			// 楽観的UI更新
			queryClient.setQueryData(
				["event-series", debouncedSearch],
				(old: typeof data) => {
					if (!old) return old;
					return { ...old, data: newList };
				},
			);

			// APIに新しい順序を送信
			try {
				const items = newList.map((item, index) => ({
					id: item.id,
					sortOrder: index,
				}));
				await eventSeriesApi.reorder(items);
				invalidateQuery();
			} catch (e) {
				// エラー時は元に戻す
				invalidateQuery();
				setMutationError(
					e instanceof Error ? e.message : "並び替えに失敗しました",
				);
			}
		}
	};

	// 順序を整理（連番に振り直し）
	const handleReorder = async () => {
		if (seriesList.length === 0) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			const items = seriesList.map((item, index) => ({
				id: item.id,
				sortOrder: index,
			}));
			await eventSeriesApi.reorder(items);
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序の整理に失敗しました",
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
			await eventSeriesApi.create({
				id,
				name: createForm.name || "",
				sortOrder: seriesList.length, // 末尾に追加
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
		if (!editingSeries) return;
		setIsSubmitting(true);
		setMutationError(null);
		try {
			await eventSeriesApi.update(editingSeries.id, {
				name: editForm.name,
				sortOrder: editForm.sortOrder,
			});
			setEditingSeries(null);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "更新に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (series: EventSeries) => {
		if (
			!confirm(
				`「${series.name}」を削除しますか？\n※イベントが紐付いている場合は削除できません。`,
			)
		)
			return;
		try {
			await eventSeriesApi.delete(series.id);
			invalidateQuery();
		} catch (e) {
			setMutationError(e instanceof Error ? e.message : "削除に失敗しました");
		}
	};

	const handleEdit = (series: EventSeries) => {
		setEditingSeries(series);
		setEditForm({
			name: series.name,
			sortOrder: series.sortOrder,
		});
		setMutationError(null);
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	const displayError =
		mutationError || (error instanceof Error ? error.message : null);

	// 検索中はD&Dを無効化
	const isDndDisabled = !!debouncedSearch;

	return (
		<div className="container mx-auto py-6">
			<AdminPageHeader
				title="イベントシリーズ管理"
				breadcrumbs={[
					{ label: "イベント管理", href: "/admin/events" },
					{ label: "シリーズ" },
				]}
			/>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="シリーズ名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					primaryAction={{
						label: "新規作成",
						onClick: () => setIsCreateDialogOpen(true),
					}}
					secondaryActions={[
						{
							label: "順序を整理",
							icon: <ArrowUpDown className="h-4 w-4" />,
							onClick: handleReorder,
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
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[50px]" />
									<TableHead className="w-[80px]">順序</TableHead>
									<TableHead>シリーズ名</TableHead>
									<TableHead className="w-[160px]">作成日時</TableHead>
									<TableHead className="w-[70px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{seriesList.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="h-24 text-center text-base-content/50"
										>
											該当するシリーズが見つかりません
										</TableCell>
									</TableRow>
								) : isDndDisabled ? (
									// 検索中は通常の行を表示
									seriesList.map((series) => (
										<TableRow key={series.id}>
											<TableCell className="w-[50px]">
												<span className="p-1 text-base-content/30">
													<GripVertical className="h-4 w-4" />
												</span>
											</TableCell>
											<TableCell className="text-base-content/70">
												{series.sortOrder}
											</TableCell>
											<TableCell className="font-medium">
												{series.name}
											</TableCell>
											<TableCell className="whitespace-nowrap text-base-content/70">
												{format(
													new Date(series.createdAt),
													"yyyy/MM/dd HH:mm",
													{
														locale: ja,
													},
												)}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => handleEdit(series)}
													>
														<Pencil className="h-4 w-4" />
														<span className="sr-only">編集</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-error hover:text-error"
														onClick={() => handleDelete(series)}
													>
														<Trash2 className="h-4 w-4" />
														<span className="sr-only">削除</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))
								) : (
									<SortableContext
										items={seriesList.map((s) => s.id)}
										strategy={verticalListSortingStrategy}
									>
										{seriesList.map((series) => (
											<SortableRow
												key={series.id}
												series={series}
												onEdit={handleEdit}
												onDelete={handleDelete}
											/>
										))}
									</SortableContext>
								)}
							</TableBody>
						</Table>
					</DndContext>
				)}

				<div className="border-base-300 border-t p-4 text-base-content/70 text-sm">
					全 {total} 件
					{isDndDisabled && (
						<span className="ml-2 text-warning">
							（検索中は並び替えできません）
						</span>
					)}
				</div>
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
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>新規シリーズ</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="create-name">
								シリーズ名 <span className="text-error">*</span>
							</Label>
							<Input
								id="create-name"
								value={createForm.name || ""}
								onChange={(e) =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
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
							onClick={() => setIsCreateDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleCreate}
							disabled={isSubmitting || !createForm.name?.trim()}
						>
							{isSubmitting ? "作成中..." : "作成"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editingSeries}
				onOpenChange={(open) => {
					if (!open) {
						setEditingSeries(null);
						setMutationError(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>シリーズの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="edit-name">
								シリーズ名 <span className="text-error">*</span>
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
							<Label htmlFor="edit-sortOrder">表示順序</Label>
							<Input
								id="edit-sortOrder"
								type="number"
								min="0"
								value={editForm.sortOrder ?? 0}
								onChange={(e) =>
									setEditForm({
										...editForm,
										sortOrder: e.target.value ? Number(e.target.value) : 0,
									})
								}
							/>
							<p className="text-base-content/50 text-xs">
								小さい値が先に表示されます（ドラッグ＆ドロップでも変更可能）
							</p>
						</div>
						{mutationError && (
							<div className="rounded-md bg-error/10 p-3 text-error text-sm">
								{mutationError}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => setEditingSeries(null)}>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={handleUpdate}
							disabled={isSubmitting || !editForm.name?.trim()}
						>
							{isSubmitting ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
