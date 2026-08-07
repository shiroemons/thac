import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
	ArrowLeft,
	Check,
	Hash,
	Home,
	Lock,
	Pencil,
	Trash2,
	Unlock,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DataTablePagination } from "@/components/admin/data-table-pagination";
import { DetailPageSkeleton } from "@/components/admin/detail-page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { tagsApi, trackTagsApi } from "@/lib/api-client";
import { createTagDetailHead } from "@/lib/head";
import { getErrorMessage } from "@/lib/utils";

export const Route = createFileRoute("/admin/_admin/tags_/$id")({
	head: () => createTagDetailHead(),
	component: TagDetailPage,
});

function TagDetailPage() {
	const { id } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	// ページネーション状態
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);

	// 編集モード
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const editInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing) {
			editInputRef.current?.focus();
		}
	}, [isEditing]);

	// 削除確認ダイアログ
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	// タグ詳細取得
	const {
		data: tag,
		isPending: isTagPending,
		error: tagError,
	} = useQuery({
		queryKey: ["tags", id],
		queryFn: () => tagsApi.get(id),
		staleTime: 30_000,
	});

	// 紐づくトラック取得
	const {
		data: tracksData,
		isPending: isTracksPending,
		isFetching: isTracksFetching,
	} = useQuery({
		queryKey: ["tags", id, "tracks", page, pageSize],
		queryFn: () => tagsApi.getTracks(id, { page, limit: pageSize }),
		staleTime: 30_000,
		enabled: !!tag,
	});

	// タグ更新
	const updateMutation = useMutation({
		mutationFn: (data: { name: string }) => tagsApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags"] });
			setIsEditing(false);
		},
	});

	// タグ削除
	const deleteMutation = useMutation({
		mutationFn: () => tagsApi.delete(id, true),
		onSuccess: () => {
			navigate({ to: "/admin" });
		},
	});

	// ロック/アンロック
	const lockMutation = useMutation({
		mutationFn: (trackId: string) => trackTagsApi.lock(trackId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags", id] });
			queryClient.invalidateQueries({ queryKey: ["tags", id, "tracks"] });
		},
	});

	const unlockMutation = useMutation({
		mutationFn: (trackId: string) => trackTagsApi.unlock(trackId, id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tags", id] });
			queryClient.invalidateQueries({ queryKey: ["tags", id, "tracks"] });
		},
	});

	// 編集開始
	const handleStartEdit = () => {
		if (tag) {
			setEditName(tag.name);
			setIsEditing(true);
		}
	};

	// 編集キャンセル
	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditName("");
		updateMutation.reset();
	};

	// 編集保存
	const handleSaveEdit = () => {
		if (editName.trim() && editName !== tag?.name) {
			updateMutation.mutate({ name: editName.trim() });
		} else {
			setIsEditing(false);
		}
	};

	// ページ変更
	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	const handlePageSizeChange = (newPageSize: number) => {
		setPageSize(newPageSize);
		setPage(1);
	};

	// ローディング
	if (isTagPending && !tag) {
		return <DetailPageSkeleton cardCount={2} fieldsPerCard={4} />;
	}

	// エラー
	if (tagError || !tag) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>
						{tagError instanceof Error
							? tagError.message
							: "タグが見つかりません"}
					</span>
				</div>
				<Link to="/admin" className="btn btn-ghost mt-4 gap-1">
					<ArrowLeft className="h-4 w-4" />
					管理画面に戻る
				</Link>
			</div>
		);
	}

	const tracks = tracksData?.tracks ?? [];
	const total = tracksData?.pagination.totalCount ?? 0;

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
					<li>タグ詳細</li>
					<li>
						<Hash className="mr-1 inline h-3 w-3" />
						{tag.name}
					</li>
				</ul>
			</nav>

			{/* ヘッダー */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link to="/admin" className="btn btn-ghost btn-sm">
						<ArrowLeft className="h-4 w-4" />
					</Link>
					<div className="flex items-center gap-2">
						<Hash className="h-5 w-5 text-base-content/70" />
						<h1 className="font-bold text-2xl">{tag.name}</h1>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{!isEditing && (
						<>
							<Button
								variant="outline"
								size="sm"
								className="gap-1"
								onClick={handleStartEdit}
							>
								<Pencil className="h-4 w-4" />
								編集
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="gap-1 text-error hover:bg-error hover:text-error-content"
								onClick={() => setIsDeleteDialogOpen(true)}
							>
								<Trash2 className="h-4 w-4" />
								削除
							</Button>
						</>
					)}
				</div>
			</div>

			{/* 基本情報カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					{updateMutation.error && (
						<div className="rounded-lg bg-error p-4 text-error-content text-sm">
							{getErrorMessage(updateMutation.error)}
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/70">ID</Label>
							<p className="font-mono text-sm">{tag.id}</p>
						</div>
						<div>
							<Label className="text-base-content/70">タグ名</Label>
							{isEditing ? (
								<div className="mt-1 flex items-center gap-2">
									<Input
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										className="max-w-xs"
										ref={editInputRef}
									/>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleSaveEdit}
										disabled={updateMutation.isPending}
									>
										<Check className="h-4 w-4 text-success" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={handleCancelEdit}
										disabled={updateMutation.isPending}
									>
										<X className="h-4 w-4 text-error" />
									</Button>
								</div>
							) : (
								<p className="flex items-center gap-1 font-medium">
									<Hash className="h-4 w-4 text-base-content/50" />
									{tag.name}
								</p>
							)}
						</div>
						<div>
							<Label className="text-base-content/70">使用数</Label>
							<p className="font-medium">
								{tag.usageCount} 件
								{tag.lockedCount > 0 && (
									<span className="ml-2 text-base-content/50 text-sm">
										(うちロック: {tag.lockedCount} 件)
									</span>
								)}
							</p>
						</div>
						<div>
							<Label className="text-base-content/70">作成日時</Label>
							<p className="text-base-content/70">
								{format(new Date(tag.createdAt), "yyyy/MM/dd HH:mm:ss", {
									locale: ja,
								})}
							</p>
						</div>
						<div>
							<Label className="text-base-content/70">更新日時</Label>
							<p className="text-base-content/70">
								{format(new Date(tag.updatedAt), "yyyy/MM/dd HH:mm:ss", {
									locale: ja,
								})}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* 紐づくトラック一覧カード */}
			<div className="card border border-base-300 bg-base-100">
				<div className="card-body relative">
					<div className="flex items-center justify-between">
						<h2 className="card-title">
							紐づくトラック一覧
							{total > 0 && <Badge variant="secondary">{total} 件</Badge>}
						</h2>
					</div>

					{isTracksPending && !tracksData ? (
						<div className="flex items-center justify-center py-8">
							<span className="loading loading-spinner loading-md" />
						</div>
					) : tracks.length === 0 ? (
						<p className="text-base-content/70">
							このタグが紐づいているトラックはありません
						</p>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table zebra>
									<TableHeader>
										<TableRow className="hover:bg-transparent">
											<TableHead>トラック名</TableHead>
											<TableHead>リリース</TableHead>
											<TableHead className="w-[80px] text-center">
												ロック
											</TableHead>
											<TableHead className="w-[100px]">操作</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tracks.map((track) => (
											<TableRow key={track.id}>
												<TableCell>
													<Link
														to="/admin/tracks/$id"
														params={{ id: track.id }}
														className="text-primary hover:underline"
													>
														{track.name}
													</Link>
												</TableCell>
												<TableCell>
													{track.releaseId && track.releaseName ? (
														<Link
															to="/admin/releases/$id"
															params={{ id: track.releaseId }}
															className="text-primary hover:underline"
														>
															{track.releaseName}
														</Link>
													) : (
														<span className="text-base-content/50">-</span>
													)}
												</TableCell>
												<TableCell className="text-center">
													{track.isLocked ? (
														<Lock className="mx-auto h-4 w-4 text-warning" />
													) : (
														<span className="text-base-content/30">-</span>
													)}
												</TableCell>
												<TableCell>
													{track.isLocked ? (
														<Button
															variant="outline"
															size="sm"
															className="gap-1"
															onClick={() => unlockMutation.mutate(track.id)}
															disabled={unlockMutation.isPending}
														>
															<Unlock className="h-3 w-3" />
															解除
														</Button>
													) : (
														<Button
															variant="outline"
															size="sm"
															className="gap-1"
															onClick={() => lockMutation.mutate(track.id)}
															disabled={lockMutation.isPending}
														>
															<Lock className="h-3 w-3" />
															ロック
														</Button>
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>

							{/* ページネーション */}
							<div className="border-base-300 border-t pt-4">
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

					{isTracksFetching && tracksData && (
						<div className="absolute inset-0 flex items-center justify-center bg-base-100/50">
							<span className="loading loading-spinner loading-md" />
						</div>
					)}
				</div>
			</div>

			{/* 削除確認ダイアログ */}
			<ConfirmDialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					setIsDeleteDialogOpen(open);
					if (!open) deleteMutation.reset();
				}}
				title="タグの削除"
				description={
					<div>
						<p>「#{tag.name}」を削除しますか？</p>
						{tag.usageCount > 0 && (
							<p className="mt-2 text-sm text-warning">
								※このタグは {tag.usageCount} 件のトラックで使用されています。
								削除するとすべての紐付けが解除されます。
							</p>
						)}
						<p className="mt-2 text-error text-sm">
							※この操作は取り消せません。
						</p>
						{deleteMutation.error && (
							<p className="mt-2 text-error text-sm">
								{getErrorMessage(deleteMutation.error)}
							</p>
						)}
					</div>
				}
				confirmLabel="削除する"
				variant="danger"
				onConfirm={() => deleteMutation.mutate()}
				isLoading={deleteMutation.isPending}
			/>
		</div>
	);
}
