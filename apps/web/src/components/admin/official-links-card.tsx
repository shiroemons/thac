import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDown,
	ArrowUp,
	ExternalLink,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type OfficialSongLink,
	type OfficialWorkLink,
	officialSongLinksApi,
	officialWorkLinksApi,
} from "@/lib/api-client";
import { createId } from "@/lib/utils";
import { OfficialLinkDialog } from "./official-link-dialog";

interface OfficialLinksCardProps {
	entityType: "work" | "song";
	entityId: string;
}

export function OfficialLinksCard({
	entityType,
	entityId,
}: OfficialLinksCardProps) {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingLink, setEditingLink] = useState<
		OfficialWorkLink | OfficialSongLink | null
	>(null);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);

	const api =
		entityType === "work" ? officialWorkLinksApi : officialSongLinksApi;
	const queryKey =
		entityType === "work"
			? ["officialWorkLinks", entityId]
			: ["officialSongLinks", entityId];

	// リンク一覧取得
	const { data: links = [], isLoading } = useQuery<
		(OfficialWorkLink | OfficialSongLink)[]
	>({
		queryKey,
		queryFn: () => api.list(entityId),
		staleTime: 30_000,
	});

	// 並べ替えミューテーション
	const reorderMutation = useMutation<
		OfficialWorkLink | OfficialSongLink,
		Error,
		{ linkId: string; sortOrder: number }
	>({
		mutationFn: ({ linkId, sortOrder }) =>
			api.reorder(entityId, linkId, sortOrder),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	// 削除ミューテーション
	const deleteMutation = useMutation({
		mutationFn: (linkId: string) => api.delete(entityId, linkId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	// リンク作成
	const handleCreate = async (data: { platformCode: string; url: string }) => {
		const id =
			entityType === "work"
				? createId.officialWorkLink()
				: createId.officialSongLink();
		await api.create(entityId, {
			id,
			...data,
			sortOrder: links.length,
		});
		queryClient.invalidateQueries({ queryKey });
	};

	// リンク更新
	const handleUpdate = async (data: { platformCode: string; url: string }) => {
		if (!editingLink) return;
		if (entityType === "work") {
			await officialWorkLinksApi.update(entityId, editingLink.id, data);
		} else {
			await officialSongLinksApi.update(entityId, editingLink.id, data);
		}
		queryClient.invalidateQueries({ queryKey });
	};

	// リンク削除
	const handleDelete = async (linkId: string) => {
		if (!confirm("このリンクを削除しますか？")) return;
		setIsDeleting(linkId);
		try {
			await deleteMutation.mutateAsync(linkId);
		} finally {
			setIsDeleting(null);
		}
	};

	// 並べ替え（上へ）
	const handleMoveUp = async (index: number) => {
		if (index <= 0) return;
		const link = links[index];
		const prevLink = links[index - 1];
		if (!link || !prevLink) return;

		await Promise.all([
			reorderMutation.mutateAsync({
				linkId: link.id,
				sortOrder: prevLink.sortOrder,
			}),
			reorderMutation.mutateAsync({
				linkId: prevLink.id,
				sortOrder: link.sortOrder,
			}),
		]);
	};

	// 並べ替え（下へ）
	const handleMoveDown = async (index: number) => {
		if (index >= links.length - 1) return;
		const link = links[index];
		const nextLink = links[index + 1];
		if (!link || !nextLink) return;

		await Promise.all([
			reorderMutation.mutateAsync({
				linkId: link.id,
				sortOrder: nextLink.sortOrder,
			}),
			reorderMutation.mutateAsync({
				linkId: nextLink.id,
				sortOrder: link.sortOrder,
			}),
		]);
	};

	// ダイアログを開く（新規作成）
	const openCreateDialog = () => {
		setEditingLink(null);
		setDialogOpen(true);
	};

	// ダイアログを開く（編集）
	const openEditDialog = (link: OfficialWorkLink | OfficialSongLink) => {
		setEditingLink(link);
		setDialogOpen(true);
	};

	const sortedLinks = [...links].sort((a, b) => a.sortOrder - b.sortOrder);

	if (isLoading) {
		return (
			<Card className="card-bordered">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h3 className="flex items-center gap-2 font-semibold text-lg">
						<ExternalLink className="h-5 w-5" />
						外部リンク
					</h3>
				</div>
				<div className="p-4">
					<div className="animate-pulse space-y-2">
						<div className="h-8 rounded bg-base-300" />
						<div className="h-8 rounded bg-base-300" />
					</div>
				</div>
			</Card>
		);
	}

	return (
		<>
			<Card className="card-bordered">
				<div className="flex items-center justify-between border-base-300 border-b p-4">
					<h3 className="flex items-center gap-2 font-semibold text-lg">
						<ExternalLink className="h-5 w-5" />
						外部リンク
					</h3>
					<Button variant="outline" size="sm" onClick={openCreateDialog}>
						<Plus className="mr-1 h-4 w-4" />
						追加
					</Button>
				</div>

				{sortedLinks.length === 0 ? (
					<div className="py-8 text-center text-base-content/50">
						外部リンクが登録されていません
					</div>
				) : (
					<div className="overflow-x-auto">
						<Table zebra>
							<TableHeader>
								<TableRow className="hover:bg-transparent">
									<TableHead className="w-[60px]">順序</TableHead>
									<TableHead>プラットフォーム</TableHead>
									<TableHead>URL</TableHead>
									<TableHead className="w-[140px]">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sortedLinks.map((link, index) => (
									<TableRow key={link.id}>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="xs"
													disabled={index === 0 || reorderMutation.isPending}
													onClick={() => handleMoveUp(index)}
													title="上へ移動"
												>
													<ArrowUp className="h-3 w-3" />
												</Button>
												<Button
													variant="ghost"
													size="xs"
													disabled={
														index === sortedLinks.length - 1 ||
														reorderMutation.isPending
													}
													onClick={() => handleMoveDown(index)}
													title="下へ移動"
												>
													<ArrowDown className="h-3 w-3" />
												</Button>
											</div>
										</TableCell>
										<TableCell className="font-medium">
											{link.platformName || link.platformCode}
										</TableCell>
										<TableCell>
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-primary hover:underline"
											>
												<span className="max-w-[300px] truncate">
													{link.url}
												</span>
												<ExternalLink className="h-3 w-3 flex-shrink-0" />
											</a>
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												<Button
													variant="ghost"
													size="xs"
													onClick={() => openEditDialog(link)}
													title="編集"
												>
													<Pencil className="h-3 w-3" />
												</Button>
												<Button
													variant="ghost"
													size="xs"
													onClick={() => handleDelete(link.id)}
													disabled={isDeleting === link.id}
													title="削除"
													className="text-error"
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</Card>

			<OfficialLinkDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				mode={editingLink ? "edit" : "create"}
				entityType={entityType}
				link={editingLink ?? undefined}
				onSubmit={editingLink ? handleUpdate : handleCreate}
			/>
		</>
	);
}
