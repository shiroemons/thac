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
import { Textarea } from "@/components/ui/textarea";
import { getAliasType } from "@/functions/get-alias-type";
import { type AliasType, aliasTypesApi } from "@/lib/api-client";
import { createMasterDetailHead } from "@/lib/head";

export const Route = createFileRoute("/admin/_admin/master/alias-types_/$code")(
	{
		loader: ({ params }) => getAliasType(params.code),
		head: ({ loaderData }) =>
			createMasterDetailHead("名義種別", loaderData?.label),
		component: AliasTypeDetailPage,
	},
);

function AliasTypeDetailPage() {
	const aliasType = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editForm, setEditForm] = useState<Partial<AliasType>>({});
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleEdit = () => {
		if (!aliasType) return;
		setEditForm({
			label: aliasType.label,
			description: aliasType.description,
		});
		setError(null);
		setIsEditDialogOpen(true);
	};

	const handleUpdate = async () => {
		if (!aliasType) return;
		setError(null);
		try {
			await aliasTypesApi.update(aliasType.code, {
				label: editForm.label,
				description: editForm.description,
			});
			setIsEditDialogOpen(false);
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : "更新に失敗しました");
		}
	};

	const handleDelete = async () => {
		if (!aliasType) return;
		if (
			!confirm(
				`「${aliasType.label}」を削除しますか？\n\n※ 使用中の場合は削除できません。`,
			)
		)
			return;

		setIsDeleting(true);
		setError(null);
		try {
			await aliasTypesApi.delete(aliasType.code);
			queryClient.invalidateQueries({ queryKey: ["aliasTypes"] });
			navigate({ to: "/admin/master/alias-types" });
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
	if (!aliasType) {
		return (
			<div className="container mx-auto p-6">
				<div className="alert alert-error">
					<span>名義種別が見つかりません</span>
				</div>
				<Link to="/admin/master/alias-types" className="btn btn-ghost mt-4">
					<ArrowLeft className="mr-2 h-4 w-4" />
					名義種別一覧に戻る
				</Link>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-6 py-6">
			<AdminPageHeader
				title="名義種別詳細"
				breadcrumbs={[
					{ label: "マスタ管理" },
					{ label: "名義種別", href: "/admin/master/alias-types" },
					{ label: aliasType.label },
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
							<p className="font-mono">{aliasType.code}</p>
						</div>
						<div>
							<Label className="text-base-content/60">ラベル</Label>
							<p className="font-medium">{aliasType.label}</p>
						</div>
						<div>
							<Label className="text-base-content/60">表示順序</Label>
							<p>{aliasType.sortOrder ?? "-"}</p>
						</div>
						<div className="md:col-span-2">
							<Label className="text-base-content/60">説明</Label>
							<p>{aliasType.description || "-"}</p>
						</div>
					</div>
				</div>
			</div>

			{/* 編集ダイアログ */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>名義種別の編集</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label>コード</Label>
							<Input value={aliasType.code} disabled />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-label">ラベル</Label>
							<Input
								id="edit-label"
								value={editForm.label || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, label: e.target.value })
								}
								placeholder="例: メイン名義"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="edit-description">説明</Label>
							<Textarea
								id="edit-description"
								value={editForm.description || ""}
								onChange={(e) =>
									setEditForm({ ...editForm, description: e.target.value })
								}
								placeholder="例: アーティストのメインとなる活動名義"
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
