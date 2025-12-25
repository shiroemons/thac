import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
import { getPlatform } from "@/functions/get-platform";
import { type Platform, platformsApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/platforms_/$code")({
	loader: ({ params }) => getPlatform(params.code),
	head: ({ loaderData }) =>
		createMasterDetailHead("プラットフォーム", loaderData?.name),
	component: PlatformDetailPage,
});

function PlatformDetailPage() {
	const platform = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<Partial<Platform>>({});
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEdit = () => {
		if (!platform) return;
		setEditForm({
			name: platform.name,
			category: platform.category,
			urlPattern: platform.urlPattern,
		});
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async () => {
		if (!platform) return;
		setError(null);
		try {
			await platformsApi.update(platform.code, {
				name: editForm.name,
				category: editForm.category,
				urlPattern: editForm.urlPattern,
			});
			setIsEditDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
			// ページをリロードして最新データを表示
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async () => {
		if (!platform) return;
		if (
			!confirm(
				`「${platform.name}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await platformsApi.delete(platform.code);
			queryClient.invalidateQueries({ queryKey: ["platforms"] });
			navigate({ to: "/admin/master/platforms" });
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "削除に失敗しました。使用中の可能性があります。",
			);
			setIsDeleting(false);
		}
	};

	// エラー・未存在
	if (!platform) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>プラットフォームが見つかりません</span>
				</div>
				<Link to="/admin/master/platforms" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					プラットフォーム一覧に戻る
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="プラットフォーム詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{ label: "プラットフォーム", href: "/admin/master/platforms" },
					{ label: platform.name },
				]}
				actions={
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleEdit}>
							<Pencil className="mr-2 h-4 w-4" />
							編集
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="text-error hover:text-error"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							{isDeleting ? "削除中..." : "削除"}
						</Button>
					</div>
				}
			/>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			{/* 基本情報カード */}
			<div className="card bg-base-100 shadow-xl">
				<div className="card-body">
					<h2 className="card-title">基本情報</h2>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<Label className="text-base-content/60">コード</Label>
							<p className="font-mono">{platform.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">名前</Label>
							<p className="font-medium">{platform.name}</p>
						</div>
						<div>
							<Label className="text-base-content/60">カテゴリ</Label>
							<p>{platform.category || "-"}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{platform.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">URLパターン</Label>
							<p className="font-mono text-sm">{platform.urlPattern || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>プラットフォームの編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={platform.code} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-name">名前</Label>
							<Input
								id="edit-name"
								value={editForm.name || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, name: e.target.value })
								}
								placeholder="例: Spotify"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-category">カテゴリ</Label>
							<Input
								id="edit-category"
								value={editForm.category || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, category: e.target.value })
								}
								placeholder="例: streaming"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-urlPattern">URLパターン</Label>
							<Input
								id="edit-urlPattern"
								value={editForm.urlPattern || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, urlPattern: e.target.value })
								}
								placeholder="例: ^https?://open\.spotify\.com/"
							/>
						</div>
					</div>
					{error && <div className="mb-4 text-error text-sm">{error}</div>}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							キャンセル
						</Button>
						<Button onClick={handleUpdate}>保存</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
