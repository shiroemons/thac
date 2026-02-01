import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Hash, Home, Merge, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTableActionBar } from "@/components/admin/data-table-action-bar";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DataTableSkeleton } from "@/components/admin/data-table-skeleton";
import { AdminRowActions } from "@/components/admin/row-action-menu";
import { SortIcon } from "@/components/admin/sort-icon";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TagBadge } from "@/components/ui/tag-badge";
import { useColumnVisibility } from "@/hooks/use-column-visibility";
import { useDebounce } from "@/hooks/use-debounce";
import { useSortableTable } from "@/hooks/use-sortable-table";
import { type TagWithCount, tagsApi } from "@/lib/api-client";
import { createPageHead } from "@/lib/head";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/admin/_admin/tags")({
	head: () => createPageHead("タグ管理"),
	component: TagsPage,
});

// カラム定義
const COLUMN_CONFIGS = [
	{ key: "id", label: "ID", defaultVisible: false },
	{ key: "name", label: "タグ名" },
	{ key: "trackCount", label: "使用数" },
	{ key: "createdAt", label: "作成日時", defaultVisible: false },
	{ key: "updatedAt", label: "更新日時", defaultVisible: false },
] as const;

function TagsPage() {
	const queryClient = useQueryClient();

	// ページネーション・フィルタ状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");

	// API呼び出し用にデバウンス（300ms）
	const debouncedSearch = useDebounce(search, 300);

	// ソート状態（3段階: 昇順→降順→リセット）
	const { sortBy, sortOrder, handleSort } = useSortableTable({
		defaultSortBy: "trackCount",
		defaultSortOrder: "desc",
		onSortChange: () => setPage(1),
	});

	// カラム表示設定
	const columnConfigs = useMemo(() => [...COLUMN_CONFIGS], []);
	const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility(
		"admin:tags",
		columnConfigs,
	);

	// 選択状態（マージ用）
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

	// ダイアログ状態
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [newTagName, setNewTagName] = useState("");
	const [editTarget, setEditTarget] = useState<TagWithCount | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<TagWithCount | null>(null);
	const [showMergeDialog, setShowMergeDialog] = useState(false);
	const [mergeTarget, setMergeTarget] = useState<string | null>(null);

	// データ取得
	const { data, isPending, isFetching, error } = useQuery({
		queryKey: ["tags", page, pageSize, debouncedSearch, sortBy, sortOrder],
		queryFn: () =>
			tagsApi.list({
				page,
				limit: pageSize,
				search: debouncedSearch || undefined,
				sortBy,
				sortOrder,
			}),
		staleTime: 30_000,
	});

	const tags = data?.data ?? [];
	const total = data?.total ?? 0;

	// Mutations
	const createMutation = useMutation({
		mutationFn: (name: string) => tagsApi.create({ name }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["tags"] });
			setIsCreateDialogOpen(false);
			setNewTagName("");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			tagsApi.update(id, { name }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["tags"] });
			setEditTarget(null);
			setEditName("");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => tagsApi.delete(id, true),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["tags"] });
			setDeleteTarget(null);
		},
	});

	const mergeMutation = useMutation({
		mutationFn: ({
			sourceIds,
			targetId,
		}: {
			sourceIds: string[];
			targetId: string;
		}) => tagsApi.merge(sourceIds, targetId),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["tags"] });
			setSelectedTags(new Set());
			setMergeTarget(null);
			setShowMergeDialog(false);
		},
	});

	// 選択されたタグの情報
	const selectedTagsList = useMemo(() => {
		return tags.filter((t) => selectedTags.has(t.id));
	}, [tags, selectedTags]);

	// タグ選択トグル
	const toggleTagSelection = (tagId: string) => {
		const newSet = new Set(selectedTags);
		if (newSet.has(tagId)) {
			newSet.delete(tagId);
		} else {
			newSet.add(tagId);
		}
		setSelectedTags(newSet);
	};

	// 全選択/全解除
	const toggleSelectAll = () => {
		if (selectedTags.size === tags.length && tags.length > 0) {
			setSelectedTags(new Set());
		} else {
			setSelectedTags(new Set(tags.map((t) => t.id)));
		}
	};

	// マージダイアログを開く
	const openMergeDialog = () => {
		if (selectedTags.size < 2) return;
		// 最も使用数の多いタグをデフォルトのターゲットに
		const sortedTags = [...selectedTagsList].sort(
			(a, b) => b.trackCount - a.trackCount,
		);
		setMergeTarget(sortedTags[0]?.id || null);
		setShowMergeDialog(true);
	};

	// マージ実行
	const confirmMerge = () => {
		if (!mergeTarget || selectedTags.size < 2) return;
		const sourceIds = [...selectedTags].filter((id) => id !== mergeTarget);
		mergeMutation.mutate({ sourceIds, targetId: mergeTarget });
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

	const mutationError =
		createMutation.error ||
		updateMutation.error ||
		deleteMutation.error ||
		mergeMutation.error;
	const displayError =
		(mutationError instanceof Error ? mutationError.message : null) ||
		(error instanceof Error ? error.message : null);

	const isPending2 =
		createMutation.isPending ||
		updateMutation.isPending ||
		deleteMutation.isPending ||
		mergeMutation.isPending;

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
					<li>タグ管理</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<h1 className="font-bold text-2xl">タグ管理</h1>

			<div className="rounded-lg border border-base-300 bg-base-100">
				<DataTableActionBar
					className="border-base-300 border-b p-4"
					searchPlaceholder="タグ名で検索..."
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
					secondaryActions={
						selectedTags.size >= 2
							? [
									{
										label: `マージ (${selectedTags.size}件)`,
										icon: <Merge className="h-4 w-4" />,
										onClick: openMergeDialog,
										disabled: isPending2,
									},
								]
							: []
					}
				>
					{selectedTags.size > 0 && (
						<div className="flex items-center gap-2 text-sm">
							<span className="text-base-content/70">
								{selectedTags.size}件選択中
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedTags(new Set())}
								disabled={isPending2}
							>
								選択解除
							</Button>
						</div>
					)}
				</DataTableActionBar>

				{displayError && (
					<div className="border-base-300 border-b bg-error p-4 text-error-content text-sm">
						{displayError}
					</div>
				)}

				{isPending && !data ? (
					<DataTableSkeleton
						rows={5}
						columns={4}
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
											id="tags-select-all"
											className="checkbox-sm"
											checked={
												tags.length > 0 && selectedTags.size === tags.length
											}
											indeterminate={
												selectedTags.size > 0 && selectedTags.size < tags.length
											}
											onCheckedChange={toggleSelectAll}
											aria-label="すべて選択"
										/>
									</TableHead>
									{isVisible("id") && <TableHead>ID</TableHead>}
									{isVisible("name") && (
										<TableHead
											className="cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("name")}
										>
											<span className="flex items-center gap-1">
												タグ名
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="name"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("trackCount") && (
										<TableHead
											className="w-[100px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("trackCount")}
										>
											<span className="flex items-center gap-1">
												使用数
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="trackCount"
												/>
											</span>
										</TableHead>
									)}
									{isVisible("createdAt") && (
										<TableHead
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("createdAt")}
										>
											<span className="flex items-center gap-1">
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
											className="w-[160px] cursor-pointer select-none hover:bg-base-200"
											onClick={() => handleSort("updatedAt")}
										>
											<span className="flex items-center gap-1">
												更新日時
												<SortIcon
													sortBy={sortBy}
													sortOrder={sortOrder}
													column="updatedAt"
												/>
											</span>
										</TableHead>
									)}
									<TableHead className="w-[120px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{tags.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={visibleColumns.size + 2}
											className="h-24 text-center text-base-content/50"
										>
											データがありません
										</TableCell>
									</TableRow>
								) : (
									tags.map((tag) => (
										<TableRow key={tag.id}>
											<TableCell>
												<Checkbox
													id={`tags-select-${tag.id}`}
													className="checkbox-sm"
													checked={selectedTags.has(tag.id)}
													onCheckedChange={() => toggleTagSelection(tag.id)}
													aria-label={`${tag.name}を選択`}
												/>
											</TableCell>
											{isVisible("id") && (
												<TableCell className="font-mono text-base-content/70 text-xs">
													{tag.id}
												</TableCell>
											)}
											{isVisible("name") && (
												<TableCell>
													<Link
														to="/admin/tags/$id"
														params={{ id: tag.id }}
														className="hover:opacity-80"
													>
														<TagBadge name={tag.name} />
													</Link>
												</TableCell>
											)}
											{isVisible("trackCount") && (
												<TableCell className="text-base-content/70 text-sm">
													{tag.trackCount}件
												</TableCell>
											)}
											{isVisible("createdAt") && (
												<TableCell className="whitespace-nowrap text-base-content/70 text-sm">
													{format(
														new Date(tag.createdAt),
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
														new Date(tag.updatedAt),
														"yyyy/MM/dd HH:mm:ss",
														{
															locale: ja,
														},
													)}
												</TableCell>
											)}
											<TableCell>
												<AdminRowActions
													viewHref="/admin/tags/$id"
													viewParams={{ id: tag.id }}
													onEdit={() => {
														setEditTarget(tag);
														setEditName(tag.name);
													}}
													onDelete={() => setDeleteTarget(tag)}
												/>
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
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>タグを作成</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<label className="label text-sm" htmlFor="new-tag-name">
								タグ名
							</label>
							<div className="flex items-center gap-2">
								<Hash className="h-4 w-4 text-base-content/50" />
								<Input
									id="new-tag-name"
									type="text"
									value={newTagName}
									onChange={(e) => setNewTagName(e.target.value)}
									placeholder="タグ名を入力"
									autoFocus
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
									onKeyDown={(e) => {
										if (e.key === "Enter" && newTagName.trim()) {
											createMutation.mutate(newTagName.trim());
										}
									}}
								/>
							</div>
						</div>
						{createMutation.error && (
							<div className="rounded-lg bg-error p-3 text-error-content text-sm">
								{getErrorMessage(createMutation.error)}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setIsCreateDialogOpen(false);
								setNewTagName("");
								createMutation.reset();
							}}
							disabled={createMutation.isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => createMutation.mutate(newTagName.trim())}
							disabled={!newTagName.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? (
								<span className="loading loading-spinner loading-sm" />
							) : (
								<Plus className="mr-1 h-4 w-4" />
							)}
							作成
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={!!deleteTarget}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
						deleteMutation.reset();
					}
				}}
				title="タグを削除"
				description={
					deleteTarget && deleteTarget.trackCount > 0 ? (
						<div>
							<p>「#{deleteTarget.name}」を削除しますか？</p>
							<p className="mt-2 text-sm text-warning">
								※このタグは {deleteTarget.trackCount}{" "}
								件のトラックで使用されています。
							</p>
							<p className="mt-1 text-error text-sm">
								この操作は取り消せません。
							</p>
						</div>
					) : (
						`「#${deleteTarget?.name}」を削除しますか？この操作は取り消せません。`
					)
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
				isLoading={deleteMutation.isPending}
			/>

			{/* マージダイアログ */}
			<Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>タグをマージ</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<p className="text-base-content/70 text-sm">
							選択したタグを1つのタグに統合します。マージ先のタグを選択してください。
						</p>

						<div className="flex flex-wrap gap-2">
							{selectedTagsList.map((tag) => (
								<TagBadge
									key={tag.id}
									name={tag.name}
									className={
										mergeTarget === tag.id ? "border-primary bg-primary/10" : ""
									}
								/>
							))}
						</div>

						<div className="grid gap-2">
							<label className="label text-sm" htmlFor="merge-target">
								マージ先（統合後のタグ名）
							</label>
							<select
								id="merge-target"
								className="select select-bordered w-full"
								value={mergeTarget || ""}
								onChange={(e) => setMergeTarget(e.target.value || null)}
							>
								{selectedTagsList.map((tag) => (
									<option key={tag.id} value={tag.id}>
										{tag.name} ({tag.trackCount}件)
									</option>
								))}
							</select>
						</div>

						<div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-content">
							マージすると、マージ元のタグは削除され、紐付けられていたトラックはすべてマージ先のタグに移動します。この操作は取り消せません。
						</div>

						{mergeMutation.error && (
							<div className="rounded-lg bg-error p-3 text-error-content text-sm">
								{getErrorMessage(mergeMutation.error)}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setShowMergeDialog(false);
								mergeMutation.reset();
							}}
							disabled={mergeMutation.isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={confirmMerge}
							disabled={!mergeTarget || mergeMutation.isPending}
						>
							{mergeMutation.isPending ? "マージ中..." : "マージ実行"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* 編集ダイアログ */}
			<Dialog
				open={!!editTarget}
				onOpenChange={(open) => {
					if (!open) {
						setEditTarget(null);
						setEditName("");
						updateMutation.reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle>タグを編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<label htmlFor="edit-tag-name" className="font-medium text-sm">
								タグ名
							</label>
							<div className="flex items-center gap-2">
								<Hash className="h-4 w-4 text-base-content/50" />
								<Input
									id="edit-tag-name"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									placeholder="タグ名を入力"
									autoFocus
									autoComplete="off"
									data-1p-ignore
									data-lpignore="true"
									data-form-type="other"
									onKeyDown={(e) => {
										if (e.key === "Enter" && editTarget && editName.trim()) {
											updateMutation.mutate({
												id: editTarget.id,
												name: editName.trim(),
											});
										}
									}}
								/>
							</div>
						</div>
						{updateMutation.error && (
							<div className="rounded-lg bg-error/10 p-3 text-error text-sm">
								{getErrorMessage(updateMutation.error)}
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => {
								setEditTarget(null);
								setEditName("");
								updateMutation.reset();
							}}
							disabled={updateMutation.isPending}
						>
							キャンセル
						</Button>
						<Button
							variant="primary"
							onClick={() => {
								if (editTarget && editName.trim()) {
									updateMutation.mutate({
										id: editTarget.id,
										name: editName.trim(),
									});
								}
							}}
							disabled={!editName.trim() || updateMutation.isPending}
						>
							{updateMutation.isPending ? "保存中..." : "保存"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
