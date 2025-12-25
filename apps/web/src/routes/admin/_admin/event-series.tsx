import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createId } from "@thac/db";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowUpDown, Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { SortIcon } from "@/components/admin/sort-icon";
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
import { useSortableTable } from "@/hooks/use-sortable-table";
import { type EventSeries, eventSeriesApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { eventSeriesListQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/admin/_admin/event-series")({
	head: () => createPageHead("イベントシリーズ"),
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(eventSeriesListQueryOptions()),
	component: EventSeriesPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "シリーズ名" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function EventSeriesPage() {
	const queryClient = useQueryClient();

	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 300);

	// ソート状態管理
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		onSortChange: () => {},
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:event-series",
		columnConfigs,
	);

	const [editingSeries, setEditingSeries] = useState<EventSeries | null>(null);
	const [editForm, setEditForm] = useState<Partial<EventSeries>>({});
	const [mutationError, setMutationError] = useState<string | null>(null);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [createForm, setCreateForm] = useState<Partial<EventSeries>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { data, isPending, error } = useQuery(
		eventSeriesListQueryOptions({
			search: debouncedSearch || undefined,
			sortBy,
			sortOrder,
		}),
	);

	const seriesList = data?.data ?? [];
	const total = data?.total ?? 0;

	// 並べ替えが無効な条件
	const isReorderDisabled = !!debouncedSearch || sortBy !== "sortOrder";

	const invalidateQuery = () => {
		queryClient.invalidateQueries({ queryKey: ["event-series"] });
	};

	// 上へ移動
	const handleMoveUp = async (series: EventSeries, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevSeries = seriesList[index - 1];

		try {
			// 現在のシリーズと前のシリーズのsortOrderを入れ替え
			await eventSeriesApi.update(series.id, {
				sortOrder: prevSeries.sortOrder,
			});
			await eventSeriesApi.update(prevSeries.id, {
				sortOrder: series.sortOrder,
			});
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
		}
	};

	// 下へ移動
	const handleMoveDown = async (series: EventSeries, index: number) => {
		if (index === seriesList.length - 1 || isReorderDisabled) return;
		const nextSeries = seriesList[index + 1];

		try {
			// 現在のシリーズと次のシリーズのsortOrderを入れ替え
			await eventSeriesApi.update(series.id, {
				sortOrder: nextSeries.sortOrder,
			});
			await eventSeriesApi.update(nextSeries.id, {
				sortOrder: series.sortOrder,
			});
			invalidateQuery();
		} catch (e) {
			setMutationError(
				e instanceof Error ? e.message : "順序変更に失敗しました",
			);
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
			const id = createId.eventSeries();
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
					<li>イベントシリーズ管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">イベントシリーズ管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100 shadow-sm">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="シリーズ名で検索..."
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
					secondaryActions={[
						{
							label: isSubmitting ? "整理中..." : "順序を整理",
							icon: <ArrowUpDown className="mr-2 h-4 w-4" />,
							onClick: handleReorder,
							disabled: isSubmitting || seriesList.length === 0,
						},
					]}
				/>

				{displayError && (
					<div className="border-base-300 border-b bg-error/10 p-3 text-error text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
					<DataTableSkeleton
						rows={5}
						columns={5}
						showActionBar={false}
						showPagination={false}
					/>
				) : (
					<Table zebra>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead
									className="w-[120px] cursor-pointer select-none hover:bg-base-200"
									onClick={() => handleSort("sortOrder")}
								>
									並び替え
									<SortIcon
										column="sortOrder"
										sortBy={sortBy}
										sortOrder={sortOrder}
									/>
								</TableHead>
								{isVisible("id") && (
									<TableHead className="w-[100px]">ID</TableHead>
								)}
								{isVisible("name") && (
									<TableHead
										className="cursor-pointer select-none hover:bg-base-200"
										onClick={() => handleSort("name")}
									>
										シリーズ名
										<SortIcon
											column="name"
											sortBy={sortBy}
											sortOrder={sortOrder}
										/>
									</TableHead>
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
							{seriesList.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={visibleColumns.size + 2}
										className="h-24 text-center text-base-content/50"
									>
										該当するシリーズが見つかりません
									</TableCell>
								</TableRow>
							) : (
								seriesList.map((series, index) => (
									<TableRow key={series.id}>
										<TableCell>
											<ReorderButtons
												sortOrder={series.sortOrder}
												onMoveUp={() => handleMoveUp(series, index)}
												onMoveDown={() => handleMoveDown(series, index)}
												isFirst={index === 0}
												isLast={index === seriesList.length - 1}
												disabled={isReorderDisabled}
											/>
										</TableCell>
										{isVisible("id") && (
											<TableCell className="font-mono text-base-content/50 text-xs">
												{series.id}
											</TableCell>
										)}
										{isVisible("name") && (
											<TableCell className="font-medium">
												{series.name}
											</TableCell>
										)}
										{isVisible("createdAt") && (
											<TableCell className="whitespace-nowrap text-base-content/70">
												{format(
													new Date(series.createdAt),
													"yyyy/MM/dd HH:mm:ss",
													{
														locale: ja,
													},
												)}
											</TableCell>
										)}
										{isVisible("updatedAt") && (
											<TableCell className="whitespace-nowrap text-base-content/70">
												{format(
													new Date(series.updatedAt),
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
													to="/admin/event-series/$id"
													params={{ id: series.id }}
													className="btn btn-ghost btn-xs"
												>
													<Eye className="h-4 w-4" />
													<span className="sr-only">詳細</span>
												</Link>
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
							)}
						</TableBody>
					</Table>
				)}

				<div className="border-base-300 border-t p-4 text-base-content/70 text-sm">
					全 {total} 件
					{isReorderDisabled && debouncedSearch && (
						<span className="ml-2 text-warning">
							（検索中は並び替えできません）
						</span>
					)}
					{isReorderDisabled && !debouncedSearch && sortBy !== "sortOrder" && (
						<span className="ml-2 text-warning">
							（並び替えでソート中は移動できません）
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
								小さい値が先に表示されます
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
