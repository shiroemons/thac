import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowUpDown, Eye, Home, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { EventSeriesEditDialog } from "@/components/admin/event-series-edit-dialog";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { SortIcon } from "@/components/admin/sort-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import type { EventSeries } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { eventSeriesMutations } from "@/lib/mutation-options";
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
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	// 個別削除ダイアログ状態
	const [deleteTarget, setDeleteTarget] = useState<EventSeries | null>(null);

	// Mutations
	const deleteMutation = useMutation(eventSeriesMutations.delete(queryClient));
	const updateMutation = useMutation(eventSeriesMutations.update(queryClient));
	const reorderMutation = useMutation(
		eventSeriesMutations.reorder(queryClient),
	);

	const { data, isPending, isFetching, error } = useQuery(
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
	const handleMoveUp = (series: EventSeries, index: number) => {
		if (index === 0 || isReorderDisabled) return;
		const prevSeries = seriesList[index - 1];

		// 現在のシリーズと前のシリーズのsortOrderを入れ替え
		updateMutation.mutate(
			{ id: series.id, data: { sortOrder: prevSeries.sortOrder } },
			{
				onSuccess: () => {
					updateMutation.mutate({
						id: prevSeries.id,
						data: { sortOrder: series.sortOrder },
					});
				},
			},
		);
	};

	// 下へ移動
	const handleMoveDown = (series: EventSeries, index: number) => {
		if (index === seriesList.length - 1 || isReorderDisabled) return;
		const nextSeries = seriesList[index + 1];

		// 現在のシリーズと次のシリーズのsortOrderを入れ替え
		updateMutation.mutate(
			{ id: series.id, data: { sortOrder: nextSeries.sortOrder } },
			{
				onSuccess: () => {
					updateMutation.mutate({
						id: nextSeries.id,
						data: { sortOrder: series.sortOrder },
					});
				},
			},
		);
	};

	// 順序を整理（連番に振り直し）
	const handleReorder = () => {
		if (seriesList.length === 0) return;
		const items = seriesList.map((item, index) => ({
			id: item.id,
			sortOrder: index,
		}));
		reorderMutation.mutate(items);
	};

	const handleDelete = () => {
		if (!deleteTarget) return;
		deleteMutation.mutate(deleteTarget.id, {
			onSuccess: () => setDeleteTarget(null),
		});
	};

	const handleEdit = (series: EventSeries) => {
		setEditingSeries(series);
		deleteMutation.reset();
		updateMutation.reset();
	};

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	const mutationError =
		deleteMutation.error || updateMutation.error || reorderMutation.error;
	const displayError =
		(mutationError instanceof Error ? mutationError.message : null) ||
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
					<li>イベントシリーズ管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">イベントシリーズ管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="シリーズ名で検索..."
					searchValue={search}
					onSearchChange={handleSearchChange}
					isLoading={isFetching}
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
							label: reorderMutation.isPending ? "整理中..." : "順序を整理",
							icon: <ArrowUpDown className="mr-2 h-4 w-4" />,
							onClick: handleReorder,
							disabled: reorderMutation.isPending || seriesList.length === 0,
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
											<TableCell className="font-mono text-base-content/50 text-sm">
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
													onClick={() => setDeleteTarget(series)}
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
			<EventSeriesEditDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				mode="create"
				defaultSortOrder={seriesList.length}
				onSuccess={invalidateQuery}
			/>

			{/* 編集ダイアログ */}
			<EventSeriesEditDialog
				open={!!editingSeries}
				onOpenChange={(open) => {
					if (!open) setEditingSeries(null);
				}}
				mode="edit"
				eventSeries={editingSeries}
				onSuccess={invalidateQuery}
			/>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						deleteMutation.reset();
					}
				}}
				title="イベントシリーズの削除"
				description={
					<div>
						<p>「{deleteTarget?.name}」を削除しますか？</p>
						<p className="mt-2 text-error text-sm">
							※イベントが紐付いている場合は削除できません。
						</p>
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={handleDelete}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
