import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Check,
	Edit2,
	ExternalLink,
	Merge,
	Search,
	Trash2,
	X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useDebounce } from "@/hooks/use-debounce";
import { type TagWithCount, tagsApi } from "@/lib/api-client";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { TagBadge } from "../ui/tag-badge";

interface TagManagementDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

interface TagManagementDialogContentProps {
	onClose: () => void;
	onSuccess?: () => void;
}

/**
 * ダイアログの内部コンテンツ
 * 親コンポーネントで key を使って再マウントすることで、状態をリセット
 */
function TagManagementDialogContent({
	onClose,
	onSuccess,
}: TagManagementDialogContentProps) {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
	const [editingTagId, setEditingTagId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [mergeTarget, setMergeTarget] = useState<string | null>(null);
	const [showMergeDialog, setShowMergeDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const limit = 50;

	// 前回のdebouncedSearchを追跡してページリセットを制御
	const prevDebouncedSearchRef = useRef<string>("");
	const debouncedSearch = useDebounce(search, 300);

	// 検索が変わったらページをリセット（イベントハンドラ内で処理）
	if (debouncedSearch !== prevDebouncedSearchRef.current) {
		prevDebouncedSearchRef.current = debouncedSearch;
		if (page !== 1) {
			setPage(1);
		}
	}

	// タグ一覧取得
	const { data: tagsData, isFetching } = useQuery({
		queryKey: ["tags", { search: debouncedSearch, page, limit }],
		queryFn: () =>
			tagsApi.list({
				search: debouncedSearch || undefined,
				page,
				limit,
				sortBy: "trackCount",
				sortOrder: "desc",
			}),
		staleTime: 30_000,
	});

	// タグ更新
	const updateMutation = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			tagsApi.update(id, { name }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			setEditingTagId(null);
			setEditingName("");
		},
	});

	// タグ削除
	const deleteMutation = useMutation({
		mutationFn: (id: string) => tagsApi.delete(id, true),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			setDeleteTargetId(null);
			setShowDeleteDialog(false);
			onSuccess?.();
		},
	});

	// タグマージ
	const mergeMutation = useMutation({
		mutationFn: ({
			sourceIds,
			targetId,
		}: {
			sourceIds: string[];
			targetId: string;
		}) => tagsApi.merge(sourceIds, targetId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			setSelectedTags(new Set());
			setMergeTarget(null);
			setShowMergeDialog(false);
			onSuccess?.();
		},
	});

	// 選択されたタグ（マージ用）
	const selectedTagsList = useMemo(() => {
		if (!tagsData?.data) return [];
		return tagsData.data.filter((t) => selectedTags.has(t.id));
	}, [tagsData?.data, selectedTags]);

	// マージターゲットの候補（選択中のタグのみ）
	const mergeTargetOptions = useMemo(() => {
		return selectedTagsList;
	}, [selectedTagsList]);

	// タグの選択トグル
	const toggleTagSelection = (tagId: string) => {
		const newSet = new Set(selectedTags);
		if (newSet.has(tagId)) {
			newSet.delete(tagId);
		} else {
			newSet.add(tagId);
		}
		setSelectedTags(newSet);
	};

	// 編集開始
	const startEditing = (tag: TagWithCount) => {
		setEditingTagId(tag.id);
		setEditingName(tag.name);
	};

	// 編集保存
	const saveEditing = () => {
		if (!editingTagId || !editingName.trim()) return;
		updateMutation.mutate({ id: editingTagId, name: editingName.trim() });
	};

	// 編集キャンセル
	const cancelEditing = () => {
		setEditingTagId(null);
		setEditingName("");
	};

	// 削除確認ダイアログを開く
	const openDeleteDialog = (tagId: string) => {
		setDeleteTargetId(tagId);
		setShowDeleteDialog(true);
	};

	// 削除実行
	const confirmDelete = () => {
		if (deleteTargetId) {
			deleteMutation.mutate(deleteTargetId);
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

	const totalPages = tagsData ? Math.ceil(tagsData.total / limit) : 1;
	const isPending =
		updateMutation.isPending ||
		deleteMutation.isPending ||
		mergeMutation.isPending;

	return (
		<>
			<DialogContent className="sm:max-w-[800px]">
				<DialogHeader>
					<DialogTitle>タグ管理</DialogTitle>
				</DialogHeader>
				<DialogBody className="flex flex-col gap-4 py-4">
					{/* 検索・アクションバー */}
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative flex-1">
							<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-base-content/50" />
							<Input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="タグを検索..."
								className="pl-9"
							/>
						</div>
						{selectedTags.size >= 2 && (
							<Button
								variant="outline"
								size="sm"
								onClick={openMergeDialog}
								disabled={isPending}
							>
								<Merge className="mr-1 h-4 w-4" />
								マージ ({selectedTags.size}件)
							</Button>
						)}
						{selectedTags.size > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedTags(new Set())}
								disabled={isPending}
							>
								選択解除
							</Button>
						)}
					</div>

					{/* タグ一覧 */}
					<div className="max-h-96 min-h-60 overflow-y-auto rounded-lg border border-base-300">
						{isFetching && !tagsData ? (
							<div className="flex items-center justify-center p-8">
								<span className="loading loading-spinner loading-md" />
							</div>
						) : tagsData?.data?.length === 0 ? (
							<div className="p-8 text-center text-base-content/50">
								{search ? "該当するタグがありません" : "タグがありません"}
							</div>
						) : (
							<table className="table-sm table">
								<thead className="sticky top-0 bg-base-100">
									<tr>
										<th className="w-10">
											<input
												type="checkbox"
												className="checkbox checkbox-sm"
												checked={
													tagsData?.data?.length === selectedTags.size &&
													selectedTags.size > 0
												}
												onChange={(e) => {
													if (e.target.checked) {
														setSelectedTags(
															new Set(tagsData?.data?.map((t) => t.id) || []),
														);
													} else {
														setSelectedTags(new Set());
													}
												}}
											/>
										</th>
										<th>タグ名</th>
										<th className="text-right">使用数</th>
										<th className="w-24">操作</th>
									</tr>
								</thead>
								<tbody>
									{tagsData?.data?.map((tag) => (
										<tr key={tag.id} className="hover:bg-base-200/50">
											<td>
												<input
													type="checkbox"
													className="checkbox checkbox-sm"
													checked={selectedTags.has(tag.id)}
													onChange={() => toggleTagSelection(tag.id)}
												/>
											</td>
											<td>
												{editingTagId === tag.id ? (
													<div className="flex items-center gap-2">
														<Input
															type="text"
															value={editingName}
															onChange={(e) => setEditingName(e.target.value)}
															className="input-sm max-w-48"
															autoFocus
															onKeyDown={(e) => {
																if (e.key === "Enter") saveEditing();
																if (e.key === "Escape") cancelEditing();
															}}
														/>
														<button
															type="button"
															onClick={saveEditing}
															className="btn btn-ghost btn-xs text-success"
															disabled={updateMutation.isPending}
														>
															<Check className="h-4 w-4" />
														</button>
														<button
															type="button"
															onClick={cancelEditing}
															className="btn btn-ghost btn-xs text-error"
														>
															<X className="h-4 w-4" />
														</button>
													</div>
												) : (
													<TagBadge name={tag.name} />
												)}
											</td>
											<td className="text-right">
												<span className="text-base-content/60">
													{tag.trackCount}件
												</span>
											</td>
											<td>
												<div className="flex items-center gap-1">
													<button
														type="button"
														onClick={() => startEditing(tag)}
														className="btn btn-ghost btn-xs"
														title="名前を編集"
														disabled={isPending}
													>
														<Edit2 className="h-4 w-4" />
													</button>
													<a
														href={`/admin/tags/${tag.id}`}
														className="btn btn-ghost btn-xs"
														title="詳細ページへ"
													>
														<ExternalLink className="h-4 w-4" />
													</a>
													{tag.trackCount === 0 && (
														<button
															type="button"
															onClick={() => openDeleteDialog(tag.id)}
															className="btn btn-ghost btn-xs text-error"
															title="削除"
															disabled={isPending}
														>
															<Trash2 className="h-4 w-4" />
														</button>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>

					{/* ページネーション */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1 || isFetching}
							>
								前へ
							</Button>
							<span className="text-sm">
								{page} / {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages || isFetching}
							>
								次へ
							</Button>
						</div>
					)}

					{/* 合計数 */}
					{tagsData && (
						<div className="text-center text-base-content/60 text-sm">
							合計 {tagsData.total} 件のタグ
						</div>
					)}
				</DialogBody>
				<DialogFooter>
					<Button variant="ghost" onClick={onClose}>
						閉じる
					</Button>
				</DialogFooter>
			</DialogContent>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
				title="タグを削除しますか？"
				description="このタグを削除します。使用されていないタグのみ削除可能です。"
				confirmLabel="削除"
				cancelLabel="キャンセル"
				variant="danger"
				onConfirm={confirmDelete}
				isLoading={deleteMutation.isPending}
			/>

			{/* マージダイアログ */}
			<Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>タグをマージ</DialogTitle>
					</DialogHeader>
					<DialogBody className="grid gap-4 py-4">
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
							<label className="label text-sm">
								マージ先（統合後のタグ名）
							</label>
							<select
								className="select select-bordered w-full"
								value={mergeTarget || ""}
								onChange={(e) => setMergeTarget(e.target.value || null)}
							>
								{mergeTargetOptions.map((tag) => (
									<option key={tag.id} value={tag.id}>
										{tag.name} ({tag.trackCount}件)
									</option>
								))}
							</select>
						</div>

						<div className="rounded-lg bg-warning/10 p-3 text-sm text-warning-content">
							マージすると、マージ元のタグは削除され、紐付けられていたトラックはすべてマージ先のタグに移動します。この操作は取り消せません。
						</div>
					</DialogBody>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setShowMergeDialog(false)}
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
		</>
	);
}

/**
 * タグ管理ダイアログ
 * open状態が変わると内部コンテンツがリマウントされ、状態がリセットされる
 */
export function TagManagementDialog({
	open,
	onOpenChange,
	onSuccess,
}: TagManagementDialogProps) {
	// open が false のときはダイアログを非表示
	if (!open) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<TagManagementDialogContent
				key="tag-management-content"
				onClose={() => onOpenChange(false)}
				onSuccess={onSuccess}
			/>
		</Dialog>
	);
}
